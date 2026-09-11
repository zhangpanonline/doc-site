// SEO 结构化数据插件：构建完成后为每个课程/单元首页注入 Course JSON-LD。
//
// 数据源 = 文档 frontmatter（title + description，AGENTS.md 已约定必填），
// 因此新增课程无需改本插件——frontmatter 齐了就自动获得 Course schema，
// 供搜索引擎富结果与 AI 搜索引用。
//
// 注：FAQPage schema 有意不做——测验/面试题由 JS 动态渲染，HTML 里没有对应
// 问答内容，挂 FAQPage 会被搜索引擎判为误导性结构化数据。
const fs = require('fs');
const path = require('path');

const SITE = 'https://doc.zhangpan.online';

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    // 去掉首尾引号（单/双）
    fm[kv[1]] = kv[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return fm;
}

function courseJsonLd(title, description, url) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description: description || title,
    url,
    inLanguage: 'zh-CN',
    provider: { '@type': 'Organization', name: 'AI 大全栈', url: SITE },
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
  });
}

module.exports = function seoJsonldPlugin() {
  return {
    name: 'seo-jsonld',
    postBuild({ siteDir, outDir }) {
      const docsDir = path.join(siteDir, 'docs');
      const queue = [docsDir];
      let injected = 0;
      while (queue.length) {
        const dir = queue.shift();
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            queue.push(full);
            continue;
          }
          if (entry.name !== 'index.mdx' && entry.name !== 'index.md') continue;
          const fm = parseFrontmatter(fs.readFileSync(full, 'utf8'));
          if (!fm.title) continue;
          // 路由：docs/<a>/<b>/index.mdx → /<a>/<b>/；docs/index.mdx → /
          const rel = path.relative(docsDir, path.dirname(full));
          const route = rel ? `/${rel}/` : '/';
          const target = path.join(outDir, rel, 'index.html');
          if (!fs.existsSync(target)) continue;
          const html = fs.readFileSync(target, 'utf8');
          if (html.includes('"@type":"Course"')) continue;
          const script = `\n<script type="application/ld+json">${courseJsonLd(
            fm.title,
            fm.description,
            SITE + route,
          )}</script>`;
          fs.writeFileSync(target, html.replace('</head>', `${script}\n</head>`));
          injected += 1;
        }
      }
      console.log(`[seo-jsonld] 已注入 Course 结构化数据 ${injected} 个页面`);
    },
  };
};
