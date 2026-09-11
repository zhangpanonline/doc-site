-- 统计页 v4：访问路径按最近访问排序（含最后访问时间）
-- 用法：Supabase 控制台 → SQL Editor → 整体执行（幂等；替代 003，其余逻辑不变）
--
-- 变更点（相对 003）：paths 聚合增加 last_seen（max(created_at)），
-- 排序改为最近访问降序，输出新增 last 字段

create or replace function public.visit_stats(p_days int default 30, p_top int default 200)
returns jsonb
language sql
stable
as $$
  with day_bounds as (
    select (date_trunc('day', now() at time zone 'Asia/Shanghai'))::date as today
  ),
  daily as (
    select (b.today - (p_days - 1) + g.i) as d, count(v.id)::int as c
    from day_bounds b
    cross join generate_series(0, p_days - 1) as g(i)
    left join public.visits v
      on v.created_at >= (b.today - (p_days - 1) + g.i) at time zone 'Asia/Shanghai'
     and v.created_at <  ((b.today - (p_days - 1) + g.i) + 1) at time zone 'Asia/Shanghai'
    group by 1
  ),
  regions as (
    select coalesce(region, '未知') as region, count(*)::int as c
    from public.visits
    group by 1
  ),
  ips as (
    select ip,
           count(*)::int as c,
           min(created_at) as first_seen,
           max(created_at) as last_seen,
           count(*) filter (where created_at >= now() - interval '7 days')::int as last7,
           (array_agg(country order by created_at desc) filter (where country is not null))[1] as country,
           (array_agg(region order by created_at desc) filter (where region is not null))[1] as region,
           (array_agg(city order by created_at desc) filter (where city is not null))[1] as city,
           (array_agg(user_agent order by created_at desc) filter (where user_agent is not null))[1] as user_agent
    from public.visits
    group by ip
    order by c desc
    limit p_top
  ),
  paths as (
    select path, count(*)::int as c, max(created_at) as last_seen
    from public.visits
    group by path
    order by last_seen desc
    limit 20
  )
  select jsonb_build_object(
    'total',      (select count(*)::int from public.visits),
    'unique_ips', (select count(distinct ip)::int from public.visits),
    'today',      (select count(*)::int from public.visits
                   where created_at >= date_trunc('day', now() at time zone 'Asia/Shanghai')),
    'new_ips_today', (
      select count(*)::int from (
        select 1 from public.visits
        group by ip
        having min(created_at) >= date_trunc('day', now() at time zone 'Asia/Shanghai')
      ) t
    ),
    'new_regions_today', (
      select count(*)::int from (
        select 1 from public.visits
        group by coalesce(region, '未知')
        having min(created_at) >= date_trunc('day', now() at time zone 'Asia/Shanghai')
      ) t
    ),
    'daily',      (select coalesce(jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d), '[]'::jsonb) from daily),
    'regions',    (select coalesce(jsonb_agg(jsonb_build_object('region', region, 'count', c) order by c desc), '[]'::jsonb) from regions),
    'ips',        (select coalesce(jsonb_agg(jsonb_build_object('ip', ip, 'count', c, 'first', first_seen, 'last', last_seen, 'last7', last7, 'country', country, 'region', region, 'city', city, 'user_agent', user_agent) order by c desc), '[]'::jsonb) from ips),
    'paths',      (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'count', c, 'last', last_seen) order by last_seen desc), '[]'::jsonb) from paths),
    'updated_at', now()
  );
$$;

-- 只允许服务角色调用（create or replace 不改变既有权限，重复执行保证一致）
revoke execute on function public.visit_stats from public, anon, authenticated;
grant execute on function public.visit_stats to service_role;
