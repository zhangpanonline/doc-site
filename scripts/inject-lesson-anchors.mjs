#!/usr/bin/env node
/**
 * 给静态互动课页的标题补 id，让搜索结果的小节锚点能跳转。
 *
 * 背景：teach/lessons/*.html 是手写静态页，标题没有 id 属性，而搜索索引
 * （scripts/build-search-index.mjs）给每个 chunk 都带了 #小节锚点。锚点指向
 * 页面上不存在的 id 时，浏览器只会打开页面、不会滚动到对应小节——搜索结果
 * 看起来像「点进去了但没找到」（2026-10-27 修复，1267 个课页 chunk 全中招）。
 *
 * 规则复用 scripts/lib/search-text.mjs 的 collectHtmlHeadingIds（与索引同一份
 * 实现），保证两边算出的 id 完全一致。
 *
 * 源目录 teach/lessons 是编辑源，改完同步复制到 static/teach/lessons
 * （docusaurus 的 static 目录，索引与线上都读这里）。
 *
 * 运行：node scripts/inject-lesson-anchors.mjs（已挂在 pnpm build 最前面）
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectHtmlHeadingIds} from './lib/search-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'teach/lessons');
const OUT_DIR = path.join(ROOT, 'static/teach/lessons');

/** 把 id 写进 h1–h6 的开标签；已有 id 则覆盖（幂等，重复跑结果不变） */
function injectIds(html) {
  const main = /<main\b[^>]*>[\s\S]*?<\/main>/i.exec(html);
  if (!main) return {html, count: 0};
  const seq = collectHtmlHeadingIds(main[0]);
  if (seq.length === 0) return {html, count: 0};

  // 从后往前替换，避免前面的改写把后面的 index 挤偏
  const base = main.index;
  let out = html;
  for (let i = seq.length - 1; i >= 0; i -= 1) {
    const h = seq[i];
    const open = h.openTag;
    const newOpen = open.replace(/\s+id="[^"]*"/i, '').replace(/>$/, ` id="${h.id}">`);
    if (newOpen === open) continue;
    const at = base + h.index;
    out = out.slice(0, at) + newOpen + out.slice(at + open.length);
  }
  return {html: out, count: seq.length};
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.warn(`[lesson-anchors] 目录不存在，跳过：${SRC_DIR}`);
    return;
  }
  fs.mkdirSync(OUT_DIR, {recursive: true});

  let files = 0;
  let headings = 0;
  let changed = 0;
  for (const name of fs.readdirSync(SRC_DIR).sort()) {
    if (!name.endsWith('.html')) continue;
    const src = path.join(SRC_DIR, name);
    const raw = fs.readFileSync(src, 'utf8');
    const {html, count} = injectIds(raw);
    files += 1;
    headings += count;
    if (html !== raw) {
      fs.writeFileSync(src, html);
      changed += 1;
    }
    // 源目录是权威，static 侧始终是副本（避免手工改动造成两边漂移）
    fs.writeFileSync(path.join(OUT_DIR, name), html);
  }
  console.log(
    `[lesson-anchors] ${files} 个课页，${headings} 个标题 id（本次改写 ${changed} 个）→ static/teach/lessons/`,
  );
}

main();
