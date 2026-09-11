-- AI 代码解释缓存表（/api/explain 使用）
-- 同一段代码只调用一次 AI，结果按 code_hash 缓存，全体学员共享。
-- 用法：Supabase 控制台 → SQL Editor → 整体执行（幂等）。

create table if not exists public.code_explanations (
  code_hash text primary key,
  lang text,
  code_preview text,
  explanation text,
  model text,
  created_at timestamptz not null default now()
);

alter table public.code_explanations enable row level security;
-- 仅服务角色可读写（Vercel 函数使用 service_role，自动绕过 RLS；匿名不可访问）
