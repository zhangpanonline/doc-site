// Vercel Routing Middleware —— 全站密码门 + JS 挑战门（加强层）
//
// 策略（与 static/robots.txt、vercel.json 防火墙规则分工）：
//   robots.txt     ：君子协定层，只拦遵守协议的爬虫
//   vercel.json    ：WAF 层，脚本库 UA / 无 UA 请求 → challenge
//   本文件         ：路由层，两层门按环境变量切换：
//                    ① 设置了 STATUS_TOKEN（2026-11-09，与 /status 数据口令同源）：
//                       普通浏览器访问任何页面先过密码页；cookie 只存 SHA-256 摘要、
//                       服务端常量时间比对，密码本身不进 cookie/URL/请求体。
//                    ② 未设置 STATUS_TOKEN：文档页必须持 zg_js cookie 才放行，
//                       无 JS 执行能力的客户端（curl/脚本/朴素爬虫）拿不到正文；
//                       搜索引擎、微信、社交预览等白名单直通。
//   豁免（2026-11-09 用户决定）：白名单爬虫（搜索引擎/AI 搜索/社交预览）直通，
//                    不要求密码。
//   2026-11-10 用户追加：iframe/App 内嵌（fuel_records WebView）也要密码——
//                    密码门不再豁免 iframe；密码 cookie 用 SameSite=None; Secure
//                    （跨站 iframe 里才能写入），App 侧已同步开启第三方 cookie。
//                    注意：iframe 豁免仅在「未设 STATUS_TOKEN 的 JS 挑战门」下保留
//                    （那条路径会自动重载，iframe 无 cookie 会死循环）。
//   2026-11-10 用户反馈「微信里不用输密码就能进」：根因是微信内置浏览器 UA 与
//                    微信预览抓取器同为 MicroMessenger，被爬虫白名单整体放行。
//                    现拆成两组：服务端抓取类（ALLOWED_BOTS，密码门也直通）与
//                    应用内浏览器（IN_APP_BROWSER_UA，密码门下必须输密码）。
//
// 诚实边界：无头浏览器（真实 Chrome 内核）能执行 JS，可越过本门——
//          对付它靠 Vercel Firewall 的 Bot Protection 启发式挑战（控制台开启）。
import { next } from '@vercel/functions';

/** 服务端抓取类 UA 子串（小写匹配）：搜索引擎 + AI 搜索 + 社交预览 + 可用性监控。
 *  这些客户端不向用户渲染页面，全站密码门下仍直通（SEO 收录、分享卡片不受影响）。 */
const ALLOWED_BOTS = [
  // 搜索引擎（保留收录：仅已提交站长平台的三家）
  'googlebot',
  'bingbot',
  'baiduspider',
  // AI 搜索/引用爬虫（2026-09-11 方案 B：放行，让 ChatGPT/Perplexity/Gemini 引用本站；
  // 它们无 JS 能力，必须在 middleware 层直通才能读到正文）
  'oai-searchbot',
  'chatgpt-user',
  'perplexitybot',
  'perplexity-user',
  'google-extended',
  // 注意：360Spider/Sogou/YisouSpider/Shenma 已于 2026-09-11 移除——
  // 其站长平台需 ICP 备案，用户决定不提交；留白名单只是伪造 UA 的攻击面
  'yandexbot',
  'duckduckbot',
  'applebot',
  'mojeekbot',
  // 社交平台链接预览
  'twitterbot',
  'facebookexternalhit',
  'telegrambot',
  'slackbot',
  'linkedinbot',
  'discordbot',
  'whatsapp',
  // 可用性监控
  'uptimerobot',
  'pingdom',
  'betteruptime',
  'vercel-bot',
  // 搜索引擎的附属抓取器（Bing 抓 favicon/预览图用 BingPreview，须放行否则搜索结果无图标）
  'bingpreview',
];

