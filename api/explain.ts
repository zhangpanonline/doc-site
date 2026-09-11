import {createHash} from 'node:crypto';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {getSupabaseAdmin} from '../lib/supabase-admin';

/**
 * AI 助教（分层讲解 + 定向答疑）：
 * - mode=init：首次解释（5 层输出 + 6 个追问按钮），按代码+上下文+URL 哈希缓存 10 天
 * - mode=followup：学员点了某个追问按钮（buttonText 携带完整问题文本，避免回传历史），
 *   只深挖该方向 80~150 字 + 「还可以看」引导一行；不缓存
 * - mode=generate_note：结课笔记（汇总已问方向的结论）；不缓存
 * 模型：智谱 GLM-4-Flash 优先（ZHIPU_API_KEY），Gemini 多候选兜底。
 * 已问方向由客户端累积后随请求回传（asked），后端拼进提示词——AI 无需重读历史，省 token。
 */

const USER_LEVEL =
  '编程零基础背景，允许使用日常生活来类比——在该领域类比有助于理解时可使用，否则不用';

const SYSTEM_PROMPT = `你是本课程网站的助教，职责是用"分层讲解 + 定向答疑"的方式帮助学员理解代码。
你面对的是代码块里的单段代码，学员可能只有 3~5 次追问机会，因此：
第一次输出必须提供最大价值，后续追问只做定向深挖。

【第一次解释：分层输出】
严格按以下顺序输出，全部绑定到真实行号/变量名，禁止复述代码本身：

1. 概览：用 2-3 句话说明这段代码在做什么、解决什么问题、用了哪些核心概念。
2. 逐步：按执行顺序解释关键步骤，指明行号与变量流转。
3. 概念锚点：明确指认这节课想教的概念，说明这段代码如何体现它；若知识有前置依赖，简要提示"这需要 XX 的基础"。
4. 易错点：主动指出 1-2 个初学者最容易误解或写错的地方。
5. 追问按钮：以"你可能想继续"为标题给出恰好 6 个追问选项（A~F），
   每个选项独占一行、格式为"A. <问题>"，必须是"对已讲内容的定向深挖"，禁止抛出全新话题。

【追问回复】
- 只深入回答学员选中的那一个问题方向，不要重新展开全部。
- 回答控制在 80~150 字，连同必要的最小示例代码。
- 结尾用一行"还可以看：<字母>"，引导一次点击（绝不罗列全部 6 个）。
- 若问题指向已解答过的地方，用一句话指回原位置，不再重复。

【整体强约束】
- 不使用"这段代码很简洁/实现了功能"之类的无效评价。
- 不猜测代码意图之外的背景；不清楚时注明"从代码只能确认到……"。
- 不使用 emoji，不堆砌术语；优先用生活化类比解释概念。
- 学员是${USER_LEVEL}。
- 当收到明确的"结课"指令时，输出"结课笔记"。

【结课笔记格式】
仅当收到结课指令时输出（不要主动提前输出）：
## 本节代码结课笔记
- 代码做什么：…
- 核心概念：…
- 你问过的点及结论：①… ②…
- 一句带走：…
最后附一行 [复制笔记]`;

/** 每次请求的 token 上限与超时（按模式分级：init 输出最长，防截断/防超时） */
const MODE_PARAMS = {
  init: {maxTokens: 1500, timeoutMs: 18_000},
  followup: {maxTokens: 400, timeoutMs: 12_000},
  generate_note: {maxTokens: 900, timeoutMs: 15_000},
} as const;
type Mode = keyof typeof MODE_PARAMS;

interface AskedItem {
  label: string;
  question: string;
}

/** 追问的代码长度上限（init 用完整代码；后续轮次截断以省 token） */
const FOLLOWUP_CODE_LIMIT = 3000;

// ---------- 模型候选（Gemini 兜底用） ----------

let cachedModels: string[] | null = null;

function versionOf(name: string): [number, number] {
  const m = /gemini-(\d+)(?:\.(\d+))?/.exec(name);
  return m ? [Number(m[1]), Number(m[2] ?? 0)] : [0, 0];
}

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

// ---------- 多提供商调用链：GLM → 讯飞星火 → Gemini ----------

