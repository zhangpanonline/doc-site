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

/** 分块内标题 → 锚点（近似 docusaurus 的 github-slugger 行为，跳转略偏也能落到本页） */
function anchorId(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * 把一段 markdown 正文清洗成纯文本。
 * 代码围栏内容原样保留（代码是课程搜索的高价值内容），围栏行与 title 属性去掉。
 */
function cleanMarkdownText(md) {
  const lines = [];
  let inFence = false;
  for (let line of md.split('\n')) {
    const fence = line.trim().match(/^(```+|~~~+)/);
    if (fence) {
      inFence = !inFence;
      continue; // 围栏标记行本身丢弃
    }
    if (!inFence) {
      if (/^\s*(import|export)\s+/.test(line)) continue; // MDX 导入/导出
      if (/^:{1,4}[a-z-]+/.test(line.trim())) continue; // :::note / :::tip 围栏行
      if (/^\s*\|[- :|]+\|\s*$/.test(line)) continue; // 表格分隔行
      line = line.replace(JSX_TAG_RE, '').replace(HTML_TAG_RE, '');
      line = line.replace(MD_LINK_RE, '$1').replace(MD_EMPH_RE, '$2');
      line = line.replace(/\|/g, ' '); // 表格单元格分隔符
    }
    lines.push(line);
  }
  return decodeEntities(lines.join('\n'))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 解析 frontmatter 的 title / slug / description（值是裸词、单双引号均可） */
function parseFrontmatter(raw) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(raw);
  const out = {title: undefined, slug: undefined, description: undefined};
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

    // 文档 URL：docusaurus 的 permalink = 目录路径 + slug；
    // 无 slug 时按相对路径，index.* 是目录页（docusaurus 默认 permalink 行为）
    const relNoExt = rel.replace(/\.(mdx?)$/, '');
    const dir = relNoExt.includes('/') ? relNoExt.split('/').slice(0, -1).join('/') : '';
    let url;
    if (fm.slug) {
      url = `/${dir ? `${dir}/` : ''}${fm.slug.replace(/^\/+/, '')}`;
    } else if (relNoExt === 'index' || relNoExt.endsWith('/index')) {
      url = `/${dir ? `${dir}/` : ''}`;
    } else {
      url = `/${relNoExt}`;
    }

    const breadcrumb =
      rel === 'index.mdx' || rel === 'index.md' ? '' : rel.split('/').slice(0, -1).join(' / ');
    const title = fm.title ?? rel.split('/').pop().replace(/\.(mdx?)$/, '');

    const cleaned = cleanMarkdownText(body);
    // 以 ## 为分块边界；# 标题行直接并入正文（与 frontmatter title 重复）
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

    for (const sec of sections) {
      // 首块带 description（高质量的检索摘要）
      const text =
        (sections.indexOf(sec) === 0 && fm.description ? `${fm.description}\n\n` : '') +
        sec.x.trim();
      if (!text.trim()) continue;
      const anchor = sec.h ? `#${anchorId(sec.h)}` : '';
      for (const piece of splitLong(text, MAX_CHUNK)) {
        chunks.push({u: url + anchor, t: title, b: breadcrumb, h: sec.h, x: piece});
      }
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

const chunks = [...docsChunks(), ...lessonChunks()];
const stats = {docs: 0, lessons: 0};
for (const c of chunks) stats[c.u.startsWith('/teach/lessons/') ? 'lessons' : 'docs']++;

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
  `[search-index] ${chunks.length} 块（文档 ${stats.docs} / 课页 ${stats.lessons}），` +
    `正文 ${Math.round(chars / 1024)} KB → ${path.relative(ROOT, OUT_FILE)}`,
);
