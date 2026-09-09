# -*- coding: utf-8 -*-
"""按《面试实战模板 v2》（teach/INTERVIEW-TEMPLATE.md）批量重写互动课程的面试实战小节。

用法：在 LESSONS 里登记课程文件 → 填 QUESTIONS 数组 → 运行本脚本。
- 幂等：已转换的课程重跑无副作用（interview.js 引用不重复插入）。
- 题内所有代码须先实际运行验证（NOTES.md 约束）；SQL 题在 pg16 容器实测。
- 转换后同步 static/teach/（cp lessons/assets），再 pnpm build。
"""
import re

BASE = '/Users/zp/Code/doc-site/.claude/worktrees/interview-v2/teach/lessons'

INTRO = (
    '<p>与真实面试官对练：弹框里一次一道，先写下答案再核对思路，答案自动保存在本地。'
    '题型覆盖陷阱、机制、代码审查、设计选型与 AI 辅助场景，题干都放在当下的 AI 工作环境里'
    '（AI 生成的代码、Agent 工具开发、慢查询诊断）——练的就是你实际要面对的面试。</p>'
    '<button type="button" class="interview-launch">开始面试实战</button>'
)


def make_questions(lesson, questions):
    """把题组渲染成内嵌数据脚本（window.__interview）。"""
    return ('      <script>\n'
            f'        window.__interview = {{\n'
            f'          lesson: {lesson!r},\n'
            f'          questions: {questions},\n'
            '        };\n'
            '      </script>')


