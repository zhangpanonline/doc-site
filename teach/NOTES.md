# 教学笔记

## ⚠️ 当前阶段约束（2026-09-07 用户指令，重构大改期间）

- **未经用户明确同意，禁止 git commit / push（含打 tag）**；文件编辑照常，提交前先询问用户
- 进度汇报时列出「未提交改动清单」供用户决定提交时机

## 用户偏好（2026-09-05 确认）

- 课程内容使用**中文**，与文档站风格一致
- 受众：**网站读者 + 用户自己**（两者兼顾）
- 范围：**语言核心全部 30 章**（2026-09-05 扩展），每章流程「课程 → 测验 → 源文档作业作为最终考核」；先做 22.事件循环 样板验收
- 课程形态：独立 HTML 页面，文档末尾追加**点击跳转的入口**
- **资源约束**：课程引用的外部资源只用官方文档或主流已验证课程（Real Python、David Beazley 等）；**禁止从中文地区网站搜索/引用**
- **Python 版本 ≥ 3.12**：课程内所有代码以 Python 3.12+ 为准
- **代码校验（强制）**：我生成的任何代码（测验选项、参考答案、内嵌 demo）写入课程前必须**实际运行验证无 bug**

## 每章课程结构（2026-09-06 定，30 章已全量完成）

- 每章一节或数节课（lessons 全局递增编号，0001 已被协程课程占用）
- 课程内顺序：本课目标 → 知识讲解 → **分级测验**（🌱初级·概念 / 🌿中级·应用 / 🎯高级·综合 各 3 道，中高级必须是真难度：推演/陷阱/跨知识点，不允许简单按顺序归类）→ **最终考核**（源文档 `课件.md` 末尾 `## 作业`）→ **💼 面试实战**（2026-09-09 起按《面试实战模板 v2》执行，见 `INTERVIEW-TEMPLATE.md`：5 类题型、弹框单题推进、用户自判、题数弹性）→ 巩固延伸
- 作业引用的 demo 代码必须**内嵌**进考核环节（读者看不到源目录），考核用 quiz 组件实现即时反馈
- 每章配套 `reference/速查表.html`（术语 + 核心步骤，可打印），沿用 sheet-kicker/term-grid/cmp-table 样式
- 26.多线程和多进程 源课程无作业 → 等效考核（已记录）
- 全部新增题目经 `verify_leveled.py`（75 项检查）+ 各章 `verify_NNNN.py` 实际运行校验

## 面试实战模板 v2（2026-09-09 定稿，详见 `INTERVIEW-TEMPLATE.md`）

2026-09-09 追加（用户指示）：**新题一律走题源协议 B**——必须实际联网检索到来源（官方文档 FAQ > 公司技术博客 > 面经平台），标注链接+检索日期+层级；禁止纯自创；场景化改写仍允许（改题干不改考点，注明来源）。存量 37 课的题逐步按 B 路线补新题。

与用户讨论确认，面试实战小节全面改版（旧 36 课按计划分批改造，新课程一律按 v2 生成）：

- 题型改为 5 类（陷阱/机制/代码审查排错/设计选型/AI 辅助场景，可复合），取消中/高/专家难度分组（理解判定由测验+最终考核负责）
- 弹框一次一题：作答框（localStorage 按题缓存，下次回填）→ 点击核对思路拆解 → 用户自判 → 下一题；不显示总数/第几题；结束页「所有题做完了」+ 重新练习
- 展示顺序固定：陷阱→机制→审查排错→设计选型→AI 辅助场景，同类内按职级升序；职级只作小标签
- 题数弹性（每课 4–8 道），不做题池/随机抽取
- 题源协议：AI 环境题源贯穿所有章节（含 Python/数据库基础章）；传统考点可场景化改写并注明；AI 原生题按来源层级；AI 方向题每半年复核时效

## 发布方式（重要）

- 工作区：`teach/`（MISSION/RESOURCES/NOTES/learning-records/lessons/assets/reference）
- 发布目录：`static/teach/`，需要把 `lessons/`、`assets/`、`reference/` **复制**过去，站点构建时才会带上
- 文档入口：`python/语言核心/24.协程.mdx` 末尾 → 链接 `/teach/lessons/0001-python-coroutines.html`
- 不要复制 MISSION.md / RESOURCES.md / NOTES.md / learning-records 到 static（属个人状态，不应发布）
- 若后续章节继续，可写一个同步脚本替代手动复制

## 测验设计原则

