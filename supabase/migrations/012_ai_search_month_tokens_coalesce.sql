-- AI 搜索统计修复：跨月边界「本月 Token」为 NULL 导致 /status 渲染崩溃
-- 根因：visitor_stats.month_tokens = sum(total_tokens) filter (where created_at >= 本月起始)，
--       当访客当月零记录时 sum 返回 NULL（非 0），前端 fmt(null) 抛 TypeError。
-- 修复：month_tokens 加 coalesce(..., 0)（其余逻辑与 011 完全一致）。
-- 用法：Supabase 控制台 → SQL Editor → 整体执行（幂等）。
-- 说明：前端 fmt 已做 null 兜底，本迁移未执行时页面不崩、仅本月 Token 显示 0 与实际一致。

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
           coalesce(sum(total_tokens) filter (where created_at >= (select m from month_start)), 0)::int as month_tokens,
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

-- 只允许服务角色调用（与 011 一致）
revoke all on function public.ai_search_stats() from public, anon;
grant execute on function public.ai_search_stats() to service_role;