LESSONS = [
    # (文件名, 巩固小节标题, lesson 键, 题组 JS 文本)
    # ——— 已完成试点（保持幂等） ———
    ('0008-类和对象.html', '巩固与延伸', None, None),
    ('db-0006-索引.html', '巩固延伸', None, None),
    # ——— 第一批 ———
    ('0003-python基本语法.html', '巩固与延伸', '0003-python基本语法', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 帮你的计费模块写了个比较：<code>0.1 + 0.2 == 0.3</code> 结果是 False，它还以为写错了。为什么？这类比较正确姿势是什么？`,
    source: '考点来源：腾讯云「分享 10 个高频 Python 面试题」（浮点精度题）· 场景改写',
    breakdown: `0.1、0.2 在二进制浮点里是<strong>无限循环小数</strong>，存的是近似值，加出来的不是精确的 0.3。涉及钱的比较/相等判断：金额用 <code>Decimal</code>（字符串构造），一般数值用 <code>math.isclose(a, b, rel_tol=1e-9)</code>，绝不直接 ==。`,
  },
  {
    type: 'mechanism',
    level: '初级岗常问',
    prompt: `<code>a = [1, 2]</code>，<code>b = a</code>，然后 <code>b.append(3)</code>。a 是什么？为什么？变量、对象、引用三者什么关系？`,
    source: '考点来源：牛客网「最强 Python 面试题之 Python 基础题」· 场景改写',
    breakdown: `a 也变成 <code>[1, 2, 3]</code>。变量是<strong>贴在对象上的标签</strong>：a = [1,2] 创建一个列表对象并贴标签 a；b = a 只是给同一对象再贴一张标签 b——append 改的是那唯一的对象。判断「同一个对象」用 <code>is</code>；AI 生成代码里最常见的别名 bug 就是这个。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了一个「判断两个值是否相等」的工具，你在代码审查。逐行判断输出并说明坑：
<pre><code>def same(a, b):
    return a is b

print(same(256, 256))                      # ?
x, y = int('1000'), 1000 * 1
print(same(x, y))                          # ?
print(same('hello', ''.join(['he', 'llo'])))  # ?</code></pre>`,
    source: '考点来源：腾讯云「分享 10 个高频 Python 面试题」（小整数缓存/字符串驻留题）· 场景改写（结论经 CPython 实测校准）',
    breakdown: `<code>is</code> 判断的是<strong>对象身份</strong>，不是值相等。第一行 True：小整数（-5~256）有全局缓存池，任何写法都是同一对象；后两行 False：<code>int('1000')</code>、<code>''.join(...)</code> 都是运行时新建的对象，与比较方的常量不是同一身份——同一份代码对「相等」的值一会儿 True 一会儿 False，就是暗雷本身。修复：值比较一律 <code>==</code>，只有与 None 比较（或真要判断身份）才用 is。`,
  },
  {
    type: 'design',
    level: '初级岗常问',
    prompt: `你要用 AI 写一个「十六进制颜色转 RGB」小工具（输入如 <code>'FF8800'</code>）。给 AI 的提示词里应该要求哪些输入校验？为什么？`,
    source: '考点来源：牛客刷题——Python 篇（2）类型转换（十六进制转换题）· 场景改写',
    breakdown: `至少要四层：① 长度与格式（6 位十六进制、可带 # 前缀）；② 字符集（只用 0-9a-fA-F）；③ 用 <code>int(s, 16)</code> 转换，别用 float；④ 输出范围断言（0~255）与类型（int）。因为 AI 生成的代码对「非法输入」最不上心——面试官问这道题，考的其实是你能不能给 AI 写出<strong>可验收的规格</strong>。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个 <code>parse_config</code> 配置值解析小工具（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 15 分钟',
      goal: '读入一组配置字符串（如 [\'3.14\', \'0xFF\', \'abc\', \'0.1+0.2\']），正确转换成 int/float/十六进制，浮点相等判断用 isclose，输出转换结果与无法解析的警告。',
      accept: ['十六进制字符串正确转 int', '浮点比较使用 math.isclose 而非 ==', '无法解析的输入有明确警告而非崩溃'],
    },
    source: '任务基于《3.python基本语法》课程知识点 · 来源层级：一手（Python 官方文档浮点/内置函数章节）场景化',
    breakdown: `思路：按 <code>int(s, 0)</code> / <code>float(s)</code> 逐级尝试转换并捕获 ValueError；浮点结果用 <code>math.isclose</code> 做容差比较；解析失败收集进 warnings 列表。坑：<code>int('FF', 0)</code> 会报错（无前缀不会猜十六进制），十六进制要用 <code>int(s, 16)</code> 或带 <code>0x</code> 前缀。`,
  },
]'''),
    ('0004-容器类型.html', '巩固与延伸', '0004-容器类型', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 帮你写「复制一份配置再改」的代码，用了 <code>copy.copy()</code>：嵌套的列表改一处、两处一起变。为什么？深拷贝和浅拷贝差在哪？`,
    source: '考点来源：CSDN「Python 面试八股大全｜数据类型、深浅拷贝」· 场景改写',
    breakdown: `<code>copy.copy()</code> 是<strong>浅拷贝</strong>：只复制外层容器，内层元素仍指向原来的对象——嵌套列表（或其他可变对象）还是共享的。需要完全独立时用 <code>copy.deepcopy()</code>。真实项目里 AI 生成的「复制后修改」代码是最常见的埋雷点。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `在交互式解释器里逐行输入 <code>a = 256; b = 256</code>，<code>a is b</code> 是 True；改成 <code>a = 1000; b = 1000</code> 就是 False。但同一个 .py 文件里写 <code>1000 is 1000</code> 又可能是 True。为什么？`,
    source: '考点来源：腾讯云「分享 10 个高频 Python 面试题」（小整数缓存题）· 场景改写（结论经 CPython 实测校准）',
    breakdown: `两层机制叠加：① CPython 启动时预建 <strong>-5 ~ 256</strong> 的整数缓存池，范围内任何写法都指向同一对象，is 恒 True；② 范围外没有缓存，但<strong>编译器会合并同一编译单元内的相同常量</strong>——同一个 .py 文件里的两个 1000 字面量是同一对象（is True），交互式逐行（每行独立编译）则各自新建（is False）。is 的结果随运行方式而变，这正是值比较不能依赖 is 的铁证：用 <code>==</code>。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了一段「删除列表中的偶数」：
<pre><code>def drop_evens(nums):
    for x in nums:
        if x % 2 == 0:
            nums.remove(x)
    return nums

print(drop_evens([1, 2, 4, 5, 8]))  # 结果不对</code></pre>
找出 bug，给出至少两种正确写法。`,
    source: '考点来源：红客联盟「Python 面试必避 20 个代码坑」（遍历中修改题）· 场景改写',
    breakdown: `<strong>边遍历边修改列表会漏删</strong>：remove 后元素前移，迭代器按索引走就跳过了下一个元素（[1,2,4,5,8] 会漏掉 4）。修复：① 列表推导 <code>[x for x in nums if x % 2]</code>；② 遍历副本 <code>for x in nums[:]</code>；③ 倒序遍历 <code>for i in range(len(nums)-1, -1, -1)</code>。AI 生成代码的三大经典坑之一，面试官必问。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `你要用 AI 实现「订单列表去重且保持顺序」（重复定义：完全相同的记录）。你会在提示词里指定哪种方案？为什么不用 set(nums)？`,
    source: '考点来源：腾讯云「分享 10 个高频 Python 面试题」（去重保序题）· 场景改写',
    breakdown: `<code>set(nums)</code> 会<strong>丢失顺序</strong>。保序去重的标准姿势：<code>list(dict.fromkeys(nums))</code>（现代 Python）或「seen 集合 + 列表」双结构。追问加分点：如果订单是元组（可哈希）可以直接进 set；如果含列表（不可哈希）要先转成可哈希 key——这正是「元组可哈希」考点的落点。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个订单去重保序小工具（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 15 分钟',
      goal: '输入一批重复订单（元组列表，如 (订单号, 商品, 数量)），输出保序去重后的列表，并统计每笔重复订单出现了几次。',
      accept: ['去重后保持首次出现顺序', '重复次数统计正确', '元组作为可哈希 key 使用正确'],
    },
    source: '任务基于《4.容器类型》课程知识点（去重保序/元组可哈希小节）· 场景化',
    breakdown: `思路：遍历时用 dict 记录每个订单首次位置和出现次数（元组可哈希，直接当 key）；输出按首次位置排序。坑：不要把「顺序」交给 set；用 <code>dict.fromkeys</code> 一行去重虽然简洁，但统计次数需要额外一趟遍历——两件事可以合并成一次遍历。`,
  },
]'''),
    ('0005-函数.html', '巩固与延伸', '0005-函数', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 帮你写了个工具函数：<code>def add_item(item, items=[])</code>，多次调用后 items 里出现了上次调用的数据。为什么？正确写法是什么？`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（可变默认参数题）· 场景改写',
    breakdown: `<strong>默认参数在函数定义时只求值一次</strong>：那个 [] 是所有调用共享的同一列表对象。修复：默认值用 <code>None</code>，函数体内再建：<code>def add_item(item, items=None): items = items or []</code>。可变默认参数是 Python 面试第一陷阱，AI 生成代码也最爱犯。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `什么是闭包？闭包成立的三个要素是什么？为什么内层函数能「记住」外层函数的变量？`,
    source: '考点来源：itying「分享下你遇到过的 Python 经典面试题」（闭包题）· 场景改写',
    breakdown: `闭包 = <strong>内层函数 + 它捕获的外层变量（自由变量）</strong>。三要素：① 嵌套函数；② 内层引用外层变量；③ 外层函数返回内层函数。机制：函数对象带 <code>__closure__</code>（cell 元组）保存被引用的外层变量，所以外层函数退出后变量依然活着。AI 时代这题的新问法：为什么 Agent 工具的回调能记住配置——答案就是闭包。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了一个装饰器，但被装饰函数的文档和名字都变了。审查下面的代码并修复：
<pre><code>def timer(fn):
    def wrapper(*args, **kwargs):
        import time
        t0 = time.perf_counter()
        out = fn(*args, **kwargs)
        print(f'{fn.__name__} 用时 {time.perf_counter() - t0:.4f}s')
        return out
    return wrapper

@timer
def fetch_data(url):
    \"\"\"从接口拉数据\"\"\"
    return url

print(fetch_data.__name__, fetch_data.__doc__)</code></pre>`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（函数元信息题）· 场景改写',
    breakdown: `不处理时 <code>fetch_data.__name__</code> 变成 wrapper、__doc__ 变成 None——<strong>函数元信息丢失</strong>，日志、文档、反射（如 Agent 工具注册表读 __name__/__doc__ 生成工具描述）全都踩坑。修复：<code>@functools.wraps(fn)</code> 加在 wrapper 上（拷贝 __name__/__doc__/__module__ 等）。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `你要让 AI 给一批 API 函数统一加「重试 + 耗时日志」能力，重试次数各函数不同。你该让它写普通装饰器还是带参装饰器？提示词里要强调哪些点？`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（带参装饰器题）· 场景改写',
    breakdown: `需要 <strong>带参装饰器</strong>（装饰器工厂）：<code>@retry(times=3)</code> 这层先接收参数、返回真正的装饰器。提示词必须强调：① 默认值给合理兜底；② <code>@functools.wraps</code> 保留元信息（上一题的坑）；③ 异常要区分「可重试」与「不可重试」，别把参数错误也重试 3 遍；④ 重试间加退避延迟。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `实现一个带参装饰器 <code>@retry(times, delay)</code>（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '装饰一个「模拟网络请求、按次数随机失败」的函数，重试至成功或次数耗尽后抛异常；重试时打印第几次；被装饰函数的 __name__ / __doc__ 保持不变。',
      accept: ['重试次数与延迟符合参数', '次数耗尽后抛出异常（而非吞掉）', 'functools.wraps 保留了 __name__ / __doc__'],
    },
    source: '任务基于《5.函数》课程知识点（装饰器小节）· 来源层级：一手（Python 官方文档 functools 章节）场景化',
    breakdown: `思路：外层 <code>def retry(times, delay)</code> 返回装饰器；wrapper 里 for 循环 + try/except + time.sleep(delay)；耗尽后 raise 最后一次异常；记得 <code>@functools.wraps(fn)</code>。坑：只捕获目标异常（如 ConnectionError），别吞 KeyboardInterrupt 或参数类型错误；delay 要可配置为 0 方便测试。`,
  },
]'''),
]


def rewrite(path, end_anchor, questions_script):
    with open(path, encoding='utf-8') as f:
        src = f.read()
    src = src.replace('6 道面试实战（中/高/专家各 2 道）', '面试实战')
    start = src.index('      <h2>💼 面试实战</h2>')
    end = src.index(end_anchor, start)
    new_section = ('    <section>\n'
                   '      <h2>💼 面试实战</h2>\n'
                   + INTRO + '\n'
                   + questions_script + '\n'
                   '    </section>')
    src = src[:start] + new_section + '\n\n' + src[end:]
    if 'assets/interview.js' not in src:
        src = src.replace(
            '<script src="../assets/quiz.js"></script>',
            '<script src="../assets/quiz.js"></script>\n  <script src="../assets/interview.js"></script>',
        )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print('rewritten:', path)


def main():
    for fname, anchor, lesson, questions in LESSONS:
        if questions is None:
            continue  # 试点课已完成，跳过
        rewrite(BASE + '/' + fname, anchor, make_questions(lesson, questions))


if __name__ == '__main__':
    main()
