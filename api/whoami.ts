import type {VercelRequest, VercelResponse} from '@vercel/node';
import {getSupabaseAdmin} from '../lib/supabase-admin';
import {parseUA} from '../lib/ua';
import {enrichGeo} from '../lib/geo';

function firstHeader(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

/**
 * 当前访客自述：返回本请求的 IP/地区/浏览器/应用/系统，以及该 IP 的历史统计。
 * 只读不写——/status 页面的访问不计入统计（埋点已跳过该路径），
 * 所以这里的历史不含本次打开本页的动作。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error: 'Method Not Allowed'});
  }

  const ua = firstHeader(req.headers['user-agent']).slice(0, 500);
  const ip =
    firstHeader(req.headers['x-real-ip']) ||
    firstHeader(req.headers['x-forwarded-for']).split(',')[0].trim();

  // 与 track 一致：Vercel 头缺省/市时用第三方补齐（按 IP 缓存 30 天）
  let region = (req.headers['x-vercel-ip-country-region'] as string) ?? null;
  let city = (req.headers['x-vercel-ip-city'] as string) ?? null;
  if (!region || !city) {
    const geo = await enrichGeo(ip);
    region = region ?? geo.region;
    city = city ?? geo.city;
  }

  let history: {count: number; last7: number; first: string; last: string} | null = null;
  try {
    const {data, error} = await getSupabaseAdmin()
      .from('visits')
      .select('created_at')
      .eq('ip', ip);
    if (!error && Array.isArray(data)) {
      const times = data.map(r => Date.parse(r.created_at as string)).sort((a, b) => a - b);
      const weekAgo = Date.now() - 7 * 86_400_000;
      history = {
        count: times.length,
        last7: times.filter(t => t >= weekAgo).length,
        first: new Date(times[0]).toISOString(),
        last: new Date(times[times.length - 1]).toISOString(),
      };
    }
  } catch {
    // 查不到历史（如环境变量未配）时仅回显当前信息
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ip,
    country: req.headers['x-vercel-ip-country'] ?? null,
    region,
    city,
    ...parseUA(ua),
    history,
  });
}
