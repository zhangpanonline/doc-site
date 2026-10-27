#!/usr/bin/env node
/**
 * 构建期生成 AI 搜索索引（零依赖，只用 Node 内置模块）：
 *   1. docs/**​/*.{md,mdx}   —— 解析 frontmatter（title/slug/description），按 ## 分块
 *   2. static/teach/lessons/*.html —— 提取 <main> 正文，按 h2/h3 分块
 * 输出 api/_index/search-index.ts，由 api/ai-search.ts 静态 import（随函数打包）。
 *
 * 运行：node scripts/build-search-index.mjs（已挂在 pnpm build 最前面）
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const LESSONS_DIR = path.join(ROOT, 'static/teach/lessons');
const OUT_FILE = path.join(ROOT, 'api/_index/search-index.ts');

/** 单块正文上限（字符）：控制检索阶段的 prompt 体积 */
const MAX_CHUNK = 1600;

// ---------------------------------------------------------------- 文本清洗

const ENTITIES = {
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

function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** 常见行内 HTML 标签（小写开头）——保留正文里 a < b 这类比较写法 */
const INLINE_TAGS =
  'code|a|span|div|pre|em|strong|b|i|u|s|del|ins|sub|sup|mark|small|br|p|li|ul|ol|' +
  'table|thead|tbody|tr|td|th|blockquote|details|summary|kbd|abbr|cite|q|time|img|' +
  'iframe|video|audio|figure|figcaption|input|button|label|select|option|h1|h2|h3|' +
  'h4|h5|h6|section|main|article|aside';

/** 大写开头的 JSX 组件标签（TabItem / ApiTable / Quiz 之类） */
const JSX_TAG_RE = /<\/?[A-Z][A-Za-z0-9._]*(\s[^<>]*?)?\/?>/g;
const HTML_TAG_RE = new RegExp(`</?(?:${INLINE_TAGS})(?:\\s[^<>]*?)?/?>`, 'gi');
const MD_LINK_RE = /!?\[([^\]]*)\]\([^)\s]+(?:\s+["'][^"']*["'])?\)/g;
const MD_EMPH_RE = /(\*\*|__|\*|_|~~|`)((?:(?!\1).)+?)\1/g;

/** 标题文本 → slug（近似 github-slugger：去标点、空白转连字符、小写） */
function slugifyHeading(heading) {
  return (
    heading
      .toLowerCase()
      // 保留 - 和 _（github-slugger 的白名单里就有这两个）
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .trim()
      // 逐个空白替换、不合并连续空白：对齐 github-slugger。
      // 例：## Lock —— 互斥锁（破折号被移除后留两个空格）→ lock--互斥锁，
      // 若合并成 \s+ 会得到 lock-互斥锁，与页面真实 id 对不上。
      .replace(/\s/g, '-') || 'section'
  );
}

/** 分块内标题 → 锚点（近似 docusaurus 的 github-slugger 行为，跳转略偏也能落到本页） */
function anchorId(heading) {
  return slugifyHeading(heading);
}

/** 单行 markdown 清洗成纯文本（与 cleanMarkdownText 对非代码行的处理保持一致） */
function cleanLine(line) {
  return decodeEntities(
    line
      .replace(JSX_TAG_RE, '')
      .replace(HTML_TAG_RE, '')
      .replace(MD_LINK_RE, '$1')
      .replace(MD_EMPH_RE, '$2'),
  )
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * 按文档里标题的**出现顺序**生成锚点 id 序列（h1–h6 全算）。
 * github-slugger 会对同页面内重复标题加 -1/-2 后缀（如两个「总结」→ 总结、总结-1），
 * 只按文本算 slug 会漏掉后缀，锚点就指不到真实标题。
 * 代码围栏里的 # 注释不是标题，必须跳过，否则计数会被带偏。
 */
function collectHeadingIds(body) {
  const seq = [];
  const occ = new Map();
  let fence = null;
  for (const line of body.split('\n')) {
    const next = fenceToggle(fence, line);
    if (next !== fence) {
      fence = next;
      continue;
    }
    if (fence) continue;
    const m = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = cleanLine(m[1]);
    if (!text) continue;
    const base = slugifyHeading(text);
    const n = occ.get(base) ?? 0;
    occ.set(base, n + 1);
    const level = /^(#{1,6})/.exec(line)[1].length;
    seq.push({text, id: n === 0 ? base : `${base}-${n}`, level});
  }
  return seq;
}

/**
 * 按顺序消费标题 id 序列：同名标题第二次出现时拿到 -1 后缀的那份。
 * 只消费 h2 及更深层——分块以 ## 为边界，h1 虽参与去重计数但不对应任何 chunk。
 */
function makeIdTaker(seq) {
  let cursor = 0;
  return (text) => {
    for (let i = cursor; i < seq.length; i += 1) {
      if (seq[i].level >= 2 && seq[i].text === text) {
        cursor = i + 1;
        return seq[i].id;
      }
    }
    return anchorId(text); // 兜底：文本没对上时退回纯 slug
  };
}

/**
 * 代码围栏检测（CommonMark 规则）：只有**同类且长度不小于**开启标记的那一行才闭合。
 * 早期版本用 toggle 开关，遇到 ````markdown 里嵌 ```python 的嵌套块会提前闭合，
 * 于是代码块内的 # 示例标题被当成真标题、示例代码被当正文（2026-10-27 修复）。
 */
function fenceToggle(state, line) {
  const m = /^(`{3,}|~{3,})/.exec(line.trim());
  if (!m) return state;
  if (!state) return m[1];
  return m[1][0] === state[0] && m[1].length >= state.length ? null : state;
}

/**
 * 按行清洗 markdown，并标记每行是否处于代码围栏内。
 * 分块必须依赖这个标记：课件里常见 ````markdown 内嵌 ```bash 的嵌套块，其中的
 * `## 什么是 UV？` 是示例文档而非真标题——只看 `^##` 切块会把示例代码切成独立
 * chunk，锚点也就指到了页面上不存在的标题（2026-10-27 修复）。
 * 代码内容本身要保留（对课程搜索是高价值内容），只是不能被当标题。
 */
function parseMarkdownRows(md) {
  const rows = [];
  let fence = null;
  for (const line of md.split('\n')) {
    const next = fenceToggle(fence, line);
    if (next !== fence) {
      fence = next;
      continue; // 围栏标记行本身丢弃
    }
    if (fence) {
      rows.push({text: line, fence: true});
      continue;
    }
    if (/^\s*(import|export)\s+/.test(line)) continue; // MDX 导入/导出
    if (/^:{1,4}[a-z-]+/.test(line.trim())) continue; // :::note / :::tip 围栏行
    if (/^\s*\|[- :|]+\|\s*$/.test(line)) continue; // 表格分隔行
    rows.push({
      text: line
        .replace(JSX_TAG_RE, '')
        .replace(HTML_TAG_RE, '')
        .replace(MD_LINK_RE, '$1')
        .replace(MD_EMPH_RE, '$2')
        .replace(/\|/g, ' '), // 表格单元格分隔符
      fence: false,
    });
  }
  return rows;
}

/** 文本收尾：实体解码 + 空白压缩（块拼好后再调用，避免破坏行结构） */
function finishText(s) {
  return decodeEntities(s)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 把一段 markdown 清洗成纯文本（不区分围栏行，供结构简单的补充资料使用） */
function cleanMarkdownText(md) {
  return finishText(parseMarkdownRows(md).map((r) => r.text).join('\n'));
}

/** 解析 frontmatter 的 title / slug / description（值是裸词、单双引号均可） */
function parseFrontmatter(raw) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(raw);
  const out = {title: undefined, slug: undefined, description: undefined, url: undefined};
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*([\s\S]*)$/.exec(line.trim());
    if (!kv || !(kv[1] in out)) continue;
    let v = kv[2].trim();
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      v = v.slice(1, -1);
    }
    out[kv[1]] = v;
  }
  return out;
}

/**
 * 复刻 docusaurus 默认 numberPrefixParser：文件名前的「数字 + [-_.]」前缀会被剥离。
 * 只作用于 basename——目录名里的数字前缀不会被剥。
 * 例：01.必看导言 → 必看导言；26.协程 Coroutine → 协程 Coroutine
 */
function stripNumberPrefix(name) {
  const m = /^\d+[-_.]+/.exec(name);
  return m ? name.slice(m[0].length) : name;
}

/**
 * 近似 docusaurus 的 slugify（github-slugger，maintainCase=true）：
 * 去掉标点、空白折叠为连字符，大小写保留。
 * 注意只用于文件名段——目录名 docusaurus 原样保留（含空格与 + 号）。
 * 例：协程 Coroutine → 协程-Coroutine；Future类 → Future类
 */
function slugifySegment(s) {
  return s
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** 超长正文按段落边界切块 */
function splitLong(text, limit) {
  if (text.length <= limit) return [text];
  const parts = [];
  let buf = '';
  for (const para of text.split(/\n{2,}/)) {
    if (buf && buf.length + para.length + 2 > limit) {
      parts.push(buf.trim());
      buf = '';
    }
    buf = buf ? `${buf}\n\n${para}` : para;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

// ---------------------------------------------------------------- docs 解析

function walkFiles(dir, exts) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walkFiles(full, exts));
    else if (exts.includes(path.extname(name))) out.push(full);
  }
  return out;
}

function docsChunks() {
  const chunks = [];
  for (const file of walkFiles(DOCS_DIR, ['.md', '.mdx'])) {
    const rel = path.relative(DOCS_DIR, file).replace(/\\/g, '/');
    const raw = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(raw);
    const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

    // 文档 URL：docusaurus 的 permalink = 目录路径（原样）+ 文件名段（去数字前缀后 slugify）
    // 关键点：文件名带「01.」这类数字前缀时，真实路由里没有前缀——早期版本直接拼相对路径，
    // 导致搜索结果的链接 404（2026-10-27 修复，177 个 URL 里 120 个是错的）。
    const relNoExt = rel.replace(/\.(mdx?)$/, '');
    const parts = relNoExt.split('/');
    const dir = parts.slice(0, -1).join('/');
    const base = parts[parts.length - 1];
    const withDir = (seg) => `/${dir ? `${dir}/` : ''}${seg}`;
    let url;
    if (fm.slug) {
      // slug 以 / 开头表示站点绝对路径，否则相对所在目录
      url = fm.slug.startsWith('/') ? fm.slug : withDir(fm.slug.replace(/^\/+/, ''));
    } else if (base === 'index') {
      url = withDir('');
    } else {
      url = withDir(slugifySegment(stripNumberPrefix(base)));
    }

    const breadcrumb =
      rel === 'index.mdx' || rel === 'index.md' ? '' : rel.split('/').slice(0, -1).join(' / ');
    const title = fm.title ?? rel.split('/').pop().replace(/\.(mdx?)$/, '');

    const rows = parseMarkdownRows(body);
    const takeId = makeIdTaker(collectHeadingIds(body));
    // 以 ## 为分块边界（**仅限非代码行**）；# 标题行直接并入正文（与 frontmatter title 重复）
    const sections = [];
    for (const row of rows) {
      if (!row.fence && /^##\s+/.test(row.text)) {
        sections.push({h: row.text.replace(/^##\s+/, '').trim(), x: ''});
      } else if (sections.length === 0) {
        sections.push({h: '', x: row.text});
      } else {
        sections[sections.length - 1].x += `\n${row.text}`;
      }
    }

    for (const sec of sections) {
      // 首块带 description（高质量的检索摘要）
      const secText = finishText(sec.x);
      const text =
        (sections.indexOf(sec) === 0 && fm.description ? `${fm.description}\n\n` : '') + secText;
      if (!text.trim()) continue;
      const anchor = sec.h ? `#${takeId(sec.h)}` : '';
      for (const piece of splitLong(text, MAX_CHUNK)) {
        chunks.push({u: url + anchor, t: title, b: breadcrumb, h: sec.h, x: piece});
      }
    }
  }
  return chunks;
}

// ---------------------------------------------------------------- 站点补充资料解析

/**
 * 非课程文档的站点补充资料（scripts/search-extra.md）：React 页面里无法被
 * 构建索引抓到的口径/术语说明（如岗位市场情报的 P50 分位数口径）。
 * frontmatter：title（来源标题）、url（页面地址）；正文按 ## 分块，与 docs 同构。
 */
const EXTRA_FILE = path.join(ROOT, 'scripts', 'search-extra.md');

function extraChunks() {
  if (!fs.existsSync(EXTRA_FILE)) return [];
  const raw = fs.readFileSync(EXTRA_FILE, 'utf8');
  const fm = parseFrontmatter(raw);
  const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  const url = typeof fm.url === 'string' ? fm.url.replace(/^\/+/, '/') : '/';
  const title = fm.title ?? '站点说明';
  const cleaned = cleanMarkdownText(body);
  const sections = [];
  let curHead = '';
  for (const line of cleaned.split('\n')) {
    if (/^##\s+/.test(line)) {
      curHead = line.replace(/^##\s+/, '').trim();
      sections.push({h: curHead, x: ''});
    } else if (sections.length === 0) {
      sections.push({h: '', x: line});
    } else {
      sections[sections.length - 1].x += `\n${line}`;
    }
  }
  const chunks = [];
  for (const sec of sections) {
    const text = sec.x.trim();
    if (!text) continue;
    const anchor = sec.h ? `#${anchorId(sec.h)}` : '';
    for (const piece of splitLong(text, MAX_CHUNK)) {
      chunks.push({u: url + anchor, t: title, b: '岗位地图 / 市场情报', h: sec.h, x: piece});
    }
  }
  return chunks;
}

// ---------------------------------------------------------------- 官方术语表解析

/**
 * 官方术语表（scripts/search-glossary.md）：通用术语解释只从官方文档获取，
 * 每个 ## 术语 条目内以「来源：URL」行标注出处；chunk 的 u 直接指向该官方文档。
 */
const GLOSSARY_FILE = path.join(ROOT, 'scripts', 'search-glossary.md');

function glossaryChunks() {
  if (!fs.existsSync(GLOSSARY_FILE)) return [];
  const raw = fs.readFileSync(GLOSSARY_FILE, 'utf8');
  const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  const cleaned = cleanMarkdownText(body);
  const entries = [];
  let cur = null;
  for (const line of cleaned.split('\n')) {
    if (/^##\s+/.test(line)) {
      cur = {h: line.replace(/^##\s+/, '').trim(), x: ''};
      entries.push(cur);
    } else if (cur) {
      cur.x += `\n${line}`;
    }
  }
  const chunks = [];
  for (const e of entries) {
    const src = /来源[:：]\s*(https?:\/\/\S+)/.exec(e.x);
    const x = e.x.replace(/来源[:：]\s*https?:\/\/\S+\s*/, '').trim();
    if (!x) continue;
    for (const piece of splitLong(x, MAX_CHUNK)) {
      chunks.push({u: src ? src[1] : '/', t: e.h, b: '官方术语表', h: e.h, x: piece});
    }
  }
  return chunks;
}

// ---------------------------------------------------------------- 静态课页解析

function stripTags(html) {
  return decodeEntities(
    html
      .replace(HTML_TAG_RE, '')
      .replace(JSX_TAG_RE, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n'),
  ).trim();
}

function lessonChunks() {
  const chunks = [];
  for (const file of walkFiles(LESSONS_DIR, ['.html'])) {
    const raw = fs.readFileSync(file, 'utf8');
    // 正文范围：<main> 优先，退化为 <body>
    const main =
      /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(raw)?.[1] ??
      /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(raw)?.[1] ??
      raw;
    // 标题：h1 优先；退化为 <title> 的「·」前段
    const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(main)?.[1] ?? '';
    const titleTag = /<title>([\s\S]*?)<\/title>/i.exec(raw)?.[1] ?? path.basename(file);
    const title = stripTags(h1).trim() || titleTag.split('·')[0].trim();
    // 单元标签：<title> 里「（…）」部分（如「Python 框架 fw-05」）
    const unit = /（([^（）]*)）/.exec(titleTag)?.[1]?.trim();
    const breadcrumb = unit ? `互动课程 / ${unit}` : '互动课程';

    // 去掉脚本/样式/导航，再按 h2/h3 切块
    const body = main
      .replace(/<(script|style|nav|header|footer)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/\n{3,}/g, '\n\n');
    const sections = [];
    let rest = body;
    const headRe = /<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i;
    for (;;) {
      const m = headRe.exec(rest);
      if (!m) {
        if (sections.length === 0) sections.push({h: '', x: rest});
        else sections[sections.length - 1].x += rest;
        break;
      }
      if (sections.length > 0) sections[sections.length - 1].x += rest.slice(0, m.index);
      const curHead = stripTags(m[1]);
      sections.push({h: curHead, x: ''});
      rest = rest.slice(m.index + m[0].length);
    }

    const url = `/teach/lessons/${path.basename(file)}`;
    for (const sec of sections) {
      const text = stripTags(sec.x);
      if (!text.trim()) continue;
      const anchor = sec.h ? `#${anchorId(sec.h)}` : '';
      for (const piece of splitLong(text, MAX_CHUNK)) {
        chunks.push({u: url + anchor, t: title, b: breadcrumb, h: sec.h, x: piece});
      }
    }
  }
  return chunks;
}

// ---------------------------------------------------------------- 主流程

const chunks = [...docsChunks(), ...lessonChunks(), ...extraChunks(), ...glossaryChunks()];
const stats = {docs: 0, lessons: 0, extra: 0, glossary: 0};
for (const c of chunks) {
  if (c.u.startsWith('/teach/lessons/')) stats.lessons++;
  else if (c.b === '岗位地图 / 市场情报') stats.extra++;
  else if (c.b === '官方术语表') stats.glossary++;
  else stats.docs++;
}

fs.mkdirSync(path.dirname(OUT_FILE), {recursive: true});
const out = `// 自动生成（scripts/build-search-index.mjs）——勿手改。
// 全站课程文档 + 静态课页的分块文本索引，供 api/ai-search.ts 检索。
export interface SearchChunk {
  u: string; // URL（含小节锚点）
  t: string; // 文档/课程标题
  b: string; // 面包屑（单元路径）
  h: string; // 小节标题（可为空）
  x: string; // 正文纯文本
}
export const INDEX: SearchChunk[] = ${JSON.stringify(chunks)};
`;
fs.writeFileSync(OUT_FILE, out);

const chars = chunks.reduce((n, c) => n + c.x.length, 0);
console.log(
  `[search-index] ${chunks.length} 块（文档 ${stats.docs} / 课页 ${stats.lessons} / 补充 ${stats.extra} / 术语 ${stats.glossary}），` +
    `正文 ${Math.round(chars / 1024)} KB → ${path.relative(ROOT, OUT_FILE)}`,
);
