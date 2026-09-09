import type {VercelRequest, VercelResponse} from '@vercel/node';
import {getSupabaseAdmin} from '../lib/supabase-admin';

function firstValue(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

/**
 * 统计接口：GET /api/status 返回 /status 仪表盘所需的全部聚合数据。
 * 数据由 Supabase 内 visit_stats() 函数一次 RPC 产出（日趋势/国家地区/IP 明细/路径 Top）。
 * 可选保护：设置 STATUS_TOKEN 环境变量后，必须带 ?token= 或 Authorization: Bearer 访问。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error: 'Method Not Allowed'});
  }

  const token = process.env.STATUS_TOKEN;
  if (token) {
    const provided =
      firstValue(req.headers.authorization).replace(/^Bearer\s+/i, '') ||
      firstValue(req.query.token as string | string[]);
    if (provided !== token) {
      return res.status(401).json({error: 'unauthorized'});
    }
  }

  try {
    const {data, error} = await getSupabaseAdmin().rpc('visit_stats', {
      p_days: 30,
      p_top: 200,
    });
    if (error) {
      throw error;
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[status] query failed:', err);
    return res.status(500).json({error: 'status query failed'});
  }
}
