# -*- coding: utf-8 -*-
"""把互动课程测验的选项顺序确定性洗牌，修复「答案全是 A」问题。

- 仅处理 quiz-q 选择题块（分级测验 + 最终考核；面试实战已是弹框开放题，无选项）
- 确定性：以「文件名 + 题序号」为随机种子，同文件重跑结果一致
- 正确选项连同内容一起移动，data-correct 同步更新为新位置
"""
import glob, os, random, re, sys

BASE = '/Users/zp/Code/doc-site/.claude/worktrees/interview-v2/teach/lessons'

BUTTON_RE = re.compile(r'<button class="quiz-option">(.*?)</button>', re.S)
QCORRECT_RE = re.compile(r'(<div class="quiz-q" data-correct=")(\d+)(">)')


def shuffle_one(block, seed):
    """对一个 quiz-q 块做选项洗牌，返回新块与新正确下标。

    幂等实现：排序键 = random(种子 + 选项文本)，只依赖选项内容而与当前顺序无关，
    因此无论当前处于什么顺序，重跑都收敛到同一结果（正确选项以文本识别）。
    """
    m = QCORRECT_RE.search(block)
    if not m:
        return block, None
    correct_idx = int(m.group(2))
    buttons = BUTTON_RE.findall(block)
    if len(buttons) < 2:
        return block, None
    correct_text = buttons[correct_idx]
    # 每个选项文本分配一个与顺序无关的确定性排名
    rank = {b: random.Random(seed + '::' + b).random() for b in buttons}
    order = sorted(range(len(buttons)), key=lambda i: rank[buttons[i]])
    new_buttons = [buttons[i] for i in order]
    new_correct = new_buttons.index(correct_text)
    # 重建 quiz-options 内容
    def repl_buttons(match):
        return ('<div class="quiz-options">\n'
                + '\n'.join(f'            <button class="quiz-option">{b}</button>'
                            for b in new_buttons)
                + '\n          </div>')
    new_block = re.sub(
        r'<div class="quiz-options">.*?</div>',
        repl_buttons,
        block, count=1, flags=re.S)
    new_block = QCORRECT_RE.sub(
        lambda mm: mm.group(1) + str(new_correct) + mm.group(3),
        new_block, count=1)
    return new_block, new_correct


def main():
    changed = 0
    for p in sorted(glob.glob(BASE + '/*.html')):
        s = open(p, encoding='utf-8').read()
        # 按 quiz-q 切块：每个块从 '<div class="quiz-q"' 到块尾 '        </div>\n      </div>' 或下一个 quiz-q 前
        parts = re.split(r'(<div class="quiz-q" data-correct="\d+">)', s)
        if len(parts) == 1:
            continue
        fname = os.path.basename(p)
        out = [parts[0]]
        qidx = 0
        for i in range(1, len(parts), 2):
            header = parts[i]
            body = parts[i + 1] if i + 1 < len(parts) else ''
            # body 到 quiz-q 结束：找 explain 后的块结束（quiz-q 的闭合 </div>）
            end = body.find('</div>')
            # explain 是块内最后一个子元素：找其结束再找 quiz-q 闭合
            # 简化：quiz-q 闭合 = 出现在 explain 内容之后的第一个 '\n        </div>'
            close = re.search(r'\n        </div>', body[body.find('quiz-explain'):] if 'quiz-explain' in body else body)
            if close is None:
                out.append(header); out.append(body); continue
            cut = body.find('quiz-explain')
            base = 0 if 'quiz-explain' not in body else cut
            close_pos = re.search(r'\n        </div>', body[base:])
            tail_start = base + close_pos.end()
            qbody = body[:tail_start]
            tail = body[tail_start:]
            # 洗牌块 = 开标签 + 块体（data-correct 在开标签上）
            qblock = header + qbody
            new_qblock, new_correct = shuffle_one(qblock, f'{fname}#{qidx}')
            if new_correct is not None:
                changed += 1
            out.append(new_qblock)
            out.append(tail)
            qidx += 1
        open(p, 'w', encoding='utf-8').write(''.join(out))
        print('shuffled:', fname, '(', qidx, '题 )')
    print('total questions shuffled:', changed)


if __name__ == '__main__':
    main()
