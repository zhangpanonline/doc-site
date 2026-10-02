# 作业书 · 《Agents底层逻辑》互动课 + 速查表（34 章）

给执行本任务的子代理看：按本文件规范，为你负责的章生成**两个文件**（互动课 + 速查表）。

---

## 0. 每章产出（路径必须精确）

| 产出 | 路径 |
|---|---|
| 互动课 | `teach/lessons/ac-000N-<路由名>.html` |
| 速查表 | `teach/reference/<路由名>速查表.html` |

`<路由名>` 见 §5 章表。`N` 为两位章号（01…34）。

---

## 1. 先读这些（按顺序）

1. **本章文档（内容权威范围）**：`docs/agents/Agents底层逻辑/NN.<路由名>.mdx`——题目只能考它覆盖的知识
2. **结构范式（照抄标记结构，不要自创 class）**：`teach/lessons/ds-0001-课程导言.html`（同站最新范式）
3. **速查表范式**：`teach/reference/课程导言速查表.html`
4. **面试题权威规范**：`teach/INTERVIEW-TEMPLATE.md`
5. 需要更多细节时看源课件：`.scratch/agent-core/<NN. 章名>/课件.md` 或 `课件.ipynb`

---

## 2. 互动课结构（顺序、class 必须与 ds-0001 一致）

- **head**
  - `<meta name="description" content="Agents底层逻辑 · <章名>：…——互动教学课程">`
  - `<title><章名> · 互动教学课程（Agents底层逻辑 ac-NN）</title>`
  - favicon `../../img/avatar.png`；`../assets/course.css`；`../assets/forest.css`
  - ⚠️ **KaTeX 两行不用你加**：站点用共享加载器给 ac 课统一注入
    `<link rel="stylesheet" href="../assets/katex/katex.min.css">` 与 `<script src="../assets/math.js"></script>`
    （脚本：`.scratch/inject-math.py`，在 34 课全部生成后统一跑）。
    你只要把公式按 `$…$` / `$$…$$` 原文写进正文即可，**不要**自己引 CDN 或自创 head 结构。
- **header**：`lesson-kicker`「互动教学课程 · Agents底层逻辑」；`h1` 章名；
  `lesson-sub` 形如：`配合《<a href="/agents/Agents底层逻辑/<路由名>">NN.<章名></a>》使用<span class="dot"></span>预计 15–20 分钟<span class="dot"></span>9 道分级测验 + 面试实战`
- **本课目标**：`section.lesson-goal.card` + `<h2 style="margin-top:0">本课目标</h2>` + `<ol>` 四条
- **知识速览**：`<h2>知识速览</h2>` + 2–3 个 `div.card`（每个含 `<h3>` + `ul.pitfall-list`）
- **分级测验**：`<h2>分级测验</h2>` + 说明段；三个 `<h3>`「🌱 初级测验 · 概念」「🌿 中级测验 · 应用」「🎯 高级测验 · 综合」，每个下面一个 `div.quiz` 包 3 道题
  - 每题：`<div class="quiz-q" data-correct="N">` > `div.quiz-prompt` + `div.quiz-options`（4 个 `button.quiz-option`）+ `<div class="quiz-explain" hidden>…</div>`
  - `data-correct` = 正确选项在**当前源码顺序**下的 0 基下标（运行时 quiz.js 会洗牌并同步更新）；三组答案位置不要有规律
  - 中高级必须是真难度（推演/陷阱/跨知识点），解释要指回本章文档对应小节
- **💼 面试实战**：`<h2>💼 面试实战</h2>` + 一段说明 + `<button type="button" class="interview-launch">开始面试实战</button>` + `<script>window.__interview = {lesson:'ac-000N-<路由名>', questions:[…]};</script>`
  - 题数 **4–8 道**（弹性）；顺序固定：陷阱 `trap` → 机制 `mechanism` → 代码审查 `review` → 设计选型 `design` → AI 辅助场景 `scenario`（同类型可多道，需相邻）
  - 每题字段：`type` / `level`（'初级岗常问'|'中级岗常问'|'高级岗常问'）/ `prompt` / `source` / `breakdown`
  - `scenario` 题额外有 `scene:{time, goal, accept:[…]}`，其 `source` 固定为：`任务基于《NN.<章名>》课件 · 来源层级：一手（源课程）场景化`
  - **JS 模板字符串（反引号）内部不得再出现反引号**；代码一律用 `<code>` 标签
