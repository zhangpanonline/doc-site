// 把 teach 静态课程页/速查表并入 sitemap.xml。
//
// 为什么需要：static/teach/*.html 是静态文件而非 Docusaurus 路由，
// docusaurus-plugin-sitemap 只收集路由，这 154 个页面进不了 sitemap，
// 也就不会被百度推送（scripts/baidu-push.sh 读 build/sitemap.xml）主动提交。
//
// 必须在 docusaurus build 之后运行（package.json 的 build 已串好）：
//   构建会重建 build/，插早了会被覆盖。
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://doc.zhangpan.online';
const SITEMAP = path.join('build', 'sitemap.xml');
const TEACH = path.join('build', 'teach');

if (!fs.existsSync(SITEMAP)) {
  console.error('[teach-sitemap] 找不到 build/sitemap.xml，请先运行 docusaurus build');
  process.exit(1);
}

/** 收集 build/teach 下所有 .html 的相对路径（POSIX 分隔符） */
function collect(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collect(full, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(TEACH, full).split(path.sep).join('/'));
  }
  return acc;
}

if (!fs.existsSync(TEACH)) {
  console.error('[teach-sitemap] 找不到 build/teach 目录');
  process.exit(1);
}

const files = collect(TEACH).sort();
const xml = fs.readFileSync(SITEMAP, 'utf8');
const entries = [];
let skipped = 0;

for (const rel of files) {
  // 与其它 URL 一致：中文路径按段百分号编码
  const encoded = rel.split('/').map(encodeURIComponent).join('/');
  const loc = `${SITE}/teach/${encoded}`;
  if (xml.includes(`<loc>${loc}</loc>`)) {
    skipped += 1;
    continue;
  }
  entries.push(`<url><loc>${loc}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
}

if (!entries.length) {
  console.log(`[teach-sitemap] 无新增（已存在 ${skipped} 条）`);
} else {
  fs.writeFileSync(SITEMAP, xml.replace('</urlset>', `${entries.join('')}</urlset>`));
  const total = (fs.readFileSync(SITEMAP, 'utf8').match(/<loc>/g) || []).length;
  console.log(`[teach-sitemap] 已并入 ${entries.length} 个 teach 页面（sitemap 共 ${total} 条 URL）`);
}
