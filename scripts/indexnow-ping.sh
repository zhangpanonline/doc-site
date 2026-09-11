#!/bin/bash
# IndexNow 主动通知：内容更新/新文档发布后运行，通知 Bing 等支持 IndexNow 的引擎立即抓取。
# 用法：bash scripts/indexnow-ping.sh [/某路径 /某路径 ...]（不带参数 = 首页 + 六个单元首页 + sitemap）
KEY="18cc253b5a5f858ee5ffe7b451a0533c"
SITE="https://doc.zhangpan.online"
PATHS=("$@")
if [ ${#PATHS[@]} -eq 0 ]; then
  PATHS=(/ /agents/ /backend/ /devops/ /ai-coding/ /fullstack/ /career/ /sitemap.xml)
fi

for path in "${PATHS[@]}"; do
  enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$SITE$path")
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://www.bing.com/indexnow?url=$enc&key=$KEY")
  echo "$path -> $code"
done
echo "（200 = 已接收；429 = 同一 URL 提交过频，跳过即可）"