- **巩固与延伸**：`<h2>巩固与延伸</h2>` + `ul.pitfall-list`（深读推荐 / 打印参考 / 回看课程，含下一章链接）
- **结尾**：`</main>` + `<script src="../assets/quiz.js"></script>` + `<script src="../assets/interview.js"></script>` + `</body></html>`
- **禁止**：footer、`最终考核` 小节、任何「问你的 AI 老师」类对话引导文案

---

## 3. 速查表结构（照 `课程导言速查表.html`）

- head：`<title><路由名>速查表 · 参考手册</title>`；`<meta name="description" content="<路由名>速查表 · 可打印参考手册：配合《<路由名>互动教学课程》使用。">`
- header：`p.sheet-kicker`「参考手册 · 适合打印 · Agents底层逻辑」；`h1`「<路由名>速查表」；`p.lesson-sub`「配合<a href="../lessons/ac-000N-<路由名>.html">《<路由名>互动教学课程》</a>使用。」
- 2–4 个 `section`：用 `table.cmp-table` / `dl.term-grid` / `pre` 承载核心速记（本章的概念对照、API/命令速查、易错点）
- 末尾 `<p class="print-badge">🔖 Agents底层逻辑课程</p>`

---

## 4. 面试题源协议 B（强制，不可跳过）

- 用 `web_search` / `web_fetch` **实际检索**官方文档（优先：OpenAI 官方文档 / MCP 官方规范 modelcontextprotocol.io / Jupyter 官方文档 / Hugging Face transformers 文档 / NumPy 官方文档 / Python 官方文档 / Anthropic 官方文档 / 各库官方文档）
- `source` 统一格式：`来源：<官方文档名>（"<英文原文引用>"）<URL> · 检索 2026-10-02 · 层级：一手（官方文档）`
- **引文必须是你实际抓到的原文；绝对禁止编造 URL 或引文**
- 找不到官方来源时：改用 `scenario` 形态（源课程场景化），不要硬编来源
- 本章若涉及数学/机制（如注意力、梯度），优先引官方文档对机制的定义原文

---

## 5. 章表（路径与命名以此为准）

源目录在 `.scratch/agent-core/` 下，前缀为两位章号。