- 即时反馈：点击选项立刻显示对错 + 解释，不攒到最后
- 选项长度尽量一致，不通过格式泄露答案
- 题目只考文档已覆盖的知识；「执行顺序预测」是检验协程理解的最高效题型
- 解释要指回《24.协程》对应小节，形成「测验 → 回看文档」的循环
- **选项位置必须打乱（2026-09-09 修复后强制，双保险）**：① 运行时——quiz.js 在每次页面加载与「重新挑战」时随机洗牌选项（正确选项随内容移动、data-correct 实时更新，点击判定实时查询 DOM 顺序），这是主机制；② 创作时——新课程发布前仍跑 `teach/tools/shuffle_options.py`（确定性洗牌，防 JS 失效时静态顺序也非全 A；验收：正确选项内容零漂移 + 各选项占比 20%~30%）。历史事故：批量生成时代 26 节 Python 课答案 100% 在 A 位（学员点 A 可过全部测验）。

## 组件

- `assets/course.css`：共享样式（中文字体栈、卡片、图表、测验、打印样式）
- `assets/quiz.js`：可复用测验组件，纯 vanilla，无依赖；用法见 lessons/0001-python-coroutines.html

## Forest 主题（2026-09-23 用户决策：全站课程统一，含后续课程）

- **适用范围**：所有课程的文档页（docs/ 全站，src/css/forest.css 已全局化，不再限定框架课）+ 所有互动课与速查表（HTML 头部引 `../assets/forest.css`，位于 teach/assets/ 并同步 static/teach/assets/）。**后续新课程默认带 Forest**，无需逐课声明
- 色板：accent `#00997B`、正文 `#363C42`、标题 rgba(0,52,68,.9)；代码块深绿底 `#003444` + token 配色；表格 zebra 全边框；引用绿底左条。无 Typora 装饰（h1 居中双下划线、H2~H6 标签）
- 字体：思源黑体 + JetBrains Mono + 系统回落（**禁止打包自托管字体**）；**暗色模式不受 Forest 影响**（沿用纸墨暗色）
- 实现：文档页走 `src/css/forest.css`（`.docs-wrapper` 作用域）；互动课/速查表走 `teach/assets/forest.css` 在 course.css 之后引用

## Python 框架课程（2026-09-22 完成，24 章；源 gitee dev-edu/python-framework）

渡一框架课（跳 16 长事务和短事务、19 AI导购——源仓库无课件，编号保留跳号）。

> **2026-09-23 用户决策：全站课程结构统一**——存量 Python 30 课 + 数据库 7 课 + PG 16 课已全部改造为框架课形态（移除最终考核、面试实战 5 题、源课件作业回文档纯展示）。「旧 37 课零改动」的早期共识作废。**此后全站互动课程只有一种结构，即本节所述模板。**

### 每章交付物（每章 5 件套 + 收尾）

1. 文档 `docs/agents/python-framework/0X.章名.mdx`——源课件**全量保留**（章节/代码/作业一字不少，仅格式层适配，明显笔误顺带修）+ 该章 duyi-service 代码子目录的**新增代码全文**（薄课件章的真实内容在代码里）；frontmatter：sidebar_position/title/description/displayed_sidebar:agentsFramework；末尾两条原生 `<a>` 入口（互动课 + 速查表）
2. 互动课 `teach/lessons/fw-000X-章名.html`——结构：**本课目标（4 条）→ 知识速览（2-3 张 card）→ 分级测验 9 题（🌱🌿🎯 各 3）→ 💼 面试实战（固定 5 题，五类题型各一，顺序=模板）→ 巩固延伸（深读推荐/速查表/回看课程）**。**无最终考核**（框架课作业只在文档纯展示，不交互化）；**不设 lesson-footer**（2026-09-23 全站规则）；lesson-sub 文案固定「配合《<a>0X.章名</a>》使用 · 预计 15–20 分钟 · 9 道分级测验 + 面试实战」；meta description 以「Python 框架课程 · 章名：…」开头
3. 速查表 `teach/reference/章名速查表.html`——沿用 sheet-kicker/term-grid/cmp-table 样式，末尾 print-badge
4. 洗牌（shuffle_options.py，BASE 已改主检出区）+ 复制同步 `static/teach/`
5. `data/courses.ts` 的 FRAMEWORK_NAMES 追加章名 → `pnpm typecheck` + `pnpm build` 全绿 → 本地 commit

### 格式层坑（已踩，勿重蹈）

- 课件 `<img ... style="zoom:50%">` 会让 MDX 报「style prop 期望映射」——**统一转 markdown 图片语法** `![alt](url)`（远程 resource.duyiedu.com 图片直接保留 URL，不下载）
- 正文里 `<你的域名>` 这类尖括号占位符会被 MDX 当 JSX 标签——用反引号包起来；代码围栏内无需处理
- mermaid 围栏可用（docusaurus.config `markdown.mermaid: true`）；课件 `> [!NOTE]` 引用块原样保留
- 章节名路由自动去数字前缀（Docusaurus 内置），FRAMEWORK_NAMES 用**去前缀章名**

