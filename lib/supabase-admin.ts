import {createClient, SupabaseClient} from '@supabase/supabase-js';

/**
 * 服务端共享的 Supabase 管理员客户端。
 * 仅被 Vercel 函数（api/*.ts）引用，service_role key 永不进入浏览器代码。
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 环境变量（Vercel → Settings → Environment Variables）',
    );
  }
  return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
}
