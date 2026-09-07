# Mission: 为《数据库》课程全部章节生成文档与互动教学课程

## Why

用户文档站的公共板块（`/common/`）将沉淀渡一《数据库》课程（源：`gitee.com/dev-edu/database`，袁进，官方路径「AI大全栈 / 通识 / 数据库」），与 Python 语言核心课程同款流程。站点已有数据库占位页（`docs/common/database/`）。源课程 7 节：PostgreSQL安装 / DDL / 表间关系 / DML / 事务 / 索引 / 拓展知识（其中 03/06/07 无作业）。

用户决定（2026-09-07）：按 Python 课程的既定模板，为每一节生成站点文档（**作业部分移除**）与互动教学课程。确认方案：课程页编号用 `db-0001~db-0007`（= 官方节号，避开 Python 的 0003–0032）；SQL 验证用 Docker postgres scratch 库实际执行；模板全量执行（分级测验 9 题 + 作业改编最终考核 + 面试实战 6 题中文来源 + 速查表）。

## Success looks like

- `docs/common/database/` 下 7 个 mdx（课件内容、无作业），`_category_.json` label「数据库」，侧边栏 7 节带编号，公共页课程行指向课程首页
- `teach/lessons/db-0001-PostgreSQL安装.html` … `db-0007-拓展知识.html`（编号 = 官方节号）
- 每节课程：本课目标 → 知识讲解 → 分级测验（🌱/🌿/🎯 各 3 道）→ 最终考核（源作业改编、demo 内嵌；03/06/07 无作业 → 等效考核，先例 Python 26 章）→ 💼 面试实战（⚡/🔥/🧠 各 2 道共 6 道，附牛客/CSDN 等中文来源链接）→ 巩固延伸
- 每节速查表 `teach/reference/<节名>速查表.html`，可打印
- 每节文档末尾 `<a>` 课程入口（原生 `<a>` 标签约定）
- 同步 `static/teach/`，`pnpm build` 绿

## Constraints

- 课程中文、风格与文档站一致；受众 = 网站读者 + 用户自己；课程自包含（作业 demo 内嵌）
- **代码验证（强制）**：所有 SQL（demo、测验题、考核答案）在 Docker postgres scratch 库实际执行验证无 bug
- 外部知识资源只用官方文档（PostgreSQL 官方文档等）；面试题附中文来源链接（牛客/CSDN/博客园/腾讯云等，不自己编）
- 测验只考文档覆盖范围（ZPD）；即时反馈，解释指回文档小节
- 未经用户明确同意不 commit/push

## Out of scope

- Python 语言核心课程（30 章已完成，lessons 0003–0032），不在本 mission 范围
- 数据库课程之外的其他课程
- 源 07.拓展知识 的备份/恢复等仅作文档呈现，不要求可执行环境验证（按课件内容范围）
