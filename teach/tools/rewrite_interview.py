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
    # ——— 第二批 ———
    ('0006-作用域.html', '巩固与延伸', '0006-作用域', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 跟你说「Python 传参是值传递」。但你调用 <code>def append_one(x): x.append(1)</code> 后，外面的列表真的变了。Python 传参到底算什么？`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（传参方式题）· 场景改写',
    breakdown: `准确说法：<strong>对象引用传递</strong>（pass-by-object-reference）——传的是对象的引用，不复制对象。于是不可变对象（int/str/元组）行为像值传递（重新绑定不影响外部），可变对象（list/dict）行为像引用传递（原地修改外部可见）。面试标准答法：可变对象传引用、不可变对象传值。`,
  },
  {
    type: 'mechanism',
    level: '初级岗常问',
    prompt: `函数内部找不到一个变量名时，Python 按什么顺序查找？global 和 nonlocal 分别干什么用？`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（LEGB 题）· 场景改写',
    breakdown: `<strong>LEGB</strong>：Local（函数内）→ Enclosing（外层函数）→ Global（模块）→ Builtin（内建）。<code>global</code> 声明「赋值指向模块级变量」；<code>nonlocal</code> 指向<strong>最近一层外层函数</strong>的变量（闭包里改外层计数器的唯一正路）。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了这段代码，一运行就 <code>UnboundLocalError</code>。审查并修复：
<pre><code>total = 0

def add(n):
    total += n   # AI 说「外面有 total」？
    return total

print(add(5))</code></pre>`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（作用域判定时机题）· 场景改写',
    breakdown: `Python 在<strong>编译期</strong>就判定名字归属：函数体内对 total 有赋值语句 → total 被判定为局部变量 → 右侧读取时局部变量还未赋值 → UnboundLocalError。修复：函数内声明 <code>global total</code>（或改成传参+返回的纯函数写法，后者更推荐——AI 时代尤其要引导 AI 写无副作用的函数）。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `你要让 AI 实现一个「带状态的计数器」。什么时候让它用闭包，什么时候用类？各举一个场景。`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（设计选择题）· 场景改写',
    breakdown: `<strong>闭包</strong>：状态单一、行为单一（计数器、缓存装饰器）——一个 <code>def make_counter()</code> + nonlocal 就够，代码最少；<strong>类</strong>：状态多、行为多（增删改查、多方法协作）——属性 + 方法更可读。追问加分：闭包在 pickle/调试/继承场景明显吃亏，AI 生成的多方法对象还是让 AI 用类。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `实现一个工厂函数 <code>make_counter(step)</code>（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 15 分钟',
      goal: '返回一个计数器函数：每次调用按 step 递增并返回当前值；提供 reset 能力；多个计数器实例互不干扰。',
      accept: ['nonlocal 正确使用（不用 global）', 'reset 后从 0 重新开始', '两个实例的计数互不影响'],
    },
    source: '任务基于《6.作用域》课程知识点（nonlocal 小节）· 场景化',
    breakdown: `思路：<code>def make_counter(step): count = 0; def counter(): nonlocal count; count += step; return count; ...</code>——count 是外层函数的局部变量，靠 nonlocal 在闭包里修改。坑：忘写 nonlocal 会 UnboundLocalError（参考审查题）；reset 要记得把闭包里的 count 归零而不是重开一个。`,
  },
]'''),
    ('0007-lambda表达式.html', '巩固与延伸', '0007-lambda表达式', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 在项目里到处写多行 lambda（含循环、赋值、try）。代码审查时你要求它改成 def。lambda 的边界在哪？什么场景才适合用？`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（lambda 局限题）· 场景改写',
    breakdown: `lambda 只能是<strong>单个表达式</strong>：不能有语句、赋值、注解、try——超过一行的逻辑用 def（有名字、可调试、可文档）。适合场景：<code>sorted(key=...)</code>、map/filter 的一次性小回调。AI 时代给 AI 的规则同样适用：lambda 只用于「一行能说清的表达式回调」。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `产品列表要先按公司名升序、同公司内按价格升序，正确写法是什么？背后的机制（元组 key + 排序稳定性）是什么？`,
    source: '考点来源：CSDN「Python 篇——常考的数据类型」（多级排序题）· 场景改写',
    breakdown: `<code>sorted(products, key=lambda p: (p['company'], p['price']))</code>：key 返回<strong>元组</strong>，依次按元组元素比较即多级排序。机制补充：sorted 是<strong>稳定排序</strong>——key 相同的元素保持原相对顺序，所以先按价格排、再按公司排，也能得到等价结果。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了一段「过滤后取前 3 个」的代码，第二次循环是空的。审查并修复：
<pre><code>nums = [1, 2, 3, 4, 5, 6]
evens = filter(lambda x: x % 2 == 0, nums)

print(list(evens))   # [2, 4, 6]
print(list(evens))   # []  ← 为什么？</code></pre>`,
    source: '考点来源：CSDN「Python 面试宝典（终极版）」（迭代器一次性题）· 场景改写',
    breakdown: `filter/map 返回的是<strong>惰性迭代器</strong>，只能完整遍历<strong>一次</strong>——第一次 list() 已把它耗尽。修复：结果要复用时立刻转成 list（<code>evens = list(filter(...))</code>），或每次重新生成。AI 生成的代码最爱把迭代器当列表反复用，审查时看到 map/filter 赋值给变量就要警觉。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `你要让 AI 写一段数据清洗：过滤 + 映射 + 排序一连串操作。什么时候用 map/filter/lambda 链，什么时候用列表推导？`,
    source: '考点来源：CSDN「Python 面试宝典（终极版）」（函数式组合题）· 场景改写',
    breakdown: `单步变换优先<strong>列表推导</strong>（可读性最好，[x*2 for x in xs if x>0]）；多步链式（清洗→转换→聚合）用推导嵌套会很难读，可以用 map/filter 分步命名中间结果，或上生成器表达式省内存。原则：让 AI 写「人能一眼读懂的代码」优先于「最短的代码」。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个产品列表处理器（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 15 分钟',
      goal: '输入产品字典列表：过滤掉库存为 0 的项，按（公司名, 价格）两级排序，输出前 N 个；整个处理链允许用 lambda/推导式任意组合。',
      accept: ['两级排序结果正确（公司升序、同公司价格升序）', '库存过滤正确', '输出条数受 N 限制'],
    },
    source: '任务基于《7.lambda表达式》课程知识点（排序与函数式小节）· 场景化',
    breakdown: `思路：<code>filter(lambda p: p['stock'] > 0, ...)</code> 过滤 → <code>sorted(key=lambda p: (p['company'], p['price']))</code> 两级排序 → 切片取前 N。坑：filter 迭代器不能复用（审查题同款）；取前 N 用切片 <code>[:n]</code> 而不是 sort 之后再 filter。`,
  },
]'''),
    ('0009-对象的类型.html', '巩固与延伸', '0009-对象的类型', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的代码判断两个 <code>User</code> 对象相等，结果 False：
<pre><code>u1 = User('张三', 18)
u2 = User('张三', 18)
print(u1 == u2)   # False</code></pre>
为什么？怎么让 == 按业务规则工作？`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（is vs == 题）· 场景改写',
    breakdown: `默认的 <code>__eq__</code> 继承自 object，行为就是<strong>身份比较（is）</strong>——两个不同实例必然 False。要让 == 按业务规则工作：类里实现 <code>__eq__</code>（比较关键字段）。同时记住：实现 __eq__ 会让实例变得<strong>不可哈希</strong>（用于 set/dict key 会报错），需要时配套实现 __hash__ 或声明不可哈希。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `Agent 工具注册表要校验「参数是否为某类型的实例」。你该用 type 还是 isinstance？为什么？`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（type vs isinstance 题）· 场景改写',
    breakdown: `用 <code>isinstance</code>：它<strong>兼容继承</strong>（子类实例也算基类实例），type 是严格相等（type(x) is SomeClass 才为 True）。工具系统允许用户传入自定义子类扩展时，isinstance 不会误杀。只在「必须精确到某个类、拒绝子类」时才用 type。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的类型判断代码，逐条审查对错并说明：
<pre><code>print(isinstance(1, int))          # ?
print(isinstance(int, type))       # ?
print(isinstance(True, int))       # ?
print(type(1) is int)              # ?
print(isinstance(int, int))        # ?</code></pre>`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（类型体系题）· 场景改写',
    breakdown: `True / True / True / True / False。要点：<strong>一切皆对象</strong>——int 这个类本身是 type 的实例；bool 是 int 的子类（True 是 1 的别名子类实例）；int 的实例是整数对象，而 int 是类对象、不是自己的实例。这类题考的是「类型体系」心智模型，AI 生成类型反射代码时最容易在最后一条上犯错。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `你要让 AI 实现「按配置动态生成数据模型类」。用 type 工厂动态建类和写死 class 定义各适合什么场景？type 工厂的签名是什么？`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（type 工厂题）· 场景改写',
    breakdown: `<code>type(name, bases, namespace)</code> 动态创建类。适合：类在<strong>运行时才知道</strong>的场景（配置驱动的模型、ORM 的模型生成、序列化框架）；写死 class 适合静态业务代码。注意：动态建类失去 IDE 提示和静态检查，AI 生成的 ORM 里到处都是，能看懂机制才能审查。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个 <code>validate_params</code> 参数校验工具（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 15 分钟',
      goal: '给定类型映射（如 [\'name\': str, \'count\': int]）与一批实际参数，用 isinstance 校验每个参数类型，输出不匹配项的清晰报告。',
      accept: ['isinstance 校验（子类能通过基类检查）', '不匹配项报告包含参数名/期望/实际', 'bool 不会被误当 int 报错处理（明确 bool 也属于 int 时按需放行）'],
    },
    source: '任务基于《9.对象的类型》课程知识点（类型判断小节）· 场景化',
    breakdown: `思路：遍历映射，<code>isinstance(value, expect)</code> 判断；报告拼上参数名、期望类型、实际类型。坑：bool 是 int 的子类，校验 int 时 bool 会静默通过——要不要放行是业务决策，工具里应当显式处理（要么放行并注释，要么单独拒绝）。`,
  },
]'''),
    ('0010-对象的创建过程.html', '巩固与延伸', '0010-对象的创建过程', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的单例类每次实例化都会重新执行 <code>__init__</code>，把计数器清零了。为什么？__new__ 和 __init__ 的分工是什么？`,
    source: '考点来源：CSDN「一份高质量的 Python 基础知识笔试题完整解析」（__new__ vs __init__ 题）· 场景改写',
    breakdown: `<code>__new__</code> 负责<strong>创建并返回实例</strong>（类方法，先于 __init__ 执行），<code>__init__</code> 负责<strong>初始化实例属性</strong>。单例里 __new__ 返回缓存的同一实例，但 __init__ 每次实例化都会在「这个返回的实例」上再跑一遍——所以单例的初始化要放进 __new__ 只执行一次，或 __init__ 里做幂等保护。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `用 __new__ 实现单例的完整机制是什么？多线程下怎么保证只创建一次？`,
    source: '考点来源：51CTO「你想要的 Python 面试题都在这里了」（单例/线程安全单例题）· 场景改写',
    breakdown: `<code>__new__</code> 里判断 <code>cls._instance</code> 是否已存在：不存在则 <code>super().__new__(cls)</code> 创建并缓存，存在则直接返回缓存。多线程版加<strong>双重检查 + threading.Lock</strong>：先无锁判空、再拿锁判空创建，避免每次实例化都争锁。AI 时代这题的新考法：你的 Agent 服务里哪些对象应该是单例（配置、连接池），哪些绝对不能（请求级状态）。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 在项目里把「当前登录用户」也写成了单例。审查这段设计：单例模式的代价是什么？哪些对象不该是单例？`,
    source: '考点来源：CSDN「一份高质量的 Python 基础知识笔试题完整解析」（设计权衡题）· 场景改写',
    breakdown: `代价：<strong>全局可变状态</strong>（隐藏耦合、测试难隔离、并发下互相污染）；多进程部署下每个 worker 各有一份「单例」，根本不单；序列化/热更新也会破坏。不该单例的：请求级状态（当前用户！）、带状态的业务对象。适合单例的：进程内配置、连接池、无状态工具。AI 生成代码时「当前用户」放全局是高频事故。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `面试官问：Python 里最「正统」的单例是什么？为什么模块级单例比手写 __new__ 更推荐？`,
    source: '考点来源：51CTO「你想要的 Python 面试题都在这里了」（模块级单例题）· 场景改写',
    breakdown: `<strong>模块只被导入执行一次</strong>（有 sys.modules 缓存）——模块里的实例天然全局唯一，即「模块级单例」：<code># config.py\nCONFIG = load_config()</code>。比手写 __new__ 单例更推荐：零魔法代码、可读、天然线程安全（导入锁）、测试时可重载模块。面试官爱听的答案：先问「你真的需要单例吗」，需要就用模块级。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `实现一个线程安全单例（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '用 __new__ + threading.Lock 实现单例类；启动 20 个线程并发实例化，断言所有线程拿到同一对象；说明为什么锁能保证只创建一次。',
      accept: ['并发下所有实例 is 同一对象', '锁放在判空之外、创建代码之内（双重检查）', '能解释创建只发生一次的原因'],
    },
    source: '任务基于《10.对象的创建过程》课程知识点（__new__/单例小节）· 场景化',
    breakdown: `思路：类属性 <code>_instance</code> + <code>_lock = threading.Lock()</code>；__new__ 里先无锁判空，未命中再 with lock 二次判空后创建。坑：忘记类属性放锁（每个实例一把锁就失效）；__init__ 每次仍会执行（陷阱题同款），把初始化幂等化或用标志位跳过。`,
  },
]'''),
]


def rewrite(path, questions_script):
    with open(path, encoding='utf-8') as f:
        src = f.read()
    src = src.replace('6 道面试实战（中/高/专家各 2 道）', '面试实战')
    start = src.index('      <h2>💼 面试实战</h2>')
    end = src.index('</section>', start) + len('</section>')
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
    for fname, _anchor, lesson, questions in LESSONS:
        if questions is None:
            continue  # 已完成课程，跳过
        rewrite(BASE + '/' + fname, make_questions(lesson, questions))


if __name__ == '__main__':
    main()