/** 应用内浏览器 UA（微信/LINE 等）：真实用户在浏览，不是爬虫。
 *  全站密码门启用时必须输密码——曾因与预览抓取器共用 MicroMessenger UA
 *  被整体放行，导致微信里点链接不用密码直接进（2026-11-10 用户反馈）。
 *  仅在未设 STATUS_TOKEN 的 JS 挑战门路径放行（保持原「分享主渠道直通」）。 */
const IN_APP_BROWSER_UA = ['micromessenger', 'line/'];

const COOKIE_NAME = 'zg_js';
const COOKIE_MAX_AGE = 7 * 24 * 3600; // 7 天免校验

// ── 全站密码门（2026-11-09）──────────────────────────────────────────────
// 密码 = 环境变量 STATUS_TOKEN（与 /status 数据口令同源，用户决定复用）。
// 浏览器输入密码 → 前端算 SHA-256 存 cookie zg_pw → 服务端与
// sha256(STATUS_TOKEN) 常量时间比对。密码明文不出现在 cookie / URL / 请求体。
const PASS_COOKIE = 'zg_pw';
const PASS_MAX_AGE = 30 * 24 * 3600; // 30 天免输

function constantTimeEqual(a: string, b: string): boolean {
  // 逐字符比对存在时序侧信道：cookie 值本身就是「通行证」（sha256 摘要），
  // 早退比较会让攻击者逐位爆破摘要、绕过密码，必须常量时间。
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 模块级缓存：每个边缘实例只算一次 */
let passHashCache: Promise<string> | null = null;
function sitePassHash(): Promise<string> | null {
  const token = process.env.STATUS_TOKEN;
  if (!token) return null;
  passHashCache ??= sha256Hex(token);
  return passHashCache;
}

function passCookieValue(request: Request): string {
  const cookie = request.headers.get('cookie') ?? '';
  const hit = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${PASS_COOKIE}=`));
  return hit ? hit.slice(PASS_COOKIE.length + 1) : '';
}

/** 密码页：自包含内联表单；输入 → SHA-256 → 写 cookie → 原地重载 */
function passwordPage(): Response {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>需要访问密码</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#333;background:#fafafa}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px 28px;width:min(360px,90vw);box-shadow:0 4px 16px rgba(0,0,0,.06);text-align:center}
  h1{font-size:18px;margin:0 0 8px}
  p{font-size:13px;color:#888;margin:0 0 20px}
  input{width:100%;box-sizing:border-box;padding:10px 12px;font-size:15px;border:1px solid #d1d5db;border-radius:8px;outline:none}
  input:focus{border-color:#10a37f}
  button{width:100%;margin-top:12px;padding:10px 12px;font-size:15px;color:#fff;background:#10a37f;border:0;border-radius:8px;cursor:pointer}
  button:hover{background:#0e9271}
  #err{display:none;font-size:13px;color:#dc2626;margin:0 0 12px}
</style>
</head>
<body>
<div class="card">
  <h1>🔒 本站需要访问密码</h1>
  <p id="err">密码不正确，请重试</p>
  <input id="pw" type="password" placeholder="请输入访问密码" autofocus autocomplete="current-password">
  <button id="go">进入</button>
</div>
<script>
(function () {
  // 上次尝试后仍回到本页 = 密码错误（cookie 未通过校验）
  var u = new URL(location.href);
  if (u.searchParams.has('zg_try')) {
    document.getElementById('err').style.display = 'block';
    u.searchParams.delete('zg_try');
    history.replaceState(null, '', u.pathname + u.search);
  }
  function unlock() {
    var pw = document.getElementById('pw').value;
    if (!pw) return;
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw)).then(function (buf) {
      var hex = Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
      document.cookie = '${PASS_COOKIE}=' + hex + '; max-age=${PASS_MAX_AGE}; path=/; samesite=none; secure';
      var v = new URL(location.href);
      v.searchParams.set('zg_try', '1');
      location.replace(v.pathname + v.search);
    });
  }
  document.getElementById('go').addEventListener('click', unlock);
  document.getElementById('pw').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') unlock();
  });
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

function hasValidCookie(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.split(';').some((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
}

function isAllowedBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return ALLOWED_BOTS.some((token) => lower.includes(token));
}

function isInAppBrowser(ua: string): boolean {
  const lower = ua.toLowerCase();
  return IN_APP_BROWSER_UA.some((token) => lower.includes(token));
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

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;
  const passHash = sitePassHash();

  // API 函数：默认跳过（/api/status 自带 STATUS_TOKEN 校验、track 埋点等）。
  // 例外：/api/ai-search 会返回文档片段（等于内容出口），密码门启用时同样要
  // 凭 zg_pw 访问，否则脚本可直接用它绕过密码全站抽内容。
  if (pathname.startsWith('/api/')) {
    if (passHash && pathname.startsWith('/api/ai-search')) {
      const provided = passCookieValue(request);
      if (!provided || !constantTimeEqual(provided, await passHash)) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
    }
    return next();
  }

  // 带扩展名的静态资源（assets/img/sitemap.xml/robots.txt 等）跳过
  if (/\.[^/]+$/.test(pathname)) return next();

  const ua = request.headers.get('user-agent') ?? '';

  // 服务端抓取类直通（搜索引擎收录、社交预览、可用性监控——
  // 2026-11-09 用户决定：全站密码下仍保留直通，SEO 与分享预览不受影响）。
  // 注意这里只放「机器」，应用内浏览器（微信/LINE）不算——见下方密码门。
  if (ua && isAllowedBot(ua)) return next();

  // ── 全站密码门（STATUS_TOKEN 已设置时启用，优先于 JS 挑战门）──────────
  // 2026-11-10 用户决定：iframe/App 内嵌（fuel_records WebView）同样要求密码，
  // 不再豁免。密码页只在提交时重载一次（无自动循环），iframe 里安全；
  // 配套：密码 cookie 用 SameSite=None; Secure（跨站 iframe 可写）+ App 侧
  // WebView 开启第三方 cookie，输一次密码 30 天免输。
  // 微信/LINE 内置浏览器同样要密码（2026-11-10 用户反馈的绕过已修）。
  // 密码页本身需要 JS（crypto.subtle 摘要），无 JS 客户端同样拿不到正文。
  if (passHash) {
    const provided = passCookieValue(request);
    if (provided && constantTimeEqual(provided, await passHash)) return next();
    return passwordPage();
  }

  // ── 以下为「未设 STATUS_TOKEN」的回落路径 ──────────────────────────────

  // 应用内浏览器（微信/LINE）直通：原「中文用户分享主渠道」，JS 挑战门不拦。
  // 密码门启用后走不到这里（上面已要求密码）。
  if (ua && isInAppBrowser(ua)) return next();

  // iframe/embed 嵌入式导航直接放行：第三方 iframe 里 cookie 常被浏览器拦截，
  // 挑战页会自动重载形成死循环（fuel-records App 依赖此行为）。Sec-Fetch-Dest
  // 是浏览器自动附加的请求元数据（JS 无法伪造），脚本用 curl 伪造也过不了
  // 前面的 Bot Protection 挑战层，因此不损失防护。
  const secFetchDest = request.headers.get('sec-fetch-dest');
  if (secFetchDest === 'iframe' || secFetchDest === 'embed') return next();

  // ── JS 挑战门（未设置 STATUS_TOKEN 时的原有行为）───────────────────────
  // 已有有效 cookie → 放行
  if (hasValidCookie(request)) return next();

  // 无 JS 能力的客户端 → 挑战页（拿不到正文）；重试两次仍无 cookie → 提示
  const retry = parseInt(url.searchParams.get('zg') ?? '0', 10);
  if (Number.isFinite(retry) && retry >= 2) return cookieNotice();
  return challengePage();
}
