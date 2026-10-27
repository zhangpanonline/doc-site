/**
 * 搜索索引与静态课页共用的「文本清洗 + 标题锚点」规则。
 *
 * 为什么抽出来：搜索结果的小节锚点（#xxx）由构建期索引算出，而锚点要能跳转
 * 的前提是页面里**真的存在**同名的 id。docs 页的 id 由 docusaurus 自动生成，
 * teach 静态课页则由 scripts/inject-lesson-anchors.mjs 注入——两处必须用同一套
 * slug 规则，否则索引算出来的锚点在页面上对不上，点了不滚动（2026-10-27）。
 *
 * 只依赖 Node 内置模块，不引第三方包。
 */

/** HTML 实体 → 字符（索引只需覆盖课件里实际用到的那些） */
export const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&#8203;': '',
  '&hellip;': '…',
};

export function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** 常见行内 HTML 标签（小写开头）——保留正文里 a < b 这类比较写法 */
const INLINE_TAGS =
  'code|a|span|div|pre|em|strong|b|i|u|s|del|ins|sub|sup|mark|small|br|p|li|ul|ol|' +
  'table|thead|tbody|tr|td|th|blockquote|details|summary|kbd|abbr|cite|q|time|img|' +
  'iframe|video|audio|figure|figcaption|input|button|label|select|option|h1|h2|h3|' +
  'h4|h5|h6|section|main|article|aside';

/** 大写开头的 JSX 组件标签（TabItem / ApiTable / Quiz 之类） */
export const JSX_TAG_RE = /<\/?[A-Z][A-Za-z0-9._]*(\s[^<>]*?)?\/?>/g;
export const HTML_TAG_RE = new RegExp(`</?(?:${INLINE_TAGS})(?:\\s[^<>]*?)?/?>`, 'gi');
export const MD_LINK_RE = /!?\[([^\]]*)\]\([^)\s]+(?:\s+["'][^"']*["'])?\)/g;
export const MD_EMPH_RE = /(\*\*|__|\*|_|~~|`)((?:(?!\1).)+?)\1/g;

/**
 * 标题文本 → slug（近似 github-slugger：去标点、空白转连字符、小写）。
 *
 * 两个必须照搬的细节，否则与页面真实 id 对不上：
 *   1. 保留 `-` 和 `_`（github-slugger 白名单里就有这两个）
 *   2. 空白**逐个**替换、不合并连续空白。例：`## Lock —— 互斥锁`
 *      破折号被移除后留两个空格 → `lock--互斥锁`；若用 \s+ 合并会变成
 *      `lock-互斥锁`，与页面 id 差一个连字符。
 */
export function slugifyHeading(heading) {
  return (
    heading
      // trim 必须在「移除标点」之前：github-slugger 也是这个顺序。
      // 标题以 emoji 开头时（如 `## 🔗 拓展 · PostgreSQL 官方文档`），emoji 被
      // 移除后留下的**前导空格**会变成一个前导连字符（-拓展--postgresql-官方文档）；
      // 先移除标点再 trim 会把这个连字符吃掉，id 就与页面对不上。
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-') || 'section'
  );
}

/** HTML 片段 → 纯文本（去标签 + 实体解码 + 空白压缩） */
export function stripTags(html) {
  return decodeEntities(
    html
      .replace(HTML_TAG_RE, '')
      .replace(JSX_TAG_RE, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n'),
  ).trim();
}

/**
 * 收集一段 HTML 里所有 h1–h6 的锚点 id，按**出现顺序**返回。
 *
 * github-slugger 对同页面内重复标题会加 -1/-2 后缀（两个「总结」→ 总结、总结-1），
 * 只按文本算 slug 会漏掉后缀。因此计数必须遍历全部层级（含 h1），消费方再按
 * 自己关心的层级过滤——docs 分块只消费 h2+，teach 分块只消费 h2/h3。
 *
 * 返回项带 index / openTag，供注入脚本原地改写标签用。
 */
export function collectHtmlHeadingIds(html) {
  // script / style 里可能出现字符串形式的 <h2>，不能当真标题
  const blocked = [];
  for (const m of html.matchAll(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi)) {
    blocked.push([m.index, m.index + m[0].length]);
  }
  const seq = [];
  const occ = new Map();
  for (const m of html.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)) {
    if (blocked.some(([a, b]) => m.index >= a && m.index < b)) continue;
    const text = stripTags(m[3]);
    if (!text) continue;
    const base = slugifyHeading(text);
    const n = occ.get(base) ?? 0;
    occ.set(base, n + 1);
    const openEnd = m[0].indexOf('>') + 1;
    seq.push({
      level: Number(m[1]),
      text,
      id: n === 0 ? base : `${base}-${n}`,
      index: m.index,
      openTag: m[0].slice(0, openEnd),
    });
  }
  return seq;
}

/**
 * 按出现顺序消费 id 序列，只取指定层级的标题。
 * levels 必须与分块用的标题层级一致——分块只按 h2/h3 切，就只传 [2, 3]；
 * 若多传了 h4，h4 的 id 会被前面的 chunk 抢走，锚点整体错位。
 */
export function makeHtmlIdTaker(seq, levels = [2, 3, 4, 5, 6]) {
  const want = new Set(levels);
  let cursor = 0;
  return () => {
    while (cursor < seq.length && !want.has(seq[cursor].level)) cursor += 1;
    const item = seq[cursor];
    cursor += 1;
    return item ? item.id : '';
  };
}
