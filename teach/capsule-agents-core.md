# 时间胶囊 · 《Agents底层逻辑》课程（2026-10-02 收尾，留给下一次会话）

> 状态一句话：**前置条件全部完成并通过构建；34 章文档 + 代码附录已交付在本地提交里，34 节互动课与 34 张速查表留给下一次生成。**
> 本次会话没有再往前的用户指示，下一次直接从「下一步」第 1 条开始即可。

---

## 1. 课程基本信息

| 项 | 值 |
|---|---|
| 课程名 | Agents底层逻辑（源课程作者：袁进） |
| 源仓库 | <a href="https://gitee.com/dev-edu/agent-core" target="_blank" rel="noopener">gitee.com/dev-edu/agent-core</a> |
| 章数 | **34 章**（01–34，无跳号） |
| 文档目录 | `docs/agents/Agents底层逻辑/`（34 章 + `index.mdx` 课程首页） |
| 课程登记 | `data/courses.ts` → `AGENTCORE_NAMES`，`key: 'agentcore'`、`sidebar: 'agentsCore'` |
| 互动课编号 | **`ac-0001` … `ac-0034`**（与 `ds-`/`fw-`/`db-`/`pg-` 并列） |
| 单元卡片 | `docs/agents/index.mdx` 已从「筹备中」改为「34 节 · 进入课程」 |
| Python 环境 | 源 `pyproject.toml` 要求 ≥3.14.5（uv 管理；openai / mcp / tavily-python / tiktoken / transformers / jinja2 / matplotlib） |

### 34 章清单（括号内为源载体）

