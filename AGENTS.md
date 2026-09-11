# 项目 AI 协作说明

## CodeGraph 代码索引（重要）

本项目已使用 CodeGraph 建立代码语义索引（仓库根目录 `.codegraph/`）。

### 必须优先使用 CodeGraph 的场景

涉及**代码结构与语义**的问题，禁止只依赖普通文本搜索（rg/grep），
先用 CodeGraph 命令：

- 查找符号/函数/类/接口的定义或引用 → `codegraph node <符号名>`
- 理解调用链、依赖关系、回答"这段代码是干嘛的" → `codegraph explore "<问题描述>"`
- 谁依赖这个文件/模块、有没有循环 → `codegraph deps <文件>` / `codegraph rdeps <文件>`
- 改动影响范围、受影响的测试 → `codegraph impact <符号>` / `codegraph affected`
- 热点文件、架构风险 → `codegraph hotspots`
- 项目结构总览 → `codegraph files`

### 不要用 CodeGraph 的场景

- 纯文本/内容搜索（日志、配置键、字符串字面量）→ 用普通搜索
- 运行时行为、测试结果分析 → 直接读代码/跑测试

### 使用前检查

- 若 `.codegraph/` 目录不存在：先运行 `codegraph init`
- 若感觉索引过期（查不到刚改的代码）：先运行 `codegraph sync`

## 提交与推送（用户既定方案 B，2026-09-09）

每批完成即：commit → 合入 main → `push origin main` **直接做，不逐次询问**；完成后提醒用户 `git pull` 同步。禁止 force push、禁止推其他分支。后台会话在 worktree 里工作时，用 `git push origin HEAD:main`（快进）完成合入+推送。

## 文档写作规则

- **docs/ 下每篇 .md/.mdx 必须带 `description` frontmatter**（SEO 唯一摘要）：15~40 字、含标题关键词、写在 title 行后、双引号包裹。2026-09-09 已全量补过 92 篇，新增文档必须保持完整率。
- **文档路由去掉文件名数字前缀**：`python/语言核心/24.协程.mdx` 的真实路由是 `/python/语言核心/协程/`，回链必须用去前缀后的真实路由。
- **指向 static 资源的链接必须用原生 `<a>` 标签**：站点 `onBrokenLinks: 'throw'`，markdown 链接会被判为断链导致构建失败。
- 每个提交前跑 `pnpm build` 验证；类型检查存量错误（如 CourseUI.tsx:550）与本次改动无关时不要顺手改坏。

## teach/ 教学工作区规则

- 结构：`MISSION.md` / `RESOURCES.md` / `NOTES.md` / `lessons/` / `assets/` / `reference/`；课程受众兼顾网站读者与用户自己（中文内容）。
- **发布同步**：改完 `teach/lessons|assets|reference` 后必须重新复制到 `static/teach/` 才随站点发布；入口链接指向 `/teach/lessons/NNNN-章名.html`。
- **面试题规范**：`teach/INTERVIEW-TEMPLATE.md` 是权威规范（5 类题型、弹框单题、用户自判、题数弹性）；新课程在 LESSONS 表登记；批量改造引擎 `teach/tools/rewrite_interview.py`（幂等）。
- **题源协议 B（强制默认）**：所有新面试题必须实际联网检索到来源（官方文档 FAQ > 公司技术博客 > 面经平台），标注链接+检索日期+层级，禁止纯自创。
- **代码必须实测运行通过**：Python ≥ 3.12，写 verify 脚本跑通再发布。
- **测验选项洗牌双保险**：① quiz.js 运行时每次加载/重挑战随机洗牌（主机制）；② 新课程发布前跑 `teach/tools/shuffle_options.py` 确定性洗牌。历史事故：26 课答案 100% 在 A 位。

## 反爬与 SEO（2026-09 上线，改动前必读）

- 反爬体系四层已上线：`static/robots.txt`（君子协定）、`vercel.json` routes+mitigate（WAF 挑战）、`middleware.ts`（JS-cookie 挑战门）、控制台托管规则。完整清单与验证命令在 `anti-bot-ops.md`。
- **middleware.ts 的兼容性豁免是线上依赖**：搜索引擎/微信(MicroMessenger)/社交预览 UA 白名单、iframe/embed 嵌入式导航直通（fuel-records App 内嵌依赖）、BingPreview（必应图标）、`/api/*` 与带扩展名资源跳过——改动任何一条前先确认对应线上场景。
- 控制台配置不在代码里：AI Bots → Deny、Bot Protection → Challenge、速率限制 120 次/10s/IP → Challenge（Hobby 配额：自定义规则 3 条 + 限流 1 条）。**2026-09-11 起不再为中文蜘蛛配置 bypass**：360/搜狗/神马站长平台需 ICP 备案，用户决定只做百度/必应/谷歌三家，若控制台还留着旧 bypass 规则应删除（伪造 UA 攻击面）。
- **勿在 worktree 跑 `vercel link`**（会误建 Vercel 项目）；部署沿用现有项目。
- SEO 状态：站长平台只做百度/谷歌/必应三家（验证文件在 static/）；360/搜狗/神马因需 ICP 备案放弃（2026-09-11 用户决定）。站点侧优化（社交卡片 img/social-card.png、JSON-LD、92 篇 description）已上线，新增文档遵守 description 规则即可。
- IndexNow 已启用：key 文件在 `static/18cc253b5a5f858ee5ffe7b451a0533c.txt`；内容更新/新文档发布后跑 `bash scripts/indexnow-ping.sh [路径...]` 主动通知 Bing。

## 其他

- 站内 `/status` 访问统计与 fuel-records 共用 Supabase（`api/status.ts`、`api/track.ts`，迁移脚本在 `supabase/`）。
- 依赖管理用 pnpm（`shamefully-hoist=true`）；Vercel 部署为 docusaurus-2 零配置 + 静态输出（build/）。
