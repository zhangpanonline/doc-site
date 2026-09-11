-- 统计 v7 配套：IP 地理缓存表（lib/geo.ts 补齐省/市后按 IP 缓存 30 天）
-- 用法：Supabase 控制台 → SQL Editor → 整体执行（幂等）。

create table if not exists public.ip_geo (
  ip text primary key,
  country text,
  region text,
  city text,
  cached_at timestamptz not null default now()
);

alter table public.ip_geo enable row level security;
-- 仅服务角色可读写（Vercel 函数使用 service_role，自动绕过 RLS；匿名不可访问）