/** OpenAI 兼容的一次 chat 调用：成功返回文本，失败抛错 */
async function chatOnce(opts: {
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens: number;
  timeoutMs: number;
  provider: string;
  extraBody?: Record<string, unknown>;
}): Promise<string> {
  const {endpoint, apiKey, model, prompt, maxTokens, timeoutMs, provider, extraBody} = opts;
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
    body: JSON.stringify({
      model,
      messages: [
        {role: 'system', content: SYSTEM_PROMPT},
        {role: 'user', content: prompt},
      ],
      max_tokens: maxTokens,
      temperature: 0.6,
      ...extraBody,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) {
    throw new Error(`${provider} http ${r.status} ${(await r.text().catch(() => '')).slice(0, 200)}`);
  }
  const data = (await r.json()) as {choices?: {message?: {content?: string}}[]};
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error(`${provider} empty response`);
  }
  return text;
}

/** Gemini 非 OpenAI 兼容格式：返回模型名 + 文本，失败抛错 */
async function geminiOnce(opts: {
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens: number;
  timeoutMs: number;
}): Promise<string> {
  const {apiKey, model, prompt, maxTokens, timeoutMs} = opts;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        systemInstruction: {parts: [{text: SYSTEM_PROMPT}]},
        contents: [{parts: [{text: prompt}]}],
        generationConfig: {maxOutputTokens: maxTokens},
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (!r.ok) {
    throw new Error(`gemini[${model}] http ${r.status} ${(await r.text().catch(() => '')).slice(0, 250)}`);
  }
  const data = (await r.json()) as {
    candidates?: {content?: {parts?: {text?: string}[]}}[];
  };
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map(p => p.text ?? '')
    .join('')
    .trim();
  if (!text) {
    throw new Error(`gemini[${model}] empty response`);
  }
  return text;
}

async function callLlm(
  prompt: string,
  params: {maxTokens: number; timeoutMs: number},
): Promise<{text: string; model: string}> {
  const glmKey = process.env.ZHIPU_API_KEY;
  const sparkKey = process.env.SPARK_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!glmKey && !sparkKey && !geminiKey) {
    throw new Error('no AI keys configured');
  }

  // 全局截止时间：函数上限 60s，留 12s 给缓存查询/模型解析/响应开销。
  // 每档每次尝试的超时 = min(本模式超时, 距截止剩余)，档位越多也不会撑爆预算。
  const deadline = Date.now() + 45_000;
  const timeoutFor = () =>
    Math.max(5_000, Math.min(params.timeoutMs, deadline - Date.now() - 1_500));
  const rest = (ms: number) => new Promise(r => setTimeout(r, ms));
  let lastDetail = '';

  // 1) 智谱 GLM-4-Flash（免费、快、中文原生）
  if (glmKey) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await chatOnce({
          endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          apiKey: glmKey,
          model: 'glm-4-flash',
          prompt,
          maxTokens: params.maxTokens,
          timeoutMs: timeoutFor(),
          provider: 'glm-4-flash',
        });
        return {text, model: 'glm-4-flash'};
      } catch (err) {
        lastDetail = err instanceof Error ? err.message : String(err);
        console.error('[explain] glm attempt failed:', attempt, lastDetail);
      }
      if (Date.now() > deadline) break;
      await rest(1200);
    }
    console.error('[explain] glm failed, try spark:', lastDetail);
  }

  // 2) 讯飞星火 Spark Lite（免费档，OpenAI 兼容）
  if (sparkKey) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await chatOnce({
          endpoint: 'https://spark-api-open.xf-yun.com/v1/chat/completions',
          apiKey: sparkKey,
          model: 'lite',
          prompt,
          maxTokens: params.maxTokens,
          timeoutMs: timeoutFor(),
          provider: 'spark-lite',
        });
        return {text, model: 'spark-lite'};
      } catch (err) {
        lastDetail = err instanceof Error ? err.message : String(err);
        console.error('[explain] spark attempt failed:', attempt, lastDetail);
      }
      if (Date.now() > deadline) break;
      await rest(1200);
    }
    console.error('[explain] spark failed, try gemini:', lastDetail);
  }

  // 3) Gemini 多候选兜底
  if (geminiKey) {
    const models = await resolveModelCandidates(geminiKey);
    for (const model of models.slice(0, 2)) {
      try {
        const text = await geminiOnce({
          apiKey: geminiKey,
          model,
          prompt,
          maxTokens: params.maxTokens,
          timeoutMs: timeoutFor(),
        });
        return {text, model};
      } catch (err) {
        lastDetail = err instanceof Error ? err.message : String(err);
        console.error('[explain] gemini attempt failed:', model, lastDetail);
      }
      if (Date.now() > deadline) break;
      await rest(1200);
    }
  }

  throw new Error(`upstream overloaded: ${lastDetail.slice(0, 300)}`);
}

// ---------- 每 IP 每日追问限额（防脚本刷免费额度；表缺失时优雅跳过） ----------

const DAILY_LIMIT = 50;

