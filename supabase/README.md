# 访问统计（/status）部署步骤

架构：`src/theme/Root.tsx` 埋点 → Vercel 函数 `api/track.ts` 读请求头里的 IP/地区 → 写入 Supabase `visits` 表；`/status` 页 → `api/status.ts` → `visit_stats()` 一次 RPC 聚合展示。

## 1. Supabase 建表（一次性）

Supabase 控制台 → SQL Editor → 粘贴执行 `migrations/001_visits.sql`（幂等，可重复执行）。

与 fuel-records 共用同一个 Supabase 项目：本功能只读写自己的 `visits` 表与
`visit_stats()` 函数（fuel-records 的表为 users/fuel_records/expenses/
expense_categories/vehicles，无命名冲突），互不干扰。
注意共享免费档配额；service_role key 权限为整库级。

## 2. Vercel 环境变量

Vercel → 项目 doc → Settings → Environment Variables，添加：

| 变量 | 值来源 | 说明 |
|---|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | 形如 `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | 同上页 → service_role | 仅函数服务端使用，绝不进浏览器 |
| `STATUS_TOKEN`（可选） | 自定 | 设置后 /status 需输入此口令 |

本地开发（`vercel dev`）时可用 `vercel env pull` 拉到 `.env.local`。

## 3. 重新部署

`pnpm build` 通过后推送到 Vercel 即可（`vercel --prod` 或 push 触发）。首次部署后打开任意页面即开始记录，`/status` 查看统计。