### 面试题源执行口径（B 路线落地形态）

- source 字段格式：`来源：<官方文档名>（"<原文引用>…"）<URL> · 检索 <日期> · 层级：一手（官方文档）+ 源课程《0X.章名》课件（<锚点>）`（2026-09-23 起不用「渡一」品牌前缀）
- 抓取方式：WebFetch 对部分域名（docs.sqlalchemy.org 等）被域名验证挡——**用 curl 抓 HTML + Python 提取正文原文**，引用必须来自实际抓到的文字
- 场景题（任务卡）source 例外：`任务基于《0X.章名》课件 · 来源层级：一手（源课程）场景化`
- 实测政策（2026-09-22 用户指示）：框架课**跳过题内代码 pg16 实测**，每章提交信息注明「按用户指示跳过实测」

### 源码获取（gitee API 会 403 限流）

- **全仓归档一把梭**：`https://gitee.com/dev-edu/python-framework/repository/archive/main.zip`（免限流，含 26 章目录 + 每章 duyi-service 代码 + 14 章的完整代码.zip）
- 解压**必须用 Python zipfile**（macOS unzip 中文名报 Illegal byte sequence）——逐名探测 `cp437→utf-8→gbk`
- 薄课件章（07/09/11/13/14/15/22/25 等）真实内容在 `该章目录/duyi-service/`（「复制覆盖 apps/web-service」）；mdx 编排 = 课件全文 + 与上一章 diff 出的新增代码文件全文
- 推送政策：框架课期间会话不推送，全部完成后用户手动 push（2026-09-22 用户指示）

### 章节-作业对照（纯展示章）

作业仅 01/03/04/05/06/09/25 有；作业放在文档正文「## 作业」节（互动课内无任何作业提示，2026-09-23 起 footer 已全站移除）。

## 数据科学工具包课程（2026-10-02，10 章；源 gitee dev-edu/data-science-tools）

袁进《数据科学工具包》：Jupyter / Numpy（核心概念、数据操作）/ Pandas（数据类型、数据清洗）/ Matplotlib（核心概念、动画、交互式组件）/ Seaborn。

### 与框架课不同的地方（源内容是 Notebook）

- 源课件是 **`课件.ipynb`**（9 个 notebook：87 markdown cell + 134 code cell），不是 `课件.md`；01/02 章是 `课件.md`
- 转换器 `.scratch/ipynb2mdx.py`（一次性，未入库）：markdown cell → MDX 正文；code cell → `python` 围栏（`!` 开头 → `shell` 围栏）；文本输出 → `text` 围栏（strip ANSI）；`image/png` 输出与 `<img src="./assets/x">` → 落盘 `static/img/data-science/` 并改 markdown 图片引用；pandas HTML 表 → markdown 表
- **`$$...$$` 数学块要转 `text` 围栏**：站点没装数学插件，`{` `}` 会被 MDX 当 JSX 表达式直接构建失败（ch04 标准差一节）
- 章节源名含 " - "（如「Numpy - 核心概念」），**文件名统一去掉空格改为 `Numpy-核心概念`**（否则路由出现连续连字符），frontmatter `title` 仍保留源章名原文
- ch07/08/09 的 `demo*.py` 作为「## 本章 demo 脚本」附录进文档

### 交付物与登记

- 文档 `docs/agents/数据科学工具包/0N.章名.mdx`（`displayed_sidebar: agentsDataScience`；末尾两条原生 `<a>` 入口）
- 互动课 `teach/lessons/ds-000N-章名.html`（结构同全站统一模板：目标 → 知识速览 → 9 测验 → 面试实战 → 巩固延伸）
- 速查表 `teach/reference/章名速查表.html`
- `data/courses.ts` 的 `DATASCIENCE_NAMES` + course entry（`key: 'datascience'`、`sidebar: 'agentsDataScience'`）；`docs/agents/index.mdx` 卡片从「筹备中」改为可点击
- 课程首页 `docs/agents/数据科学工具包/index.mdx` 从占位改为真首页；顺手把 `docs/agents/Python框架/index.mdx` 的「筹备中」一并改成真首页（框架课 24 章早已上线但该页仍写筹备中）

### 本课执行的用户指示（2026-10-02）

- **不推送**：本地 commit 即可，整体完成后由用户手动 push（沿用框架课政策）
- **不实测**：题内代码不做实际运行验证（沿用框架课政策），提交信息注明；但选项/答案的语义正确性仍需人工核对
- **面试题数弹性 4–8 道**（不采用框架课的固定 5 题）
- **题源协议 B 照旧**：官方文档一手来源 + URL + 检索日期；子代理若找不到官方来源，改用「源课程场景化」的场景题，禁止编造 URL

