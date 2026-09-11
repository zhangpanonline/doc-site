import {createHash} from 'node:crypto';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {getSupabaseAdmin} from '../lib/supabase-admin';

/** 进程内缓存的候选模型列表（模型改名时自动适配，不必改代码） */
let cachedModels: string[] | null = null;

/** gemini-X.Y-flash → [X, Y]，用于按版本排序 */
function versionOf(name: string): [number, number] {
  const m = /gemini-(\d+)(?:\.(\d+))?/.exec(name);
  return m ? [Number(m[1]), Number(m[2] ?? 0)] : [0, 0];
}

/**
 * 解析可用模型候选（优先级降序，最多 3 个）：版本最高的非 lite flash 优先，
 * 其余 flash 依次兜底——高峰时段单一模型 503「需求过高」时轮换下一个。
 * 解析失败时用内置兜底名单（旧版模型对「新用户」可能 404，但先试再说）。
 */
async function resolveModelCandidates(key: string): Promise<string[]> {
  if (cachedModels) {
    return cachedModels;
  }
  const fallback = ['gemini-2.5-flash', 'gemini-flash-latest'];
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) {
      const bodySnippet = (await r.text().catch(() => '')).slice(0, 200);
      console.error('[explain] models list http', r.status, bodySnippet);
      cachedModels = fallback;
      return fallback;
    }
    const data = (await r.json()) as {models?: {name?: string}[]};
    const names = (data.models ?? [])
      .map(m => m.name ?? '')
      .filter(n => n.startsWith('models/'))
      .map(n => n.replace(/^models\//, ''));
    const ranked = names
      .filter(n => n.includes('flash') && !n.includes('lite') && !n.endsWith('-latest'))
      .sort((a, b) => {
        const va = versionOf(a);
        const vb = versionOf(b);
        return vb[0] - va[0] || vb[1] - va[1];
      })
      .concat(names.filter(n => n.includes('flash') && n.endsWith('-latest')))
      .slice(0, 3);
    cachedModels = ranked.length > 0 ? ranked : fallback;
    return cachedModels;
  } catch (err) {
    console.error('[explain] models list failed:', err);
    cachedModels = fallback;
    return fallback;
  }
}

/**
 * AI 代码解释：POST /api/explain {code, lang}
 * 按「语言 + 代码」哈希缓存到 Supabase code_explanations——课程代码块是静态内容，
 * 同一段代码只消耗一次 AI 额度，后续点击直接命中缓存。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({error: 'Method Not Allowed'});
  }

  let body: Record<string, unknown> = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  } catch {
    // 解析失败按空请求处理
  }
  const code = String(body.code ?? '').slice(0, 8000);
  const lang = String(body.lang ?? 'text').slice(0, 20);
  // 课程上下文（当前小节/课程路径），让 AI 围绕本节主题讲解；参与缓存键，
  // 同一段代码在不同小节出现时解释不同
  const context = String(body.context ?? '').slice(0, 200);
  if (!code.trim()) {
    return res.status(400).json({error: 'empty code'});
  }

  const hash = createHash('md5').update(`${lang}\n${code}\n${context}`).digest('hex');
  const admin = getSupabaseAdmin();

  // 缓存命中（30 天 TTL 内）：不再调用 AI；过期后下次点击自动重新生成
  const ttl = 30 * 86_400_000;
  try {
    const {data: cached} = await admin
      .from('code_explanations')
      .select('explanation')
      .eq('code_hash', hash)
      .gte('created_at', new Date(Date.now() - ttl).toISOString())
      .maybeSingle();
    if (cached?.explanation) {
      return res.status(200).json({explanation: cached.explanation, cached: true});
    }
  } catch {
    // 缓存表不存在（008 未执行）时走直查路径
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({error: 'GEMINI_API_KEY not set'});
  }

  const models = await resolveModelCandidates(key);
  if (models.length === 0) {
    return res.status(502).json({error: 'model not resolved'});
  }

  const courseLine = context
    ? `学生正在学习《AI 大全栈》课程的「${context}」这一节。请围绕本节正在讲的教学主题，重点讲清楚这段代码在本课知识点中的角色。`
    : '';
  const prompt = `你是一名编程老师。${courseLine}请用通俗易懂的中文向零基础学员解释下面这段${lang}代码，要求：
1. 先用一句话概括这段代码做什么
2. 结合${context ? '本节主题，' : ''}按行或按块解释关键点
3. 最后指出一个最容易误解的地方
不要使用 markdown 语法，纯文本输出，分段用空行，总长度 300 字以内。

代码：
${code}`;

  // 多候选轮换：高峰时段单一模型 503「需求过高」，换下一个模型重试。
  // 时间预算：模型解析(≤8s) + 缓存查询 + 3×(AI 15s + 退避 1.5s) ≈ 58s，
  // 必须留余量给函数上限（vercel.json maxDuration 60s），否则整体 504。
  let lastDetail = '';
  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            contents: [{parts: [{text: prompt}]}],
            // 输出上限 300 字 ≈ 800 token：防止模型失控拖到超时
            generationConfig: {maxOutputTokens: 800},
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!r.ok) {
        const bodySnippet = (await r.text().catch(() => '')).slice(0, 300);
        lastDetail = `[${model}] ${r.status} ${bodySnippet}`;
        if (r.status === 503 || r.status === 429) {
          console.error('[explain] gemini http', r.status, model, 'try next');
          await new Promise(res => setTimeout(res, 1500));
          continue; // 高峰限流：换下一个候选模型
        }
        console.error('[explain] gemini http', r.status, model, bodySnippet);
        return res.status(502).json({error: 'upstream failed', detail: lastDetail});
      }
      const data = (await r.json()) as {
        candidates?: {content?: {parts?: {text?: string}[]}}[];
      };
      const text = (data?.candidates?.[0]?.content?.parts ?? [])
        .map(p => p.text ?? '')
        .join('')
        .trim();
      if (!text) {
        lastDetail = `[${model}] empty upstream`;
        continue; // 空响应：换下一个候选
      }
      try {
        await admin.from('code_explanations').upsert({
          code_hash: hash,
          lang,
          code_preview: code.slice(0, 300),
          explanation: text,
          model,
          created_at: new Date().toISOString(), // 刷新 TTL 起点
        });
      } catch {
        // 缓存写入失败不影响本次返回
      }
      return res.status(200).json({explanation: text, cached: false});
    } catch (err) {
      lastDetail = `[${model}] ${err instanceof Error ? err.message : String(err)}`;
      console.error('[explain] attempt failed:', model, err);
      // 超时/网络错误：换下一个候选模型
    }
  }
  console.error('[explain] all models failed:', lastDetail);
  return res.status(502).json({error: 'upstream overloaded', detail: lastDetail.slice(0, 300)});
}