async function withinQuota(req: VercelRequest): Promise<boolean> {
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const admin = getSupabaseAdmin();
  try {
    const {data, error} = await admin
      .from('code_explain_quota')
      .select('count')
      .eq('ip', ip)
      .eq('day', day)
      .maybeSingle();
    if (error) return true; // 表未创建：不设限
    const count = Number((data as {count?: number} | null)?.count ?? 0);
    if (count >= DAILY_LIMIT) return false;
    await admin.from('code_explain_quota').upsert({ip, day, count: count + 1});
    return true;
  } catch {
    return true; // 任何存储故障都不挡学习
  }
}

// ---------- 提示词组装 ----------

function buildUserPrompt(mode: Mode, opts: {
  code: string;
  lang: string;
  context: string;
  url: string;
  asked: AskedItem[];
  buttonText: string;
}): string {
  const {code, lang, context, url, asked, buttonText} = opts;
  const stateLines = asked.map((a, i) => `${i + 1}. ${a.label}：${a.question}`).join('\n');
  const shortCode = code.slice(0, FOLLOWUP_CODE_LIMIT);

  if (mode === 'init') {
    const courseLine = context
      ? `学生正在学习《AI 大全栈》课程的「${context}」这一节。\n`
      : '';
    const urlLine = url ? `页面地址（含锚点，锚点即本页小节名）：${url}\n` : '';
    return `【第一次解释】按「分层输出」要求完整讲解下面这段${lang}代码。\n${courseLine}${urlLine}\n代码：\n${code}`;
  }
  if (mode === 'followup') {
    return `【追问回复】已问方向：\n${stateLines || '（尚无）'}\n学员本次追问：${buttonText}\n按「追问回复」要求输出 80~150 字定向深挖，最后一行给出「还可以看：<字母>」。\n\n代码：\n${shortCode}`;
  }
  return `【结课】输出结课笔记。学员问过的点（须在笔记里逐一给出结论）：\n${stateLines || '（没有追问）'}\n\n代码：\n${shortCode}`;
}

// ---------- 主处理 ----------

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
  const context = String(body.context ?? '').slice(0, 200);
  const url = String(body.url ?? '').slice(0, 500);
  const rawMode = String(body.mode ?? 'init');
  const mode: Mode = rawMode === 'followup' || rawMode === 'generate_note' ? rawMode : 'init';
  const buttonText = String(body.buttonText ?? '').slice(0, 300);
  const asked: AskedItem[] = Array.isArray(body.asked)
    ? (body.asked as {label?: unknown; question?: unknown}[])
        .slice(0, 6)
        .map(a => ({label: String(a.label ?? '?').slice(0, 2), question: String(a.question ?? '').slice(0, 300)}))
        .filter(a => a.question)
    : [];

  if (!code.trim()) {
    return res.status(400).json({error: 'empty code'});
  }
  if (mode === 'followup' && !buttonText.trim()) {
    return res.status(400).json({error: 'buttonText required for followup'});
  }

  const admin = getSupabaseAdmin();

  // init 走缓存（10 天 TTL）；followup/note 千人千面，不缓存
  if (mode === 'init') {
    const hash = createHash('md5').update(`${lang}\n${code}\n${context}\n${url}`).digest('hex');
    try {
      const {data: cached} = await admin
        .from('code_explanations')
        .select('explanation')
        .eq('code_hash', hash)
        .gte('created_at', new Date(Date.now() - 10 * 86_400_000).toISOString())
        .maybeSingle();
      if (cached?.explanation) {
        return res.status(200).json({explanation: cached.explanation, cached: true});
      }
    } catch {
      // 缓存表不存在（008 未执行）时走直查路径
    }
  } else {
    // 追问与结课：每 IP 每日限额
    if (!(await withinQuota(req))) {
      return res.status(429).json({error: '今日追问次数已达上限，明天再来'});
    }
  }

  const params = MODE_PARAMS[mode];
  const prompt = buildUserPrompt(mode, {code, lang, context, url, asked, buttonText});

  try {
    const {text, model} = await callLlm(prompt, params);

    if (mode === 'init') {
      try {
        await admin.from('code_explanations').upsert({
          code_hash: createHash('md5').update(`${lang}\n${code}\n${context}\n${url}`).digest('hex'),
          lang,
          code_preview: code.slice(0, 300),
          explanation: text,
          model,
          created_at: new Date().toISOString(),
        });
      } catch {
        // 缓存写入失败不影响本次返回
      }
    }
    return res.status(200).json({explanation: text, mode, cached: false});
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('no AI keys configured')) {
      return res.status(500).json({error: msg});
    }
    return res.status(502).json({error: msg.slice(0, 300)});
  }
}
