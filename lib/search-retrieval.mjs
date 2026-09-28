/**
 * AI 搜索的关键词检索（纯 JS，零依赖，Node / 打包后均可运行）。
 * 中文按二元分词（bigram）+ 英文按单词，TF-IDF 打分。
 * 已知限制与 @easyops 旧插件一致：单个汉字查询无结果（至少两个字）。
 */

/**
 * 分词：连续汉字段 → 二元组；连续 ASCII 字母数字段 → 单词（小写）。
 * 索引构建与查询共用同一分词器，保证能对上。
 */
export function tokenize(text) {
  const out = [];
  const s = String(text).toLowerCase();
  for (const m of s.matchAll(/[\p{Script=Han}]+|[a-z0-9_]+/gu)) {
    const seg = m[0];
    if (/^[\p{Script=Han}]/u.test(seg)) {
      if (seg.length === 1) out.push(seg);
      else for (let i = 0; i < seg.length - 1; i++) out.push(seg.slice(i, i + 2));
    } else {
      out.push(seg);
    }
  }
  return out;
}

// ---------------------------------------------------------------- 索引统计

/** 模块级惰性缓存：token → 出现该 token 的块数（文档频率），用于 IDF */
let dfCache = null;
let dfSource = null;

function documentFrequency(chunks) {
  if (dfCache && dfSource === chunks) return dfCache;
  const df = new Map();
  for (const c of chunks) {
    const seen = new Set();
    for (const t of tokenize(c.x + '\n' + c.t + '\n' + c.h)) {
      if (!seen.has(t)) {
        seen.add(t);
        df.set(t, (df.get(t) ?? 0) + 1);
      }
    }
  }
  dfCache = df;
  dfSource = chunks;
  return df;
}

// ---------------------------------------------------------------- 检索

/**
 * 检索 top-N 相关块。
 * - maxPerDoc：同一文档最多取几块（避免单篇霸榜）
 * - budget：命中块正文字符总量上限（控制后续 LLM prompt 体积）
 */
export function retrieve(chunks, query, {top = 10, maxPerDoc = 2, budget = 6000} = {}) {
  const q = String(query).trim();
  const qTokens = [...new Set(tokenize(q))];
  if (qTokens.length === 0) return [];

  const df = documentFrequency(chunks);
  const N = chunks.length;
  const idf = (t) => Math.log(1 + N / Math.max(1, df.get(t) ?? 0));

  const scored = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const text = c.x + '\n' + c.t + '\n' + c.h;
    const tokens = tokenize(text);
    // 块内词频（一次遍历建 Map 略贵，直接线性扫查询词频次）
    let score = 0;
    let matched = 0;
    const titleTokens = tokenize(c.t + ' ' + c.h);
    for (const qt of qTokens) {
      let tf = 0;
      for (const t of tokens) if (t === qt) tf++;
      if (tf > 0) {
        matched++;
        // 标题/小节命中加权 ×3
        const inTitle = titleTokens.includes(qt);
        score += tf * idf(qt) * (inTitle ? 3 : 1);
      }
    }
    if (matched > 0) scored.push({i, score, u: c.u});
  }

  scored.sort((a, b) => b.score - a.score);

  const hits = [];
  const perDoc = new Map();
  let used = 0;
  for (const {i} of scored) {
    const c = chunks[i];
    const docKey = c.u.split('#')[0];
    if ((perDoc.get(docKey) ?? 0) >= maxPerDoc) continue;
    if (used + c.x.length > budget && hits.length >= 3) continue; // 预算满且已有若干命中即停
    hits.push(c);
    perDoc.set(docKey, (perDoc.get(docKey) ?? 0) + 1);
    used += c.x.length;
    if (hits.length >= top) break;
  }
  return hits;
}
