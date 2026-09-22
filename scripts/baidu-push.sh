#!/bin/bash
# 百度主动推送（普通收录 API）：新内容发布后运行，通知百度立即抓取（百度版 IndexNow）。
#
# 前提：已在本机跑过 pnpm build（脚本读取 build/sitemap.xml 生成全站 URL 列表）。
# token 获取：百度站长 → 资源提交 → 普通收录 → 推送接口（接口示例里的 token 值）。
# 用法：BAIDU_PUSH_TOKEN=<你的token> bash scripts/baidu-push.sh
# 配额：普通收录每日有限额（一般数百条），全站约 200 页，单次推送即可。

TOKEN="${BAIDU_PUSH_TOKEN:?请先设置 BAIDU_PUSH_TOKEN 环境变量（百度站长 → 资源提交 → 普通收录 → 推送接口 获取）}"
SITEMAP="build/sitemap.xml"
ENDPOINT="http://data.zz.baidu.com/urls?site=https://doc.zhangpan.online&token=${TOKEN}"

if [ ! -f "$SITEMAP" ]; then
  echo "未找到 $SITEMAP —— 请先运行 pnpm build"
  exit 1
fi

# 提取全部 <loc> URL
grep -o '<loc>[^<]*</loc>' "$SITEMAP" | sed 's/<[^>]*>//g' > /tmp_baidu_urls.txt
COUNT=$(wc -l < /tmp_baidu_urls.txt | tr -d ' ')
echo "共 $COUNT 个 URL，开始推送…"

# 分批（每批 500 条，接口上限 2000）
split -l 500 /tmp_baidu_urls.txt /tmp_baidu_batch_
for batch in /tmp_baidu_batch_*; do
  RESP=$(curl -s --max-time 60 -H 'Content-Type: text/plain' --data-binary @"$batch" "$ENDPOINT")
  echo "批次 $(basename "$batch"): $RESP"
done
rm -f /tmp_baidu_urls.txt /tmp_baidu_batch_*
echo "（success=成功条数，remain=今日剩余配额，not_same_site=站点不匹配需检查 token 归属）"