| 章 | 名称 | 载体 | 代码包 |
| :--: | :-- | :-- | :-- |
| 01 | 必看导言 | 课件.md | — |
| 02 | AI的分类 | **无正文**（只有一张分类图 + XMind） | — |
| 03 | 神经元 | 课件.md | — |
| 04 | 前向传播 | 课件.md | — |
| 05 | 梯度下降 | 课件.md | — |
| 06 | 训练模式和框架 | 课件.md | — |
| 07 | 词元 | 课件.ipynb | bpe_vocab.json / corpus.txt |
| 08 | token统计 | 课件.ipynb | — |
| 09 | 神经网络的本质 | 课件.md | — |
| 10 | 词嵌入 | 课件.md | — |
| 11 | 注意力机制 | 课件.md | — |
| 12 | Transformer的完整训练流程 | 课件.md | — |
| 13 | 推理机制 | 课件.md | — |
| 14 | 训练阶段 | 课件.md | — |
| 15 | 模型接口契约 | 课件.md + 代码示例.ipynb | utils/*.py |
| 16 | 系统提示词 | 课件.ipynb | agent/ |
| 17 | 会话 | 课件.ipynb | agent/ |
| 18 | tools | 课件.ipynb | agent/ |
| 19 | 封装tools | 课件.ipynb | agent/（+ uv.md） |
| 20 | ReAct | 课件.ipynb | agent/（+ 分析.md） |
| 21 | Agent | 课件.ipynb | agent/（+ 分析.md） |
| 22 | Agent 搜索引擎 | 课件.ipynb | agent/ |
| 23 | Skill | 课件.ipynb | agent/ |
| 24 | MCP协议 | 课件.md | — |
| 25 | MCP Client | 课件.ipynb | agent/ |
| 26 | Agent接入MCP | 课件.ipynb | agent/ |
| 27 | 实现MCP服务器 | 课件.ipynb | — |
| 28 | Skill VS MCP | 课件.md | — |
| 29 | 子代理 | 课件.ipynb | agent/ |
| 30–34 | Prompt / Context / Harness / Loop / Graph Engineering | 课件.md | — |

---

## 2. 本次已完成（前置条件）与验证证据

1. **源课件解压**：gitee 归档 zip（7.5 MB / 447 条目）→ `.scratch/agent-core/`（**`.scratch/` 已 gitignore，不在库里**；重取方式见 §5）
2. **转换器入库**：`teach/tools/agentcore2mdx.py`（单章转换）+ `teach/tools/agentcore_build_docs.py`（34 章批量）
3. **34 章文档全部生成**：`docs/agents/Agents底层逻辑/NN.章名.mdx`
   - 课件全量保留；`<img>` 与本地 markdown 图片落盘到 `static/img/agent-core/`（**11 张**）
   - **13 章**带「## 本章代码」附录：与**上一个带代码包的章节** diff 出新增/修改文件全文
   - 第 02 章源里没有正文，手写为纯图章（`static/img/agent-core/02-AI的分类.jpg`）
4. **数学公式支持（新增站点能力）**：`remark-math` 6.0.0 + `rehype-katex` 7.0.1 + `katex` 0.18.10
   - 配置写在 **preset 的 `docs` 与 `pages`**（Docusaurus v3 不接受顶层 `markdown.remarkPlugins`）
   - 样式在 `src/css/custom.css` 顶部 `@import 'katex/dist/katex.min.css'`（**本地打包，不走 CDN**；含 `.katex` 颜色继承与 `.katex-display` 横向滚动两条补丁）
5. **课程登记**：`data/courses.ts`（34 节侧边栏）+ 单元卡片 + 课程首页 `index.mdx`（六段式章节表）
6. **构建证据**：`pnpm build` 通过；KaTeX 实渲染（03 章构建产物含 15 个 `.katex` 容器）；sitemap 总数 **352**（本课程 **35** 条路由）

---

## 3. 下一步（下一次会话从这里开始）

1. **生成 34 节互动课**：`teach/lessons/ac-0001-必看导言.html` … `ac-0034-Graph-Engineering.html`
   - 结构、样式、文案**严格照** `teach/lessons/ds-0001-课程导言.html`（同站已完成的最新范式）
   - 每课：本课目标（4 条）→ 知识速览（2–3 card）→ 分级测验 9 题（🌱🌿🎯 各 3，`data-correct` 无规律）→ 💼 面试实战（**4–8 题弹性**，题型顺序 陷阱→机制→代码审查→设计选型→AI 场景）→ 巩固与延伸；结尾 `quiz.js` + `interview.js`
   - `lesson-sub` 回链写成 `/agents/Agents底层逻辑/<去编号文件名>`（文件名即路由，见 §4 命名规则）
2. **生成 34 张速查表**：`teach/reference/<章名>速查表.html`（`sheet-kicker` / `cmp-table` / `term-grid` / `print-badge`；`lesson-sub` 固定「配合《…互动教学课程》使用。」）
3. **补文档入口**：给 34 章 mdx 末尾追加统一小节（照数据科学课写法，**原生 `<a>`**，因为站点 `onBrokenLinks: 'throw'`）：
   ```
   ## 互动教学课程
   - <a href="/teach/lessons/ac-000N-<章名>.html">📖 互动教学课程（分级测验 + 面试实战）</a>
   - <a href="/teach/reference/<章名>速查表.html">📋 <章名>速查表（可打印）</a>
   ```
4. **洗牌 + 发布同步**：`python3 teach/tools/shuffle_options.py`（BASE 已是主检出区）→ `cp -R teach/lessons/. static/teach/lessons/` 等同款三步
5. **验证 + 提交**：`pnpm build`（含 `inject-teach-sitemap.mjs`）→ `python3 scripts/check-sitemap.py` → 本地 commit
6. **推送**：按课程工作的既有政策**不主动推送**，等用户明确说推（上一门《数据科学工具包》就是用户验收后才让推的）

### 建议的执行方式（上一门验证有效）
- 用 **8 个并发子代理**分波出课（每波 8 章 × 2 文件），每个子代理的提示词里必须包含：
  - 本章源文件路径（`课件.md`/`课件.ipynb`）、本章 mdx 路径、结构范式文件路径
  - `teach/INTERVIEW-TEMPLATE.md` 的题源协议 B：**必须实际联网检索**官方文档（OpenAI / MCP / Jupyter / transformers / NumPy 等），`source` 写「官方文档名 + 原文引用 + URL + 检索日期 + 层级：一手」
  - 「找不到官方来源就改用源课程场景化的 scenario 题，**禁止编造 URL**」
- 子代理完成后**统一复核**：结构脚本（9 题/4 选项/`data-correct` 合法/面试 JSON 可 `node` 解析/无禁用文案）+ **逐条 URL 可达性检查**（`curl -o /dev/null -w "%{http_code}"`），上一门 30 条源全部 200

---

## 4. 命名与路由规则（本课程已按此落地）

- 文件名去掉源章名里的**空格→连字符**（`22. Agent 搜索引擎` → `22.Agent-搜索引擎.mdx`），否则路由会出现多余连字符；`title` 仍保留源章名原文
- 路由 = `/agents/Agents底层逻辑/<文件名去掉 NN. 前缀>`，例：`/agents/Agents底层逻辑/Agent-搜索引擎`
- 源里 4 章拼写 **`Engeering`（拼错）已修正为 `Engineering`**（30–34 章标题与文件名）
- 互动课文件用 `ac-000N-<同名基名>.html`，速查表用 `<同名基名>速查表.html`

---

## 5. 源课件重取方法（`.scratch/` 会被清理）

```bash
curl -sL -o /tmp/agentcore.zip \
  https://gitee.com/dev-edu/agent-core/repository/archive/main.zip   # 7.5MB，免限流
python3 - <<'PY'
import zipfile, os
z = zipfile.ZipFile('/tmp/agentcore.zip')
out = '/Users/zp/Code/doc-site/.scratch/agent-core'
for info in z.infolist():
    name = info.filename
    if name.endswith('/'):
        continue
    # 中文名必须 cp437→utf-8 探测（macOS unzip 会报 Illegal byte sequence）
    for enc in ('cp437', 'gbk'):
        try:
            s = name.encode('cp437').decode(enc)
            if s:
                name = s
                break
        except Exception:
            pass
    rel = name.split('/', 1)[1] if '/' in name else name
    dest = os.path.join(out, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'wb').write(z.read(info))
PY
```
然后 `python3 teach/tools/agentcore_build_docs.py` 可一键重生成 34 章文档。

---

## 6. 已踩的坑（转换器已内置处理，改脚本时别改回去）

| 坑 | 现象 | 现处理 |
|---|---|---|
| 顶层 `markdown.remarkPlugins` | 构建报 “field(s) not recognized” | 配在 preset 的 `docs` / `pages` |
| 源 19 章 cell15 | markdown cell 只写了 ` ```python ` 开场，**漏闭合**，导致整篇围栏错位 | 转换器对奇数围栏的 markdown cell 自动补闭合 |
| 正文尖括号占位符 | `<空>` / `<动态内容>` 被 MDX 当 JSX 标签 → 编译失败 | 围栏外统一包反引号（安全标签白名单除外） |
| 本地 markdown 图片 | `![x](./assets/mcp.svg)` 未落盘 → `onBrokenMarkdownImages` 报错 | 复制到 `static/img/agent-core/` 并改绝对路径 |
| 代码附录嵌 `.md` 文件 | 文件自带 ``` 围栏 → 嵌套把外层提前闭合 → SSR 报 `name is not defined` | 外层围栏按内容最长反引号串 +1 自动加长 |
| `$$…$$` / `$…$` | 站点原先无数学插件，`{` 会触发 JSX 解析 | 已装 KaTeX；转换器保留原文（`--math fence` 可退回无插件模式） |
| 第 02 章 | 源里没有正文（只有 jpg + xmind） | 手写为纯图章 mdx；xmind 未收录（只给 gitee 链接） |
| `HTML/` React 工程 | 课件里**没有引用**它 | **本次未集成**（只给源仓库链接）。若要上线，需加 Vite 构建 + 拷 dist 到 static，属构建链路改动，先与用户确认 |

---

## 7. 本次交付文件清单（本地提交内）

- `docs/agents/Agents底层逻辑/` — 34 章 mdx + `index.mdx`
- `static/img/agent-core/` — 11 张图
- `data/courses.ts` / `docs/agents/index.mdx` — 课程登记与卡片
- `docusaurus.config.ts` + `package.json` + `pnpm-lock.yaml` — KaTeX（remark-math / rehype-katex / katex）
- `src/css/custom.css` — KaTeX 样式引入与两条补丁
- `teach/tools/agentcore2mdx.py`、`teach/tools/agentcore_build_docs.py` — 转换器（入库）
- 本文件 `teach/capsule-agents-core.md` + `teach/NOTES.md` 的一节说明

## 8. 相关既有规格（动手前先读）

- `teach/NOTES.md` — 全站课程结构与 Forest/无 footer/无对话引导等硬规则（含本课程一节）
- `teach/INTERVIEW-TEMPLATE.md` — 面试实战 5 类题型、弹框单题、**题源协议 B**
- `AGENTS.md` — 提交推送政策、docs description 必填、原生 `<a>` 链接 static 资源
