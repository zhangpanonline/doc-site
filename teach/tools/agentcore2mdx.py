#!/usr/bin/env python3
"""agent-core（Agents底层逻辑）课件 → mdx 转换器。

支持两种源载体：
  · 课件.md     （18 章）
  · 课件.ipynb  （15 章，含输出/内嵌图片/HTML 表）

口径沿用「数据科学工具包」那一版（.scratch/ipynb2mdx.py）：
  markdown 原样 / code → python 围栏（! 开头 → shell）/ 文本输出 → text 围栏（strip ANSI）
  image/png 与 <img src> → 落盘 static/img/agent-core/，正文改 markdown 图片引用
  pandas HTML 表 → markdown 表
  远程图片（resource.duyiedu.com）保留 URL，不下载

数学公式处理（--math 参数）：
  preserve（默认，需站点装 remark-math+rehype-katex）：$...$ 与 $$...$$ 原样保留
  fence  （站点无数学插件时）：$$→text 围栏、$...$→行内 code，避免 { } 被 MDX 当 JSX

用法：python3 .scratch/agentcore2mdx.py <章节目录名> --no N --title T --desc D [--math fence|preserve] [--out 路径]
"""
import argparse, base64, glob, html, json, os, re, shutil, sys

# 仓库根 = 本文件的上两级（teach/tools/xxx.py → repo）
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, '.scratch', 'agent-core')      # 源课件解压目录（.scratch 已 gitignore，需按胶囊说明重新拉取）
IMG_DIR = os.path.join(ROOT, 'static', 'img', 'agent-core')
IMG_URL = '/img/agent-core'
ANSI = re.compile(r'\x1b\[[0-9;]*[A-Za-z]')


def strip_ansi(s):
    return ANSI.sub('', s)


def save_image_bytes(data, name):
    os.makedirs(IMG_DIR, exist_ok=True)
    open(os.path.join(IMG_DIR, name), 'wb').write(data)
    return f'{IMG_URL}/{name}'


def localize_img_tags(text, chapter, dry):
    """<img src=...> → markdown 图片；本地相对路径的资源复制到 static"""
    def repl(m):
        tag = m.group(0)
        src = re.search(r'src="([^"]+)"', tag)
        if not src:
            return tag
        url = src.group(1)
        alt = re.search(r'alt="([^"]*)"', tag)
        label = alt.group(1) if alt else os.path.basename(url)
        if url.startswith('http'):
            return f'![{label}]({url})'
        srcfile = os.path.join(SRC, chapter, url.lstrip('./'))
        name = f'{chapter.split(".")[0]}-{os.path.basename(url)}'
        if os.path.exists(srcfile):
            if not dry:
                os.makedirs(IMG_DIR, exist_ok=True)
                shutil.copy2(srcfile, os.path.join(IMG_DIR, name))
            return f'![{label}]({IMG_URL}/{name})'
        return f'![{label}]({url})'
    return re.sub(r'<img\b[^>]*/?>', repl, text)


SAFE_TAGS = {'br', 'hr', 'a', 'img', 'code', 'pre', 'b', 'i', 'strong', 'em', 'kbd', 'sub', 'sup',
             'div', 'span', 'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
             'details', 'summary', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}


def escape_angle_placeholders(text):
    """围栏外把 <空> / <你的域名> 这类尖括号占位符包进反引号（MDX 会当成 JSX 标签报错）。"""
    out, infence = [], False
    for line in text.split('\n'):
        if line.strip().startswith('```'):
            infence = not infence
            out.append(line)
            continue
        if infence:
            out.append(line)
            continue

        def repl(m):
            inner = m.group(1)
            tag = inner.strip().split()[0].lstrip('/').lower() if inner.strip() else ''
            if tag in SAFE_TAGS:
                return m.group(0)
            return '`<' + inner + '>`'
        out.append(re.sub(r'<([^<>\n]{1,30})>', repl, line))
    return '\n'.join(out)


