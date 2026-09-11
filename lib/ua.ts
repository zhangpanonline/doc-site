/**
 * 轻量 User-Agent 解析（无第三方依赖）：识别浏览器、宿主应用、操作系统。
 * 覆盖国内常见环境（微信/QQ/UC/夸克/百度等内置浏览器与主流桌面/移动浏览器）。
 */

export type UaInfo = {browser: string; app: string; os: string};

const APP_RULES: [RegExp, string][] = [
  [/MicroMessenger/i, '微信'],
  [/QQ\/|MQQBrowser|QQBrowser/i, 'QQ'],
  [/aweme|BytedanceWebview/i, '抖音'],
  [/NewsArticle|toutiao/i, '头条'],
  [/Weibo/i, '微博'],
  [/AlipayClient/i, '支付宝'],
  [/MiuiBrowser/i, '小米'],
  [/HuaweiBrowser/i, '华为'],
];

const BROWSER_RULES: [RegExp, string][] = [
  [/MicroMessenger/i, '微信内置浏览器'],
  [/QQBrowser|MQQBrowser/i, 'QQ 浏览器'],
  [/MiuiBrowser/i, '小米浏览器'],
  [/HuaweiBrowser/i, '华为浏览器'],
  [/QuarkPC|Quark/i, '夸克'],
  [/UCBrowser|UCWEB/i, 'UC 浏览器'],
  [/Baidu(?:BoxApp)?\//i, '百度浏览器'],
  [/EdgA?\//i, 'Edge'],
  [/OPR\//i, 'Opera'],
  [/SamsungBrowser/i, '三星浏览器'],
  [/Firefox\//i, 'Firefox'],
  [/Chrome\//i, 'Chrome'],
  [/Version\/.+Safari\//i, 'Safari'],
];

// 顺序敏感：iOS 优先于 Mac（iPhone UA 含 "like Mac OS X"），Android 优先于 Linux
const OS_RULES: [RegExp, string][] = [
  [/iPhone|iPad|iPod/i, 'iOS'],
  [/Android/i, 'Android'],
  [/Windows NT/i, 'Windows'],
  [/Mac OS X|Macintosh/i, 'macOS'],
  [/CrOS/i, 'ChromeOS'],
  [/Linux/i, 'Linux'],
];

function firstMatch(rules: [RegExp, string][], ua: string): string | null {
  for (const [re, name] of rules) {
    if (re.test(ua)) {
      return name;
    }
  }
  return null;
}

export function parseUA(userAgent: string | null | undefined): UaInfo {
  const ua = userAgent ?? '';
  if (!ua) {
    return {browser: '未知', app: '未知', os: '未知'};
  }
  return {
    browser: firstMatch(BROWSER_RULES, ua) ?? '其他',
    app: firstMatch(APP_RULES, ua) ?? '浏览器',
    os: firstMatch(OS_RULES, ua) ?? '其他',
  };
}
