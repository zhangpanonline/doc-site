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
  // 页面完整地址（含锚点）：锚点 slug 即小节名，AI 据此刻画教学主题
  const url = String(body.url ?? '').slice(0, 500);
  if (!code.trim()) {
    return res.status(400).json({error: 'empty code'});
  }

  const hash = createHash('md5').update(`${lang}\n${code}\n${context}\n${url}`).digest('hex');
  const admin = getSupabaseAdmin();

  // 缓存命中（10 天 TTL 内）：不再调用 AI；过期后下次点击自动重新生成
  const ttl = 10 * 86_400_000;
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

  const glmKey = process.env.ZHIPU_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!glmKey && !geminiKey) {
    return res.status(500).json({error: 'no AI keys configured'});
  }

  const courseLine = context
    ? `学生正在学习《AI 大全栈》课程的「${context}」这一节。请围绕本节正在讲的教学主题，重点讲清楚这段代码在本课知识点中的角色。`
    : '';
  const urlLine = url ? `\n学生当前所在的页面地址（含锚点，锚点即本页小节名）：${url}\n` : '';
  const prompt = `你是一名编程老师。${courseLine}${urlLine}请用通俗易懂的中文向零基础学员解释下面这段${lang}代码，要求：
1. 先用一句话概括这段代码做什么
2. 结合${context ? '本节主题与页面地址中的小节名，' : ''}按行或按块解释关键点
3. 最后指出一个最容易误解的地方
不要使用 markdown 语法，纯文本输出，分段用空行，总长度 300 字以内。

代码：
${code}`;

  // 时间预算（函数上限 60s）：GLM 2×10s + 退避 1.5s + Gemini 2×10s + 退避 1.5s
  // + 模型解析(≤8s) + 缓存查询 ≈ 53s。每步都必须留余量，否则整体 504。
  let lastDetail = '';
  let explanation: string | null = null;
  let modelUsed = '';

  // 主路：智谱 GLM-4-Flash（免费、快、中文原生）——配置了 key 即优先
  if (glmKey) {
    for (let attempt = 0; attempt < 2 && !explanation; attempt++) {
      try {
        const r = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {'Content-Type': 'application/json', Authorization: `Bearer ${glmKey}`},
          body: JSON.stringify({
            model: 'glm-4-flash',
            messages: [{role: 'user', content: prompt}],
            max_tokens: 800,
            temperature: 0.6,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!r.ok) {
          lastDetail = `[glm-4-flash] ${r.status} ${(await r.text().catch(() => '')).slice(0, 200)}`;
          console.error('[explain] glm http', r.status, attempt);
        } else {
          const data = (await r.json()) as {choices?: {message?: {content?: string}}[]};
          explanation = data?.choices?.[0]?.message?.content?.trim() ?? null;
          if (explanation) modelUsed = 'glm-4-flash';
        }
      } catch (err) {
        lastDetail = `[glm-4-flash] ${err instanceof Error ? err.message : String(err)}`;
        console.error('[explain] glm attempt failed:', attempt, err);
      }
      if (!explanation && attempt === 0) {
        await new Promise(res => setTimeout(res, 1500));
      }
    }
    if (!explanation) {
      console.error('[explain] glm failed, fallback to gemini:', lastDetail);
    }
  }

  // 兜底：Gemini 多候选轮换（未配 GLM key 时为主路，候选最多 3 个）
  if (!explanation && geminiKey) {
    const models = await resolveModelCandidates(geminiKey);
    const candidates = models.slice(0, glmKey ? 2 : 3);
    for (const model of candidates) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              contents: [{parts: [{text: prompt}]}],
              // 输出上限 300 字 ≈ 800 token：防止模型失控拖到超时
              generationConfig: {maxOutputTokens: 800},
            }),
            signal: AbortSignal.timeout(10_000),
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
        explanation = text;
        modelUsed = model;
        break;
      } catch (err) {
        lastDetail = `[${model}] ${err instanceof Error ? err.message : String(err)}`;
        console.error('[explain] gemini attempt failed:', model, err);
        // 超时/网络错误：换下一个候选模型
      }
    }
  }

  if (!explanation) {
    console.error('[explain] all providers failed:', lastDetail);
    return res.status(502).json({error: 'upstream overloaded', detail: lastDetail.slice(0, 300)});
  }

  try {
    await admin.from('code_explanations').upsert({
      code_hash: hash,
      lang,
      code_preview: code.slice(0, 300),
      explanation,
      model: modelUsed,
      created_at: new Date().toISOString(), // 刷新 TTL 起点
    });
  } catch {
    // 缓存写入失败不影响本次返回
  }
  return res.status(200).json({explanation, cached: false});
}