def localize_md_images(text, chapter, dry):
    """![alt](./assets/x.svg) 这类本地 markdown 图片 → 复制到 static 并改绝对路径。"""
    def repl(m):
        alt, url = m.group(1), m.group(2)
        if url.startswith(('http', 'data:', IMG_URL, '/')):
            return m.group(0)
        srcfile = os.path.join(SRC, chapter, url.lstrip('./'))
        name = f'{chapter.split(".")[0]}-{os.path.basename(url)}'
        if os.path.exists(srcfile):
            if not dry:
                os.makedirs(IMG_DIR, exist_ok=True)
                shutil.copy2(srcfile, os.path.join(IMG_DIR, name))
            return f'![{alt}]({IMG_URL}/{name})'
        return m.group(0)
    return re.sub(r'!\[([^\]]*)\]\(([^)\s]+)\)', repl, text)

    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.S)
    if not rows:
        return None
    out = []
    for i, r in enumerate(rows):
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', r, re.S)
        cells = [html.unescape(re.sub(r'<[^>]+>', '', c)).replace('|', '\\|').strip() for c in cells]
        if i == 1:
            out.append('| ' + ' | '.join('---' for _ in cells) + ' |')
        out.append('| ' + ' | '.join(cells) + ' |')
    return '\n'.join(out) if len(out) >= 2 else None


def cell_outputs(cell, chapter, idx, dry):
    blocks = []
    for j, o in enumerate(cell.get('outputs', [])):
        data = o.get('data', {})
        if o.get('output_type') == 'stream':
            txt = strip_ansi(''.join(o.get('text', ''))).rstrip()
            if txt:
                blocks.append(f'```text\n{txt}\n```')
        elif 'image/png' in data:
            name = f'{chapter.split(".")[0]}-cell{idx}-out{j}.png'
            url = f'{IMG_URL}/{name}' if dry else save_image_bytes(base64.b64decode(data['image/png']), name)
            blocks.append(f'![输出图]({url})')
        elif 'text/html' in data:
            md = html_table_to_md(''.join(data['text/html']))
            if md:
                blocks.append(md)
            elif 'text/plain' in data:
                blocks.append('```text\n' + strip_ansi(''.join(data['text/plain'])).rstrip() + '\n```')
        elif 'text/plain' in data:
            txt = strip_ansi(''.join(data['text/plain'])).rstrip()
            if txt and txt != 'None':
                blocks.append(f'```text\n{txt}\n```')
    return blocks


def math_fence(text):
    """无数学插件模式：$$→text 围栏，$...$→行内 code（避免 { } 触发 MDX JSX 解析）"""
    text = re.sub(r'\$\$\s*\n(.*?)\n\s*\$\$', lambda m: '```text\n' + m.group(1).strip('\n') + '\n```', text, flags=re.S)
    text = re.sub(r'(?<!\$)\$([^$\n]{1,200})\$(?!\$)', lambda m: '`' + m.group(1).strip() + '`', text)
    return text


CODE_EXT = ('.py', '.j2', '.json', '.toml', '.md', '.txt')
CODE_SKIP = ('课件.md', '课件.ipynb')


def code_files(chapter):
    """章节目录下的代码/材料文件：{相对路径: 内容}（排除 assets 与课件本身）。"""
    base = os.path.join(SRC, chapter)
    out = {}
    for dp, dn, fn in os.walk(base):
        dn[:] = [d for d in dn if d not in ('assets', '__pycache__', '.agents')]
        for f in fn:
            if f in CODE_SKIP or not f.endswith(CODE_EXT):
                continue
            full = os.path.join(dp, f)
            rel = os.path.relpath(full, base)
            try:
                out[rel] = open(full, encoding='utf-8').read().rstrip('\n')
            except UnicodeDecodeError:
                continue
    return out


