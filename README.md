# AI 大全栈 · 配套交互课程

渡一《AI 大全栈》学习路线的配套交互课程站，基于 [Docusaurus](https://docusaurus.io/) 构建，部署于 [doc.zhangpan.online](https://doc.zhangpan.online)（Vercel）。

## 站点结构

- `docs/`：课程内容（docs-only 单实例，文件路径即站点路由）
  - 6 个单元：`agents/`（Agents 应用开发能力）、`backend/`（后端开发能力）、`devops/`（运维和云计算能力）、`ai-coding/`（高效 AI 编程能力）、`fullstack/`（企业级全栈项目）、`career/`（就业指导）
  - `common/`：公共板块（多单元共用课程；单元侧边栏以 link 项交叉引用）
- `docs/agents/python/`：Python 语言核心课程，目录对齐渡一官方 32 节（`01.必看导言` … `32.断点调试`）
- `teach/lessons/`：每章配套互动教学课程（分级测验 + 源课程作业考核 + 面试实战）
- `teach/reference/`：每章配套速查表（发布副本在 `static/teach/`，改动后需重新同步）
- `sidebars.ts`：7 个板块的侧边栏配置（课程一级 → 节二级）

## 本地开发

要求 Node ≥ 22（建议 `nvm use 22`）。

```bash
pnpm install
pnpm start     # 开发服务器（端口 1004）
```

## 构建

```bash
pnpm build     # 产物在 build/ 目录
```

## 部署

托管于 Vercel（推送 main 分支自动部署）；`vercel.json` 内含旧 `/python/*` 路由的 301 重定向规则。

## 课程源

- 官方课程源：gitee `dev-edu` 组织（如 `python-for-agent`、`database`）
- 互动课程生成约定：见 `teach/` 工作区（`MISSION.md` / `NOTES.md`）
