import {createHash} from 'node:crypto';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {getSupabaseAdmin} from '../lib/supabase-admin';

/** 进程内缓存的已解析模型名（模型改名时自动适配，不必改代码） */
let cachedModel: string | null = null;

/** gemini-X.Y-flash → [X, Y]，用于按版本选最新 */
function versionOf(name: string): [number, number] {
  const m = /gemini-(\d+)(?:\.(\d+))?/.exec(name);
  return m ? [Number(m[1]), Number(m[2] ?? 0)] : [0, 0];
}

/**
 * 运行时解析可用模型：优先版本号最高的非 lite flash 模型
 * （旧版模型对「新用户」会 404 下线，但可能仍在列表里，不能写死名字），
 * 退而求其次任意 flash、任意 gemini。
 */
async function resolveModel(key: string): Promise<string | null> {
  if (cachedModel) {
    return cachedModel;
  }
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      const bodySnippet = (await r.text().catch(() => '')).slice(0, 200);
      console.error('[explain] models list http', r.status, bodySnippet);
      return null;
    }
    const data = (await r.json()) as {models?: {name?: string}[]};
    const names = (data.models ?? [])
      .map(m => m.name ?? '')
      .filter(n => n.startsWith('models/'));
    const pick =
      names
        .filter(n => n.includes('flash') && !n.includes('lite') && !n.endsWith('-latest'))
        .sort((a, b) => {
          const va = versionOf(a);
          const vb = versionOf(b);
          return vb[0] - va[0] || vb[1] - va[1];
        })[0] ??
      names.find(n => n.includes('flash')) ??
      names[0];
    cachedModel = pick ? pick.replace(/^models\//, '') : null;
    return cachedModel;
  } catch (err) {
    console.error('[explain] models list failed:', err);
    return null;
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
  if (!code.trim()) {
    return res.status(400).json({error: 'empty code'});
  }

  const hash = createHash('md5').update(`${lang}\n${code}`).digest('hex');
  const admin = getSupabaseAdmin();

  // 缓存命中：不再调用 AI
  try {
    const {data: cached} = await admin
      .from('code_explanations')
      .select('explanation')
      .eq('code_hash', hash)
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

  const model = await resolveModel(key);
  if (!model) {
    return res.status(502).json({error: 'model not resolved'});
  }

  const prompt = `你是一名编程老师。请用通俗易懂的中文向零基础学员解释下面这段${lang}代码，要求：
1. 先用一句话概括这段代码做什么
2. 再按行或按块解释关键点
3. 最后指出一个最容易误解的地方
不要使用 markdown 语法，纯文本输出，分段用空行，总长度 300 字以内。

代码：
${code}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({contents: [{parts: [{text: prompt}]}]}),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!r.ok) {
      const bodySnippet = (await r.text().catch(() => '')).slice(0, 200);
      console.error('[explain] gemini http', r.status, bodySnippet);
      return res.status(502).json({error: 'upstream failed'});
    }
    const data = (await r.json()) as {
      candidates?: {content?: {parts?: {text?: string}[]}}[];
    };
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map(p => p.text ?? '')
      .join('')
      .trim();
    if (!text) {
      return res.status(502).json({error: 'empty upstream'});
    }
    try {
      await admin.from('code_explanations').upsert({
        code_hash: hash,
        lang,
        code_preview: code.slice(0, 300),
        explanation: text,
        model,
      });
    } catch {
      // 缓存写入失败不影响本次返回
    }
    return res.status(200).json({explanation: text, cached: false});
  } catch (err) {
    console.error('[explain] failed:', err);
    return res.status(502).json({error: 'upstream failed'});
  }
}