def code_appendix(chapter, prev_chapter=None):
    """与上一章 diff：新增/修改的文件全文（沿用 Python 框架课对薄课件章的编排方式）。"""
    cur = code_files(chapter)
    if not cur:
        return ''
    prev = code_files(prev_chapter) if prev_chapter else {}
    added = [p for p in sorted(cur) if p not in prev]
    changed = [p for p in sorted(cur) if p in prev and cur[p] != prev[p]]
    removed = [p for p in sorted(prev) if p not in cur]
    if not (added or changed):
        return ''

    lang_of = {'.py': 'python', '.j2': 'jinja', '.json': 'json', '.toml': 'toml', '.md': 'markdown', '.txt': 'text'}

    def fence(content):
        """外层围栏长度按内容里最长反引号串 +1，避免被内容自带的 ``` 提前闭合。"""
        longest = max((len(m) for m in re.findall(r'`+', content)), default=0)
        bar = '`' * max(3, longest + 1)
        return f'{bar}{lang}\n{content}\n{bar}'

    parts = ['## 本章代码', '']
    parts.append(f'本章 `agent/` 工程相对上一章的变更：**新增 {len(added)} 个文件、修改 {len(changed)} 个文件**'
                 + (f'、删除 {len(removed)} 个' if removed else '') + '。以下为变更文件全文。')
    for label, files in (('新增', added), ('修改', changed)):
        for p in files:
            ext = os.path.splitext(p)[1]
            lang = lang_of.get(ext, 'text')
            parts.append(f'### {label}文件 `{p}`')
            parts.append(fence(cur[p]))
    if removed:
        parts.append('### 已删除文件\n\n' + '\n'.join(f'- `{p}`' for p in removed))
    return '\n\n'.join(parts)


def convert(chapter, no, title, desc, sidebar, math='preserve', dry=False, prev_chapter=None):
    md_path = os.path.join(SRC, chapter, '课件.md')
    parts = []
    if os.path.exists(md_path):
        text = open(md_path, encoding='utf-8').read().strip()
        text = re.sub(r'^#\s+.*\n', '', text, count=1)          # 去掉与 frontmatter title 重复的 H1
        text = localize_img_tags(text, chapter, dry)
        parts.append(text)
    for nb_path in sorted(glob.glob(os.path.join(SRC, chapter, '*.ipynb'))):
        nb = json.load(open(nb_path, encoding='utf-8'))
        first = True
        for idx, c in enumerate(nb['cells']):
            src = ''.join(c['source'])
            if c['cell_type'] == 'markdown':
                t = localize_img_tags(src, chapter, dry).strip()
                if not t:
                    continue
                if first and t.startswith('# '):
                    first = False
                    continue
                first = False
                # 源课件偶有「漏写闭合围栏」的笔误（如 19 章 cell15），会让整篇围栏错位；
                # 这里规整：markdown cell 内围栏数为奇数时补一个闭合（明显笔误顺带修）。
                if t.count('```') % 2 == 1:
                    t = t.rstrip() + '\n```'
                parts.append(t)
            elif c['cell_type'] == 'code':
                code = src.rstrip()
                if not code.strip():
                    continue
                lang, body = ('shell', re.sub(r'^\s*!', '', code, count=1)) if code.lstrip().startswith('!') else ('python', code)
                parts.append(f'```{lang}\n{body}\n```')
                parts.extend(cell_outputs(c, chapter, idx, dry))
    body = '\n\n'.join(parts)
    body = localize_md_images(body, chapter, dry)
    body = escape_angle_placeholders(body)
    if math == 'fence':
        body = math_fence(body)
    app = code_appendix(chapter, prev_chapter)
    if app:
        body = body + '\n\n' + app
    fm = (f"---\nsidebar_position: {no}\ntitle: '{no:02d}. {title}'\n"
          f'description: "{desc}"\ndisplayed_sidebar: {sidebar}\n---\n\n# {title}\n\n')
    return fm + body + '\n'


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('chapter')
    ap.add_argument('--no', type=int, required=True)
    ap.add_argument('--title', required=True)
    ap.add_argument('--desc', required=True)
    ap.add_argument('--sidebar', default='agentsCore')
    ap.add_argument('--math', default='preserve', choices=['preserve', 'fence'])
    ap.add_argument('--out', required=True)
    ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    mdx = convert(a.chapter, a.no, a.title, a.desc, a.sidebar, a.math, a.dry)
    if a.dry:
        print(mdx[:3000])
    else:
        os.makedirs(os.path.dirname(a.out), exist_ok=True)
        open(a.out, 'w', encoding='utf-8').write(mdx)
        print(f'已写入 {a.out}（{len(mdx)} 字符）')
