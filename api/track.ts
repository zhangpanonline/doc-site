import {randomUUID} from 'node:crypto';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {getSupabaseAdmin} from '../lib/supabase-admin';
import {enrichGeo} from '../lib/geo';

function firstHeader(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

/**
 * 访问埋点：页面每次浏览 POST /api/track，记录访客 IP、地区与页面路径。
 * IP 与地理位置取自 Vercel 注入的请求头（x-real-ip / x-vercel-ip-*），
 * 不依赖任何第三方服务，浏览器端也拿不到自己的 IP。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({error: 'Method Not Allowed'});
  }

  const ua = firstHeader(req.headers['user-agent']).slice(0, 500);
  // 简单爬虫过滤：不污染统计
  if (/bot|crawl|spider|slurp|preview|curl|wget/i.test(ua)) {
    return res.status(200).json({ok: true, skipped: 'bot'});
  }

  // x-real-ip 由 Vercel 注入；x-forwarded-for 取最左侧为客户端地址
  const ip =
    firstHeader(req.headers['x-real-ip']) ||
    firstHeader(req.headers['x-forwarded-for']).split(',')[0].trim();

  let path = '/';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
    if (typeof body.path === 'string' && body.path.startsWith('/')) {
      path = body.path.slice(0, 200);
    }
  } catch {
    // body 解析失败时按根路径记录
  }

  // 访客去重：匿名 visitor_id cookie（一年有效）。代理换 IP 时同一访客不虚增
  let visitorId = req.cookies?.visitor_id as string | undefined;
  if (!visitorId) {
    visitorId = randomUUID();
    res.setHeader('Set-Cookie', `visitor_id=${visitorId}; Max-Age=31536000; Path=/; SameSite=Lax`);
  }

  const country = (req.headers['x-vercel-ip-country'] as string) ?? null;
  let region = (req.headers['x-vercel-ip-country-region'] as string) ?? null;
  let city = (req.headers['x-vercel-ip-city'] as string) ?? null;
  // Vercel 地理库缺省/市（数据中心、代理出口、部分 NAT 网段）时用第三方补齐（按 IP 缓存 30 天）
  if (!region || !city) {
    const geo = await enrichGeo(ip);
    region = region ?? geo.region;
    city = city ?? geo.city;
  }

  try {
    await getSupabaseAdmin().from('visits').insert({
      ip,
      visitor_id: visitorId,
      country,
      region,
      city,
      path,
      user_agent: ua,
      referer: firstHeader(req.headers.referer).slice(0, 500) || null,
    });
    return res.status(200).json({ok: true});
  } catch (err) {
    console.error('[track] insert failed:', err);
    return res.status(500).json({error: 'track failed'});
  }
}