## Agents底层逻辑课程（2026-10-02 前置条件完成；源 gitee dev-edu/agent-core）

袁进《Agents底层逻辑》共 **34 章**：01–02 起点 → 03–09 神经网络与训练 → 10–15 Transformer 与大模型 → 16–23 Agent 工程（tools/ReAct/Agent/Skill）→ 24–29 MCP 与子代理 → 30–34 五类工程方法论。

- **详细交接见 `teach/capsule-agents-core.md`（时间胶囊：已完成清单 + 下一步 + 已踩的坑 + 源课件重取方法）**
- 已完成：34 章文档（含 13 章「本章代码」附录、11 张图落盘）、课程登记（`key: 'agentcore'`、`sidebar: 'agentsCore'`）、构建通过
- **待办**：34 节互动课 `ac-0001..ac-0034` + 34 张速查表 + 文档入口小节 + 洗牌/同步/构建/提交
- **本课程带来的新站点能力**：数学公式渲染（`remark-math` + `rehype-katex` + `katex`）。注意配置必须写在 **preset 的 `docs`/`pages`** 里，顶层 `markdown.remarkPlugins` 不被 schema 接受；样式在 `src/css/custom.css` 顶部 `@import 'katex/dist/katex.min.css'`（本地打包，非 CDN）
- **转换器已入库**：`teach/tools/agentcore2mdx.py`（单章）+ `teach/tools/agentcore_build_docs.py`（34 章一键重生成）；源课件解压目录 `.scratch/agent-core/`（gitignore，重取方法见胶囊 §5）

## AI 搜索替代本地插件（2026-09-28 定，站点级）

- **移除** `@easyops-cn/docusaurus-search-local`：其索引一直为空（docs 的 routeBasePath 为 `/`，与插件默认 `docsRouteBasePath:['docs']` 不匹配，132 篇文档全被过滤；中文分词也未配置），右上角搜索框形同虚设
- **新方案**（全部零新增 npm 依赖）：
  - 构建期索引：`scripts/build-search-index.mjs` → `api/_index/search-index.ts`（gitignore；docs 132 篇 MDX + static/teach/lessons 77 个 HTML 课页，按 ##/h2-h3 分块，slug 推导 URL，约 1400 块 / 540 KB）
  - 检索：`lib/search-retrieval.mjs`（中文 bigram + 英文单词 TF-IDF，标题命中 ×3，每文档至多 2 块、正文预算 6000 字符；单字中文查询无结果——与旧插件相同限制）
  - 生成：`api/ai-search.ts`（每 IP 日 20 / 分钟 3 限额，Supabase `ai_search_quota` 表；系统提示词严格限定只依据文档片段回答；DeepSeek chat/completions，模型默认 `deepseek-chat`）
  - 入口：导航栏 `custom-ai-search` 模态框（Ctrl/Cmd+K 唤起），答案 + 来源链接
  - 埋点：每次调用写 `ai_search_usage`（ip/visitor_id/token 数），/status 新增「AI 搜索」面板（总/月 token、按独立访客总/月）
- **上线前待办**：① Supabase SQL Editor 执行 `supabase/migrations/010_ai_search.sql`（幂等，表缺失时配额降级内存限流、埋点静默跳过，不挡上线）② Vercel 环境变量 `DEEPSEEK_API_KEY`（可选：`DEEPSEEK_MODEL`、`AI_SEARCH_DAILY_LIMIT`、`AI_SEARCH_MINUTE_LIMIT`）
- 防滥用要点：Key 只在服务端；middleware 对 `/api/` 放行，因此配额内建于 API 函数（占位 upsert 后读回计数，无竞态）；存储故障时降级为单实例内存限流

## 用户侧文案与互动课小节形态（2026-09-23 用户指令，全站统一，后续新课程照此执行）

站点面向最终用户（用户只有文档，没有「AI 老师」对话），因此：

- **互动课与速查表不设 footer**——不得出现「有任何不理解的地方，回到对话里问你的 AI 老师」及同类对话引导文案（文档页内也不得出现）
- **文档末尾互动课小节统一形态**（与 `agents/python-framework/Web服务框架` 一致）：
  - 标题 `## 互动教学课程`——h2，与 `## 作业` 同级；**标题不带 emoji/icon**（右侧目录不出现图标）
  - 内容仅两条链接：`- <a href="互动课">📖 互动教学课程（分级测验 + 面试实战）</a>` 与 `- <a href="速查表">📋 章名速查表（可打印）</a>`
  - 不带引言句、不带「👉 点击进入」按钮、不带预计时长/配套说明子弹列表
- 作业节保持在文档正文（`## 作业`），互动课内不设作业提示
- 速查表 lesson-sub 固定「配合《…互动教学课程》使用。」（无来源句）
