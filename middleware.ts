// Vercel Routing Middleware —— JS 挑战门（加强层）
//
// 策略（与 static/robots.txt、vercel.json 防火墙规则分工）：
//   robots.txt     ：君子协定层，只拦遵守协议的爬虫
//   vercel.json    ：WAF 层，脚本库 UA / 无 UA 请求 → challenge
//   本文件         ：路由层，文档页必须持 zg_js cookie 才放行，
//                    无 JS 执行能力的客户端（curl/脚本/朴素爬虫）拿不到正文；
//                    搜索引擎、微信、社交预览等白名单直通。
//
// 诚实边界：无头浏览器（真实 Chrome 内核）能执行 JS，可越过本门——
//          对付它靠 Vercel Firewall 的 Bot Protection 启发式挑战（控制台开启）。
import { next } from '@vercel/functions';

/** 白名单 UA 子串（小写匹配）：搜索引擎 + 微信 + 社交预览 + 可用性监控 */
const ALLOWED_UA = [
  // 搜索引擎（保留收录：仅已提交站长平台的三家）
  'googlebot',
  'bingbot',
  'baiduspider',
  // AI 搜索/引用爬虫（2026-09-11 方案 B：放行，让 ChatGPT/Perplexity/Gemini 引用本站；
  // 它们无 JS 能力，必须在 middleware 层直通才能读到正文）
  'oai-searchbot',
  'chatgpt-user',
  'perplexitybot',
  'google-extended',
  // 注意：360Spider/Sogou/YisouSpider/Shenma 已于 2026-09-11 移除——
  // 其站长平台需 ICP 备案，用户决定不提交；留白名单只是伪造 UA 的攻击面
  'yandexbot',
  'duckduckbot',
  'applebot',
  'mojeekbot',
  // 微信内置浏览器与链接卡片预览抓取器（中文用户分享主渠道，必须直通）
  'micromessenger',
  // 社交平台链接预览
  'twitterbot',
  'facebookexternalhit',
  'telegrambot',
  'slackbot',
  'linkedinbot',
  'discordbot',
  'whatsapp',
  'line/',
  // 可用性监控
  'uptimerobot',
  'pingdom',
  'betteruptime',
  'vercel-bot',
  // 搜索引擎的附属抓取器（Bing 抓 favicon/预览图用 BingPreview，须放行否则搜索结果无图标）
  'bingpreview',
];

const COOKIE_NAME = 'zg_js';
const COOKIE_MAX_AGE = 7 * 24 * 3600; // 7 天免校验

function hasValidCookie(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.split(';').some((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
}

function isAllowedBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return ALLOWED_UA.some((token) => lower.includes(token));
}

/** 挑战页：内联 JS 设置 cookie 后原地重载；无 JS 的客户端停留在此，拿不到正文 */
function challengePage(): Response {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>正在验证浏览器环境…</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#333;background:#fafafa}</style>
</head>
<body>
<div style="text-align:center;padding:24px"><p>正在验证浏览器环境，请稍候…</p><p style="font-size:13px;color:#888">如长时间停留在此页面，请确认浏览器已启用 JavaScript 与 Cookie。</p></div>
<script>
(function () {
  document.cookie = '${COOKIE_NAME}=1; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax';
  var u = new URL(location.href);
  var n = parseInt(u.searchParams.get('zg') || '0', 10) + 1;
  u.searchParams.set('zg', String(n));
  location.replace(u.pathname + u.search);
})();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** 循环保护：无 cookie 且已重试两次 → 提示启用 Cookie，避免死循环 */
function cookieNotice(): Response {
  return new Response(
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>需要启用 Cookie</title></head><body><p>本站需要浏览器启用 Cookie 才能访问。请在浏览器设置中允许 Cookie 后<a href="/">重新访问</a>。</p></body></html>',
    {
      status: 403,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;

  // 跳过：API 函数、带扩展名的静态资源（assets/img/sitemap.xml/robots.txt 等）
  if (pathname.startsWith('/api/')) return next();
  if (/\.[^/]+$/.test(pathname)) return next();

  const ua = request.headers.get('user-agent') ?? '';

  // 白名单直通（搜索引擎收录、微信分享、社交预览、监控探活）
  if (ua && isAllowedBot(ua)) return next();

  // iframe/embed 嵌入式导航直接放行：第三方 iframe 里 cookie 常被浏览器拦截，
  // 挑战页会死循环（fuel-records App 依赖此行为）。Sec-Fetch-Dest 是浏览器
  // 自动附加的请求元数据（JS 无法伪造），脚本用 curl 伪造也过不了前面的
  // Bot Protection 挑战层，因此不损失防护。
  const secFetchDest = request.headers.get('sec-fetch-dest');
  if (secFetchDest === 'iframe' || secFetchDest === 'embed') return next();

  // 已有有效 cookie → 放行
  if (hasValidCookie(request)) return next();

  // 无 JS 能力的客户端 → 挑战页（拿不到正文）；重试两次仍无 cookie → 提示
  const retry = parseInt(url.searchParams.get('zg') ?? '0', 10);
  if (Number.isFinite(retry) && retry >= 2) return cookieNotice();
  return challengePage();
}
