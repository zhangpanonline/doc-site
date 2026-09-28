-- AI 搜索记录扩展：IP 属地 / 浏览器 / 系统 + 缓存 token 拆分 + 费用（分）
-- 用法：Supabase 控制台 → SQL Editor → 整体执行（幂等）。
-- 未执行时 api/ai-search.ts 的埋点 insert 会失败（被 try/catch 吞掉，不影响搜索本身），
-- 但 /status 面板拿不到新字段。

alter table public.ai_search_usage
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists browser text,
  add column if not exists os text,
  add column if not exists prompt_cache_hit_tokens integer not null default 0,
  add column if not exists prompt_cache_miss_tokens integer not null default 0,
  add column if not exists cost_cents bigint not null default 0;

-- ---------- 统计函数更新：visitors 增加 IP/属地/浏览器/系统与费用 ----------
-- 各访客的 IP/属地等取该访客最新一条记录的值（array_agg 按时间倒序取首元素）。

create or replace function public.ai_search_stats()
returns jsonb
language sql
stable
as $$
  with month_start as (
    select (date_trunc('month', now() at time zone 'Asia/Shanghai')::date)::timestamp
             at time zone 'Asia/Shanghai' as m
  ),
  visitor_stats as (
    select coalesce(visitor_id, 'ip:' || ip) as visitor_key,
           (array_agg(ip      order by created_at desc nulls last))[1] as ip,
           (array_agg(region  order by created_at desc nulls last))[1] as region,
           (array_agg(city    order by created_at desc nulls last))[1] as city,
           (array_agg(browser order by created_at desc nulls last))[1] as browser,
           (array_agg(os      order by created_at desc nulls last))[1] as os,
           count(*)::int as requests,
           sum(total_tokens)::int as total_tokens,
           sum(total_tokens) filter (where created_at >= (select m from month_start))::int as month_tokens,
           coalesce(sum(cost_cents), 0)::bigint as total_cost_cents,
           coalesce(sum(cost_cents) filter (where created_at >= (select m from month_start)), 0)::bigint as month_cost_cents,
           min(created_at) as first_seen,
           max(created_at) as last_seen
    from public.ai_search_usage
    group by 1
  )
  select jsonb_build_object(
    'total_tokens',      (select coalesce(sum(total_tokens), 0)::int from public.ai_search_usage),
    'month_tokens',      (select coalesce(sum(total_tokens) filter (where created_at >= (select m from month_start)), 0)::int
                          from public.ai_search_usage),
    'total_cost_cents',  (select coalesce(sum(cost_cents), 0)::bigint from public.ai_search_usage),
    'month_cost_cents',  (select coalesce(sum(cost_cents) filter (where created_at >= (select m from month_start)), 0)::bigint
                          from public.ai_search_usage),
    'total_requests',    (select count(*)::int from public.ai_search_usage),
    'month_requests',    (select count(*) filter (where created_at >= (select m from month_start))::int
                          from public.ai_search_usage),
    'visitors_total',    (select count(*)::int from visitor_stats),
    'visitors_month',    (select count(*)::int from visitor_stats
                          where (select m from month_start) is null
                             or last_seen >= (select m from month_start)),
    -- 按独立访客的总/月用量与费用（top 50；visitor key 截断 8 位匿名化，IP 完整输出——
    -- /status 有 STATUS_TOKEN 口令保护，仅站主可见）
    'visitors',          (select coalesce(jsonb_agg(jsonb_build_object(
                             'visitor', left(visitor_key, 8),
                             'ip', ip,
                             'region', region,
                             'city', city,
                             'browser', browser,
                             'os', os,
                             'requests', requests,
                             'total_tokens', total_tokens,
                             'month_tokens', month_tokens,
                             'total_cost_cents', total_cost_cents,
                             'month_cost_cents', month_cost_cents,
                             'last', last_seen) order by total_tokens desc), '[]'::jsonb)
                          from (select * from visitor_stats order by total_tokens desc limit 50) t),
    'updated_at', now()
  );
$$;

-- 只允许服务角色调用（与 visit_stats() 一致）
revoke all on function public.ai_search_stats() from public, anon;
grant execute on function public.ai_search_stats() to service_role;