| 章 | 章名 | 路由名 | 源目录 | 文档 |
| :--: | :-- | :-- | :-- | :-- |
| 01 | 必看导言 | 必看导言 | `01. 必看导言`（课件.md） | `docs/agents/Agents底层逻辑/01.必看导言.mdx` |
| 02 | AI的分类 | AI的分类 | `02. AI的分类`（**无课件，只有图**） | `02.AI的分类.mdx` |
| 03 | 神经元 | 神经元 | `03. 神经元`（课件.md） | `03.神经元.mdx` |
| 04 | 前向传播 | 前向传播 | `04. 前向传播`（课件.md） | `04.前向传播.mdx` |
| 05 | 梯度下降 | 梯度下降 | `05. 梯度下降`（课件.md） | `05.梯度下降.mdx` |
| 06 | 训练模式和框架 | 训练模式和框架 | `06. 训练模式和框架`（课件.md） | `06.训练模式和框架.mdx` |
| 07 | 词元 | 词元 | `07. 词元`（课件.ipynb） | `07.词元.mdx` |
| 08 | token统计 | token统计 | `08. token统计`（课件.ipynb） | `08.token统计.mdx` |
| 09 | 神经网络的本质 | 神经网络的本质 | `09. 神经网络的本质`（课件.md） | `09.神经网络的本质.mdx` |
| 10 | 词嵌入 | 词嵌入 | `10. 词嵌入`（课件.md） | `10.词嵌入.mdx` |
| 11 | 注意力机制 | 注意力机制 | `11. 注意力机制`（课件.md） | `11.注意力机制.mdx` |
| 12 | Transformer的完整训练流程 | Transformer的完整训练流程 | `12. Transformer的完整训练流程`（课件.md） | `12.Transformer的完整训练流程.mdx` |
| 13 | 推理机制 | 推理机制 | `13. 推理机制`（课件.md） | `13.推理机制.mdx` |
| 14 | 训练阶段 | 训练阶段 | `14. 训练阶段`（课件.md） | `14.训练阶段.mdx` |
| 15 | 模型接口契约 | 模型接口契约 | `15. 模型接口契约`（课件.md + 代码示例.ipynb） | `15.模型接口契约.mdx` |
| 16 | 系统提示词 | 系统提示词 | `16. 系统提示词`（课件.ipynb + agent/） | `16.系统提示词.mdx` |
| 17 | 会话 | 会话 | `17. 会话`（课件.ipynb + agent/） | `17.会话.mdx` |
| 18 | tools | tools | `18. tools`（课件.ipynb + agent/） | `18.tools.mdx` |
| 19 | 封装tools | 封装tools | `19. 封装tools`（课件.ipynb + agent/） | `19.封装tools.mdx` |
| 20 | ReAct | ReAct | `20. ReAct`（课件.ipynb + agent/） | `20.ReAct.mdx` |
| 21 | Agent | Agent | `21. Agent`（课件.ipynb + agent/） | `21.Agent.mdx` |
| 22 | Agent 搜索引擎 | Agent-搜索引擎 | `22. Agent 搜索引擎`（课件.ipynb + agent/） | `22.Agent-搜索引擎.mdx` |
| 23 | Skill | Skill | `23. Skill`（课件.ipynb + agent/） | `23.Skill.mdx` |
| 24 | MCP协议 | MCP协议 | `24. MCP协议`（课件.md） | `24.MCP协议.mdx` |
| 25 | MCP Client | MCP-Client | `25. MCP Client`（课件.ipynb + agent/） | `25.MCP-Client.mdx` |
| 26 | Agent接入MCP | Agent接入MCP | `26. Agent接入MCP`（课件.ipynb + agent/） | `26.Agent接入MCP.mdx` |
| 27 | 实现MCP服务器 | 实现MCP服务器 | `27. 实现MCP服务器`（课件.ipynb） | `27.实现MCP服务器.mdx` |
| 28 | Skill VS MCP | Skill-VS-MCP | `28. Skill VS MCP`（课件.md） | `28.Skill-VS-MCP.mdx` |
| 29 | 子代理 | 子代理 | `29. 子代理`（课件.ipynb + agent/） | `29.子代理.mdx` |
| 30 | Prompt Engineering | Prompt-Engineering | `30. Prompt Engeering`（课件.md） | `30.Prompt-Engineering.mdx` |
| 31 | Context Engineering | Context-Engineering | `31. Context Engeering`（课件.md） | `31.Context-Engineering.mdx` |
| 32 | Harness Engineering | Harness-Engineering | `32. Harness Engeering`（课件.md） | `32.Harness-Engineering.mdx` |
| 33 | Loop Engineering | Loop-Engineering | `33. Loop Engeering`（课件.md） | `33.Loop-Engineering.mdx` |
| 34 | Graph Engineering | Graph-Engineering | `34. Graph Engeering`（课件.md） | `34.Graph-Engineering.mdx` |

---

## 6. 硬约束

- **只创建你这章的两个文件**；不要改任何其他文件；不要 `git add/commit`；不要跑 `pnpm build`；不要复制到 `static/`
- 内容只覆盖本章文档已覆盖的知识（ZPD）；中文；风格与 `ds-0001` 一致
- 数学公式按原文写 `$…$` / `$$…$$` 即可（站点已支持 KaTeX 渲染）
- 完成后回报：两个文件路径 + 你实际检索并使用的面试题源 URL 清单（逐条注明用在哪一题）
