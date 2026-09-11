#!/usr/bin/env python3
"""对账 sitemap.xml 与构建产物：列出生产环境会 404 的 sitemap URL。"""
import os
import re
import sys
import urllib.parse

sitemap = "build/sitemap.xml"
if not os.path.exists(sitemap):
    print("NO SITEMAP — 请先 pnpm build")
    sys.exit(1)

urls = re.findall(r"<loc>(https://doc\.zhangpan\.online[^<]*)</loc>", open(sitemap, encoding="utf-8").read())
print(f"sitemap 共 {len(urls)} 个 URL\n")

bad = []
for u in urls:
    path = u.replace("https://doc.zhangpan.online", "")
    # sitemap 用百分号编码，构建目录是 UTF-8 原名——先解码再比对
    fs_path = urllib.parse.unquote(path)
    if path.endswith(".html") or "." in path.rsplit("/", 1)[-1]:
        # 带扩展名：build/<path> 直接对应（一般不会出现在 sitemap）
        target = os.path.join("build", fs_path.lstrip("/"))
    else:
        target = os.path.join("build", fs_path.lstrip("/"), "index.html")
    if os.path.isfile(target):
        continue
    bad.append((u, target))

if bad:
    print(f"⚠️ 以下 {len(bad)} 个 URL 在生产环境会 404：")
    for u, t in bad:
        print(f"  {u}  （本地无 {t}）")
else:
    print("✅ sitemap 全部 URL 在构建产物中都有对应文件，无本地 404。")

# 顺带统计 teach/ 静态页是否被 sitemap 覆盖
teach_html = [f for f in os.listdir("static/teach") if f.endswith(".html")] if os.path.isdir("static/teach") else []
print(f"\nstatic/teach 下 {len(teach_html)} 个 HTML（不在 sitemap 中，搜索引擎靠页面内链接发现）")
