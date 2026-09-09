-- 站点访问统计：visits 表 + visit_stats() 聚合函数
-- 用法：Supabase 控制台 → SQL Editor → 整体执行本文件（幂等，可重复执行）

create table if not exists public.visits (
  id bigint generated always as identity primary key,
  ip text not null,
  country text,
  region text,
  city text,
  path text,
  user_agent text,
  referer text,
  created_at timestamptz not null default now()
);

create index if not exists visits_created_at_idx on public.visits (created_at);
create index if not exists visits_ip_idx on public.visits (ip);

-- 开启 RLS 且不建任何策略：匿名/已认证角色一律不可读写，只有服务角色
-- （Vercel 函数用的 service_role key）能绕过 RLS。数据不暴露给浏览器。
alter table public.visits enable row level security;

-- 统计聚合：一次 RPC 返回仪表盘全部数据
--   p_days: 日趋势天数；p_top: IP 明细条数上限
create or replace function public.visit_stats(p_days int default 30, p_top int default 200)
returns jsonb
language sql
stable
as $$
  with daily as (
    select g.d, count(v.id)::int as c
    from generate_series(
           date_trunc('day', now()) - (p_days - 1) * interval '1 day',
           date_trunc('day', now()),
           interval '1 day'
         ) as g(d)
    left join public.visits v
      on v.created_at >= g.d and v.created_at < g.d + interval '1 day'
    group by g.d
  ),
  country_region as (
    select coalesce(country, '未知') as country,
           coalesce(region, '未知') as region,
           count(*)::int as c
    from public.visits
    group by 1, 2
  ),
  countries as (
    select country,
           sum(c)::int as c,
           coalesce(
             jsonb_agg(jsonb_build_object('region', region, 'count', c) order by c desc),
             '[]'::jsonb
           ) as regions
    from country_region
    group by country
  ),
  ips as (
    select ip,
           count(*)::int as c,
           min(created_at) as first_seen,
           max(created_at) as last_seen,
           count(*) filter (where created_at >= now() - interval '7 days')::int as last7,
           (array_agg(country order by created_at desc) filter (where country is not null))[1] as country,
           (array_agg(region order by created_at desc) filter (where region is not null))[1] as region,
           (array_agg(city order by created_at desc) filter (where city is not null))[1] as city
    from public.visits
    group by ip
    order by c desc
    limit p_top
  ),
  paths as (
    select path, count(*)::int as c
    from public.visits
    group by path
    order by c desc
    limit 20
  )
  select jsonb_build_object(
    'total',      (select count(*)::int from public.visits),
    'unique_ips', (select count(distinct ip)::int from public.visits),
    'today',      (select count(*)::int from public.visits where created_at >= date_trunc('day', now())),
    'daily',      (select coalesce(jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d), '[]'::jsonb) from daily),
    'countries',  (select coalesce(jsonb_agg(jsonb_build_object('country', country, 'count', c, 'regions', regions) order by c desc), '[]'::jsonb) from countries),
    'ips',        (select coalesce(jsonb_agg(jsonb_build_object('ip', ip, 'count', c, 'first', first_seen, 'last', last_seen, 'last7', last7, 'country', country, 'region', region, 'city', city) order by c desc), '[]'::jsonb) from ips),
    'paths',      (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'count', c) order by c desc), '[]'::jsonb) from paths),
    'updated_at', now()
  );
$$;

-- 只允许服务角色调用（服务角色本身绕过 RLS）；匿名访问查不到任何行
revoke execute on function public.visit_stats from public, anon, authenticated;
grant execute on function public.visit_stats to service_role;
