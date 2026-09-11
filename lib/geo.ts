import {getSupabaseAdmin} from './supabase-admin';

const CACHE_TTL_MS = 30 * 86_400_000; // 缓存 30 天（IP 归属很少变动）

/**
 * 地理补齐：Vercel 头缺省/市时（数据中心、代理出口、部分 NAT 网段），
 * 用 ip-api.com 免费接口补查，结果按 IP 缓存到 Supabase ip_geo 表。
 * 同 IP 只查一次第三方，失败静默回退（保持 null，页面显示「未知」）。
 * 注意：会向第三方发送访客 IP（仅用于地理定位，标准做法）。
 */
export async function enrichGeo(
  ip: string,
): Promise<{region: string | null; city: string | null}> {
  if (!ip) {
    return {region: null, city: null};
  }
  const admin = getSupabaseAdmin();

  // 缓存命中（30 天内）
  try {
    const {data: cached} = await admin
      .from('ip_geo')
      .select('region,city,cached_at')
      .eq('ip', ip)
      .maybeSingle();
    if (cached && Date.now() - Date.parse(cached.cached_at as string) < CACHE_TTL_MS) {
      return {region: cached.region ?? null, city: cached.city ?? null};
    }
  } catch {
    // 缓存表不存在（007 未执行）时直接走查询路径
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
      signal: AbortSignal.timeout(2500),
    });
    const data = (await res.json()) as {status?: string; country?: string; regionName?: string; city?: string};
    if (data?.status === 'success') {
      const row = {
        ip,
        country: data.country ?? null,
        region: data.regionName ?? null,
        city: data.city ?? null,
        cached_at: new Date().toISOString(),
      };
      try {
        await admin.from('ip_geo').upsert(row);
      } catch {
        // 缓存写入失败不影响本次返回
      }
      return {region: row.region, city: row.city};
    }
  } catch {
    // 第三方不可用（限流/网络）静默回退
  }
  return {region: null, city: null};
}
