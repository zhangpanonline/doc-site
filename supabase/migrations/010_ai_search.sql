-- AI 搜索（RAG 问答）：token 用量埋点 + 每 IP 配额 + 用量统计函数
-- 用法：Supabase 控制台 → SQL Editor → 整体执行（幂等）。
-- 表未创建时 api/ai-search.ts 配额检查会优雅降级（内存限流），埋点失败不影响搜索。

-- ---------- token 用量表（/status「AI 搜索」面板的数据源） ----------

create table if not exists ai_search_usage (
  id bigint generated always as identity primary key,
  ip text not null,
  visitor_id text,                       -- 独立访客（/api/track 同款匿名 cookie，无 cookie 时为 null）
  query text,                            -- 搜索问题（截断 200 字，便于排障与内容回顾）
  model text,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_search_usage_created_at_idx on ai_search_usage (created_at desc);
create index if not exists ai_search_usage_visitor_id_idx on ai_search_usage (visitor_id);
alter table ai_search_usage enable row level security;

-- ---------- 配额表（api/ai-search.ts 的 consumeQuota 使用） ----------
-- bucket：'day:YYYY-MM-DD'（每日限额）/'min:YYYY-MM-DDTHH:mm'（每分钟防刷），上海时区
-- 写入方式：upsert {count:1} ignoreDuplicates 占位 → 读回计数判断，无读改写竞态

create table if not exists ai_search_quota (
  ip text not null,
  bucket text not null,
  count integer not null default 0,
  primary key (ip, bucket)
);

alter table ai_search_quota enable row level security;

-- ---------- 用量统计函数（/api/status 调用） ----------

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
           count(*)::int as requests,
           sum(total_tokens)::int as total_tokens,
           sum(total_tokens) filter (where created_at >= (select m from month_start))::int as month_tokens,
           min(created_at) as first_seen,
           max(created_at) as last_seen
    from public.ai_search_usage
    group by 1
  )
  select jsonb_build_object(
    'total_tokens',      (select coalesce(sum(total_tokens), 0)::int from public.ai_search_usage),
    'month_tokens',      (select coalesce(sum(total_tokens) filter (where created_at >= (select m from month_start)), 0)::int
                          from public.ai_search_usage),
    'total_requests',    (select count(*)::int from public.ai_search_usage),
    'month_requests',    (select count(*) filter (where created_at >= (select m from month_start))::int
                          from public.ai_search_usage),
    'visitors_total',    (select count(*)::int from visitor_stats),
    'visitors_month',    (select count(*)::int from visitor_stats
                          where (select m from month_start) is null
                             or last_seen >= (select m from month_start)),
    -- 按独立访客的总/月用量（top 50；key 截断 8 位匿名化，不输出完整 IP/visitor_id）
    'visitors',          (select coalesce(jsonb_agg(jsonb_build_object(
                             'visitor', left(visitor_key, 8),
                             'requests', requests,
                             'total_tokens', total_tokens,
                             'month_tokens', month_tokens,
                             'last', last_seen) order by total_tokens desc), '[]'::jsonb)
                          from (select * from visitor_stats order by total_tokens desc limit 50) t),
    'updated_at', now()
  );
$$;

-- 只允许服务角色调用（与 visit_stats() 一致）
revoke execute on function public.ai_search_stats from public, anon, authenticated;
grant execute on function public.ai_search_stats to service_role;
