# 反爬 / 反 AI 抓取防护 —— 分层设计与上线清单

目标：挡住非人工的自动访问（脚本爬虫、AI 训练爬虫、无头浏览器），同时保留搜索引擎收录与微信分享。

诚实边界：公开页面无法 100% 区分「真人用浏览器」和「机器用浏览器」——任何真人能读到的内容，用真实内核的无头浏览器理论上都能读到。本方案挡住现实中绝大多数自动化流量，剩余盲区靠 Vercel Bot Protection 的启发式挑战压缩。

## 三层防护（代码已入库，随部署生效）

| 层 | 文件 | 作用 |
|---|---|---|
| 君子协定 | `static/robots.txt` | 逐条 `Disallow` 已知 AI 训练爬虫（GPTBot/ClaudeBot/CCBot/Bytespider/Google-Extended 等）与营销抓取器；搜索引擎默认放行 |
| WAF | `vercel.json` → `routes`+`mitigate` | ① UA 命中脚本库黑名单（curl/wget/python-requests/scrapy/headlesschrome 等）→ challenge；② 无 UA 请求 → challenge |
| 路由 | `middleware.ts` | 文档页必须持 `zg_js` cookie（JS 设置，7 天有效）才放行；无 JS 执行能力的客户端拿不到正文。搜索引擎/微信/社交预览/监控探活 UA 白名单直通；`/api/*` 与静态资源跳过 |

## 控制台手动项（vercel.json 不支持，需在 Vercel Dashboard 操作，立即生效）

1. **Firewall → Managed Rules → AI Bots**：开启，动作选 **Deny**（官方维护名单，自动更新）
2. **Firewall → Managed Rules → Bot Protection**：开启，动作选 **Challenge**（启发式识别非浏览器流量；已验证的 Googlebot/Bingbot/Baiduspider 自动放行）
3. **Firewall → Custom Rules → 新增 bypass 规则**（消耗 Hobby 第 3 条自定义规则配额）：
   - 条件：`User-Agent` 包含 `360spider` / `sogou` / `yisouspider` / `shenma`（任一）
   - 动作：**Bypass** —— 防止 Bot Protection 误挑战未进 Vercel 验证名单的中文搜索蜘蛛，保住中文搜索收录
4. **Firewall → Custom Rules → 新建规则**，Action 下拉选 **Rate Limit**（速率限制是自定义规则的一种动作，不是独立菜单；Hobby 免费 1 条，不占 3 条自定义规则配额）：条件留空匹配所有请求，窗口 10 秒，上限 120 次，计数键 IP，超限动作 **Challenge**

## 部署后验证

```bash
# 无 UA 请求 → 被 WAF 挑战（403 / JS challenge）
curl -sI https://doc.zhangpan.online/

# 模拟 GPTBot → 被 AI Bots 规则 Deny（控制台开启后）
curl -sI -A "GPTBot/1.0" https://doc.zhangpan.online/

# 浏览器 UA 无 cookie → middleware 返回「正在验证浏览器环境」页
curl -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" https://doc.zhangpan.online/ | head -5

# 带 cookie → 正常页面
curl -s -H "Cookie: zg_js=1" -A "Mozilla/5.0" https://doc.zhangpan.online/ | head -5

# 模拟百度蜘蛛 → 直通（白名单）
curl -sI -A "Mozilla/5.0 (compatible; Baiduspider/2.0)" https://doc.zhangpan.online/
```

浏览器正常访问：首次约半秒 JS 校验（设置 cookie 后原地重载），此后 7 天免校验；微信内打开不受影响。

## 回滚

- 控制台规则：Firewall → 审计日志 → Restore（或直接关掉对应规则，~300ms 生效）
- 代码层：revert 对应提交；`middleware.ts` 删除即完全撤掉挑战门（站点退回纯静态直出）
