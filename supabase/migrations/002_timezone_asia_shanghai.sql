-- 访问统计时区修复：日界从 UTC 改为 Asia/Shanghai
-- 背景：001 版本的「今日」与 30 天日趋势按 UTC 分桶，北京时间的 0~8 点
-- 「今日访问」会显示为空/偏低。本文件用 create or replace 重写 visit_stats()。
-- 用法：Supabase 控制台 → SQL Editor → 整体执行（幂等，可重复执行）。
--
-- 注意：daily 的桶用 date 类型输出——timestamptz 经 PostgREST 会序列化成 UTC
-- 时刻（上海 0 点 = 前一日 16:00 UTC），前端取前 10 位会错一天；date 类型
-- 序列化后取前 10 位仍是正确日期。

create or replace function public.visit_stats(p_days int default 30, p_top int default 200)
returns jsonb
language sql
stable
as $$
  with day_bounds as (
    select (date_trunc('day', now() at time zone 'Asia/Shanghai'))::date as today
  ),
  daily as (
    -- 用整数序列计算日期，全程 date 算术（generate_series(date,date,interval)
    -- 会解析到 timestamptz 重载，导致 g.d + 1 报 42883）
    select (b.today - (p_days - 1) + g.i) as d, count(v.id)::int as c
    from day_bounds b
    cross join generate_series(0, p_days - 1) as g(i)
    left join public.visits v
      on v.created_at >= (b.today - (p_days - 1) + g.i) at time zone 'Asia/Shanghai'
     and v.created_at <  ((b.today - (p_days - 1) + g.i) + 1) at time zone 'Asia/Shanghai'
    group by 1
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
    'today',      (select count(*)::int from public.visits
                   where created_at >= date_trunc('day', now() at time zone 'Asia/Shanghai')),
    'daily',      (select coalesce(jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d), '[]'::jsonb) from daily),
    'countries',  (select coalesce(jsonb_agg(jsonb_build_object('country', country, 'count', c, 'regions', regions) order by c desc), '[]'::jsonb) from countries),
    'ips',        (select coalesce(jsonb_agg(jsonb_build_object('ip', ip, 'count', c, 'first', first_seen, 'last', last_seen, 'last7', last7, 'country', country, 'region', region, 'city', city) order by c desc), '[]'::jsonb) from ips),
    'paths',      (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'count', c) order by c desc), '[]'::jsonb) from paths),
    'updated_at', now()
  );
$$;

-- 只允许服务角色调用（create or replace 不改变既有权限，重复执行保证一致）
revoke execute on function public.visit_stats from public, anon, authenticated;
grant execute on function public.visit_stats to service_role;
