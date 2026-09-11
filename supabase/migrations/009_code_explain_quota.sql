-- 每 IP 每日 AI 追问限额计数（api/explain.ts 的 withinQuota 使用）
-- 表缺失时函数自动跳过限额（try/catch 优雅降级），本迁移可后补执行
create table if not exists code_explain_quota (
  ip text not null,
  day text not null,
  count integer not null default 0,
  primary key (ip, day)
);

alter table code_explain_quota enable row level security;
