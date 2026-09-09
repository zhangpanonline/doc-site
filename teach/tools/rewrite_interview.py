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
    # ——— 第三批 ———
    ('0011-可调用对象.html', '巩固与延伸', '0011-可调用对象', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写了一个 <code>class Logger</code>，里面定义了 <code>def __call__(self, msg)</code>，然后 <code>log = Logger()</code>、<code>log('开始任务')</code>——实例居然能当函数调用。这个机制叫什么？哪些内置对象也是可调用的？`,
    source: '考点来源：腾讯云「剖析 Python 面试知识点（一）：魔法方法、闭包/自省、装饰器/生成器」· 场景改写',
    breakdown: `定义了 <code>__call__</code> 的类，其实例就是<strong>可调用对象</strong>——<code>obj(...)</code> 等价于 <code>type(obj).__call__(obj, ...)</code>。常见可调用对象：函数、类（调用即实例化）、带 __call__ 的实例、partial 对象。它在 Agent 工具系统里很常见（工具注册的往往就是可调用对象而非裸函数）。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `面试官追问：需要「带状态的函数」（计数器、带前缀的日志回调），除了闭包，还有哪些实现方式？各有什么特点？`,
    source: '考点来源：腾讯云「剖析 Python 面试知识点（一）」（场景选择题）· 场景改写',
    breakdown: `① <strong>可调用对象</strong>：状态存实例属性，行为在 __call__，可继承、可加方法——最工程化；② <strong>偏函数</strong>：<code>functools.partial(log, prefix='[A]')</code> 固定部分参数，适合「同一函数不同配置」的轻量场景；③ <strong>闭包</strong>：最轻但难扩展。面试加分点：能说出三者取舍（可扩展性 / 简洁性 / 固定参数）。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 想给一个实例「挂上 __call__ 方法」让它可调用，审查这段代码：
<pre><code>class Task:
    pass

t = Task()
t.__call__ = lambda: 'called'
print(t())   # TypeError: 'Task' object is not callable</code></pre>
为什么失败？特殊方法的查找规则是什么？`,
    source: '考点来源：腾讯云「剖析 Python 面试知识点（一）」（调用协议题）· 场景改写',
    breakdown: `<strong>特殊方法在类型上查找，不在实例字典上</strong>：t() 调用的是 type(t).__call__，实例属性里的 __call__ 被忽略（也更快——免去每次查找实例字典）。修复：在类里定义 <code>__call__</code>。同理 __getattr__、__len__ 等都不能往实例上挂。AI 经常犯这种「动态打补丁」的错。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `你要让 AI 实现一个「带前缀的日志器」：每个模块一个实例，前缀可配置、可以再挂新方法。闭包、可调用对象、类装饰器，你让它用哪个？为什么？`,
    source: '考点来源：腾讯云「剖析 Python 面试知识点（一）」（设计选择题）· 场景改写',
    breakdown: `首选<strong>可调用对象</strong>：前缀存 <code>self.prefix</code>（实例间隔离），行为在 <code>__call__</code>，后续要加 <code>set_level()</code> 等方法直接加——闭包做不到「再加方法」这一条。类装饰器适合「装饰器本身要带复杂状态」的场景。原则：状态 + 多行为 → 对象；单行为轻状态 → 闭包。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `实现一个可调用的 <code>RetryClient</code>（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '类实现 __call__(url)：内部带重试次数、日志前缀属性；调用时打印 [前缀] 尝试第 N 次，失败按配置重试后抛出；两个实例前缀互不干扰。',
      accept: ['实例可直接像函数一样调用', '重试与日志前缀都来自实例属性', '两个实例状态隔离'],
    },
    source: '任务基于《11.可调用对象》课程知识点（__call__ 小节）· 场景化',
    breakdown: `思路：<code>__init__</code> 里存 <code>self.prefix / self.retries</code>；<code>__call__</code> 里循环重试并打印。坑：实例属性与类属性别混用（幽灵共享同款坑）；__call__ 的返回值要正常透传，重试耗尽后 raise 而不是返回 None。`,
  },
]'''),
    ('0012-元类.html', '巩固与延伸', '0012-元类', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `什么是元类？<code>type(int)</code> 等于什么？什么场景下会真的用到元类？`,
    source: '考点来源：博客园「史上最全 python 面试题详解（三）」（元类概念题）· 场景改写',
    breakdown: `元类 = <strong>类的类</strong>：创建类的工厂，默认是 type（<code>type(int)</code> 就是 <code>type</code> 自己）。真实场景：ORM 的模型生成、类定义时的规范检查（命名/抽象方法）、自动注册表（把子类收集进 registry）、给类批量加属性。其余时候别用——元类难读难调试，AI 生成框架代码里常见，能看懂才能审查。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `面试官追问单例：用元类实现单例的核心思路是什么？为什么它比 __new__ 方案更「干净」？`,
    source: '考点来源：51CTO「你想要的 Python 面试题都在这里了」（单例元类题）· 场景改写',
    breakdown: `在元类的 <code>__call__</code> 里拦实例化：<code>class SingletonMeta(type): def __call__(cls, *a, **kw): if not cls._instance: cls._instance = super().__call__(*a, **kw); return cls._instance</code>。比 __new__ 干净：① __init__ 只在首次创建时执行（因为后续根本不再走实例化）；② 单例逻辑与业务类解耦，<code>class DB(metaclass=SingletonMeta)</code> 一行接入。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 把两个带不同元类的库混用，运行时报 <code>TypeError: metaclass conflict</code>。审查：为什么会冲突？怎么解决？
<pre><code>class A(metaclass=MetaA): pass
class B(metaclass=MetaB): pass
class C(A, B): pass   # TypeError!</code></pre>`,
    source: '考点来源：博客园「史上最全 python 面试题详解（三）」（元类冲突题）· 场景改写',
    breakdown: `C 的元类必须是 A、B 元类的<strong>共同子类</strong>（派生关系链中最具体者）；MetaA、MetaB 互不继承 → 找不到合法元类 → TypeError。修复：让 <code>MetaB(MetaA)</code>（元类沿继承方向派生），或显式 <code>class C(A, B, metaclass=Common)</code>（Common 继承两者）。审查库混用代码时这个错误是红灯信号。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `元类的 <code>__new__</code>、<code>__init__</code>、<code>__call__</code> 分别在什么时候触发？各自适合干什么？`,
    source: '考点来源：博客园「史上最全 python 面试题详解（三）」（元类分工题）· 场景改写',
    breakdown: `<code>__new__</code>：<strong>类对象创建时</strong>（定义 class 语句即触发）——适合改类结构（收集方法、加属性）；<code>__init__</code>：类对象初始化时——适合校验类定义；<code>__call__</code>：<strong>实例化时</strong>（每次 Obj() 触发）——适合拦实例化（单例元类就是它）。记法：元类管类的三件事 = 创建、初始化、实例化。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `用元类实现两个约束（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '① 类定义时检查：所有方法名必须小写开头（如 get_user 合法、GetUser 报错）；② 所有被该元类管理的类自动注册进全局 registry（类名 → 类）。',
      accept: ['违规命名在类定义时立刻报错（不是实例化时）', 'registry 里能找到全部子类', '元类对业务代码零侵入（class 一行接入）'],
    },
    source: '任务基于《12.元类》课程知识点 · 来源层级：一手（Python 官方文档 3.3.3 自定义类创建）场景化',
    breakdown: `思路：<code>class CheckMeta(type): def __new__(mcs, name, bases, ns): 遍历 ns 检查 callable 成员名 islower()；super().__new__ 建类后写 registry[name] = cls</code>。坑：检查要在建类<strong>之前</strong>（__new__ 里，raise 阻断创建）；django 风格方法名要放行（__xxx__ 与 _ 开头）；registry 用类属性挂在元类上避免子类覆盖。`,
  },
]'''),
    ('0013-装饰器.html', '巩固与延伸', '0013-装饰器', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `<code>@deco</code> 放在函数头上，等价于什么？装饰器的原理与作用一句话讲清楚。`,
    source: '考点来源：博客园「Python 面试基础」（装饰器原理题）· 场景改写',
    breakdown: `等价式：<code>@deco\ndef f(): ...</code> == <code>f = deco(f)</code>——装饰器就是<strong>接收函数、返回新函数</strong>的高阶函数，作用是把横切关注点（日志/计时/权限/重试/缓存）从业务逻辑里剥离。AI 时代的新问法：Agent 工具注册、限流、埋点全用它，是「函数一等公民」最直接的应用。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `装饰器什么时候执行？两个装饰器叠加 <code>@d1\n@d2\ndef f()</code>，执行顺序是怎样的？`,
    source: '考点来源：博客园「Python 面试基础」（装饰器时机题）· 场景改写',
    breakdown: `装饰<strong>发生在函数定义时</strong>（模块导入/类体执行时跑一次），之后每次调用跑的是 wrapper。叠加顺序：<strong>自下而上</strong>执行装饰（f = d1(d2(f))），所以离函数近的 @d2 先包、@d1 再包外层——调用时则先过 d1 的 wrapper。理解顺序是写多层装饰器（先鉴权后限流再日志）的前提。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了一个「生产级」装饰器，审查问题并给出修复版：
<pre><code>def timer(fn):
    def wrapper(*args, **kwargs):
        import time
        t0 = time.perf_counter()
        fn(*args, **kwargs)          # ← 三个问题
        print(f'耗时 {time.perf_counter() - t0:.4f}s')
    return wrapper

@timer
def fetch(url):
    return 'data'</code></pre>`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（通用装饰器题）· 场景改写',
    breakdown: `三个问题：① <strong>返回值丢失</strong>——fn 的结果没 return，被装饰的 fetch 变 None；② 没加 <code>@functools.wraps(fn)</code>，元信息（__name__/__doc__）丢失；③ 异常照样计时但行为没说明（可选择记录后 re-raise）。修复版：wrapper 里 <code>result = fn(*args, **kwargs); return result</code> + wraps + try/finally 计时。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `面试官问缓存装饰器：<code>functools.lru_cache</code> 的机制是什么？哪些函数不能用它缓存？`,
    source: '考点来源：老男孩 IT 教育「Python 基础教程之最常见的面试题」（缓存装饰器题）· 场景改写',
    breakdown: `机制：<strong>参数作 key</strong>（LRU 淘汰）缓存返回值，命中直接返回。不能用的情况：① 参数<strong>不可哈希</strong>（list/dict 传参会直接 TypeError）；② 函数有<strong>副作用</strong>或返回可变对象被外部修改（缓存会被污染）；③ 依赖外部状态（时间、DB 实时数据）的函数——缓存会让结果过期。AI 给代码随手加缓存是线上事故高发区。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `实现一个生产级通用装饰器 <code>@log_calls</code>（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '装饰任意函数：打印调用次数、参数与返回值（可配置开关）；任意参数透传（*args/**kwargs）；返回值原样返回；functools.wraps 保留元信息。',
      accept: ['任意签名函数都能装饰（含关键字参数）', '返回值不被吞掉', '__name__ / __doc__ 保留', '调用计数准确'],
    },
    source: '任务基于《13.装饰器》课程知识点 · 来源层级：一手（Python 官方文档 functools 章节）场景化',
    breakdown: `思路：外层工厂接配置，内层 wrapper 用 *args/**kwargs 透传并 return 原结果；计数放闭包或函数属性。坑：审查题的三件套（返回值 / wraps / 异常）一个都不能漏；多个被装饰函数要各自独立计数（计数挂函数属性而非全局变量）。`,
  },
]'''),
    ('0014-魔术方法.html', '巩固与延伸', '0014-魔术方法', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `继承不可变类型 <code>tuple</code> 时想过滤掉空串，为什么必须改写 __new__ 而不是 __init__？`,
    source: '考点来源：腾讯云「剖析 Python 面试知识点（一）」（__new__ 应用题）· 场景改写',
    breakdown: `不可变对象在 <code>__new__</code> 返回时<strong>内容就已定型</strong>，__init__ 里改不动。正确姿势：<code>def __new__(cls, items): items = [i for i in items if i]; return super().__new__(cls, items)</code>。AI 生成的「过滤后的元组」子类常在这里翻车——审查时看到继承 str/tuple/frozenset 的类就要检查 __new__。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `<code>__getattr__</code> 和 <code>__getattribute__</code> 有什么区别？实现 __getattribute__ 最容易踩的坑是什么？`,
    source: '考点来源：腾讯云「剖析 Python 面试知识点（一）」（属性拦截题）· 场景改写',
    breakdown: `<code>__getattr__</code> 是<strong>兜底</strong>：常规查找找不到属性时才被调用；<code>__getattribute__</code> 是<strong>总闸</strong>：每次属性访问都先过它。坑：__getattribute__ 里再访问 self.xxx 会<strong>无限递归</strong>——必须用 <code>super().__getattribute__('xxx')</code>。AI 写属性代理类（lazy 加载、动态属性）时递归爆炸是标配 bug。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了一个「可去重」的数据类：只定义了 <code>__eq__</code>，放进 set 立刻报错。审查并修复：
<pre><code>class User:
    def __init__(self, name): self.name = name
    def __eq__(self, other):
        return self.name == other.name

users = {User('张三'), User('张三')}   # TypeError!</code></pre>`,
    source: '考点来源：PHP 中文站「如何使用 Python 的 __hash__ 和 __eq__ 实现类对象去重」· 场景改写',
    breakdown: `定义了 <code>__eq__</code> 后，Python 把 <code>__hash__</code> 置为 <strong>None</strong>（相等的对象哈希必须一致，默认哈希已不可信）——放进 set/dict 就报 unhashable。修复：同时定义 <code>__hash__ = lambda self: hash(self.name)</code>（与 __eq__ 用同一组字段），或声明 __hash__ = None 明确不可哈希。AI 生成 dataclass 时不传 frozen/eq 参数也会踩这个。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `为什么不能用「浮点容差近似相等」来实现 __eq__（比如 abs(a.x - b.x) < 1e-9 就算相等）？`,
    source: '考点来源：PHP 中文站「__hash__ 与 __eq__ 实现类对象去重」（相等传递性题）· 场景改写',
    breakdown: `近似相等<strong>不满足传递性</strong>：a≈b、b≈c 推不出 a≈c——而 == 的契约（和 set 的哈希逻辑）要求相等关系是等价关系（自反/对称/传递）。破坏传递性后，set 去重、dict 键、in 判断都会出现「幽灵行为」（同一个集合里两个「相等」元素并存）。正确做法：值比较用 isclose（不定义 __eq__），或给坐标做定点化（Decimal/整数分）再精确比较。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `实现一个 <code>Point2D</code> 类（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '实现 __eq__ / __hash__ / __repr__：set 去重可用；repr(p) 能被 eval 还原成相等对象；同时给一个「容差比较」方法（isclose 风格，不碰 __eq__）。',
      accept: ['set 去重正确（__eq__/__hash__ 同字段）', 'eval(repr(p)) == p 成立', '容差比较不影响 == 语义'],
    },
    source: '任务基于《14.魔术方法》课程知识点 · 来源层级：一手（Python 官方文档 datamodel 章节）场景化',
    breakdown: `思路：__eq__ 比较 (x, y) 元组，__hash__ = hash((self.x, self.y))；__repr__ 输出 <code>Point2D(3, 4)</code> 这种可 eval 形式；近似比较做成 <code>def close_to(self, other, tol=1e-9)</code> 普通方法。坑：__hash__ 与 __eq__ 必须用同一组字段（审查题同款）；repr 里变量名要能被 eval 找到。`,
  },
]'''),
    # ——— 第四批 ———
    ('0015-描述符.html', '巩固与延伸', '0015-描述符', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `什么是描述符？property 和描述符是什么关系？一个类要实现「数据描述符」至少需要哪些方法？`,
    source: '考点来源：CSDN 文库「Python 面试核心考点解析：面向对象」（描述符应用题）· 场景改写',
    breakdown: `描述符 = 实现了 <code>__get__ / __set__ / __delete__</code> 之一的类，<strong>作为类属性</strong>挂载时接管该名字的访问。<code>property</code> 本质就是内置描述符（包装 getter/setter 函数）。数据描述符（有 __set__ 或 __delete__）优先级高于实例字典，非数据描述符（只有 __get__）会被实例属性遮蔽——Django 模型字段、SQLAlchemy 列都是描述符。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `想给实例属性做类型检查（age 必须是 int、name 必须是 str），用描述符怎么做？写出核心逻辑。`,
    source: '考点来源：腾讯云「剖析 Python 面试知识点（一）」（类型检查描述符题）· 场景改写',
    breakdown: `定义一个 ValidatedField 描述符：<code>__set_name__</code> 记住字段名，<code>__set__</code> 里 <code>isinstance(value, expected_type)</code> 不通过就 raise TypeError，通过才写 <code>instance.__dict__[self.name] = value</code>；<code>__get__</code> 从实例字典读。一个描述符类可以复用到 Person.age / Person.score 等所有字段——这是「描述符解决重复校验代码」的经典案例。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了一个「缓存属性」描述符（第一次访问计算结果、存进实例字典），审查这段设计：
<pre><code>class CachedProperty:
    def __get__(self, obj, cls):
        if obj is None:
            return self
        value = obj.__dict__.get(self.name)
        if value is None:
            value = self.compute(obj)
            obj.__dict__[self.name] = value
        return value

class Data:
    @CachedProperty
    def expensive(self): ...</code></pre>
它属于数据描述符还是非数据描述符？实例同名属性会怎么干扰它？`,
    source: '考点来源：腾讯云「剖析 Python 面试知识点（一）」（类级覆盖陷阱题）· 场景改写',
    breakdown: `只实现 __get__，是<strong>非数据描述符</strong>——查找顺序上<strong>实例字典优先</strong>：一旦缓存写进 obj.__dict__，后续访问直接命中实例属性，描述符不再执行（这正是缓存想要的）；但代价是外部可以直接 <code>obj.expensive = '假的'</code> 覆盖缓存而描述符毫无察觉。若需要拦截赋值（校验/防覆盖），必须实现 __set__ 变成数据描述符。AI 代码里非数据描述符被实例属性「意外遮蔽」是高发审查点。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `面试官问：什么时候用 property，什么时候写自定义描述符类？两者怎么选？`,
    source: '考点来源：腾讯云「剖析 Python 面试知识点（一）」（property 本质题）· 场景改写',
    breakdown: `<strong>单个属性</strong>的读写控制（校验、懒加载、只读）用 property——声明式、最少代码；<strong>多个属性共享同一套规则</strong>（类型校验、范围校验、日志审计）时把规则抽成描述符类复用，否则每个字段都要重复 getter/setter。判断标准：出现第二个需要相同逻辑的属性时，就该重构为描述符。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `实现一个 <code>ValidatedField</code> 描述符（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '一个描述符类支持类型与范围校验（如 int 且 0~150）；复用到至少两个类三个字段；违规赋值在写入瞬间抛 TypeError/ValueError 且实例状态不变。',
      accept: ['同一描述符类复用到多个字段', '非法赋值抛错且不写入', '__set_name__ 正确记录字段名'],
    },
    source: '任务基于《15.描述符》课程知识点 · 来源层级：一手（Python 官方文档描述符指南）场景化',
    breakdown: `思路：__init__ 存类型与范围；<code>__set_name__</code> 存字段名（Python 3.6+ 免手写 name 参数）；__set__ 先校验再写 instance.__dict__；__get__ 读实例字典。坑：不要用 <code>setattr(obj, self.name, value)</code>（会再次触发描述符 → 递归）；默认值要在 __get__ 里处理（属性不存在时返回默认）。`,
  },
]'''),
    ('0016-异常处理.html', '巩固与延伸', '0016-异常处理', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的函数：try 里 <code>return result</code>，finally 里也写了 <code>return</code>。函数最终返回哪个？finally 里的 return 有什么危害？`,
    source: '考点来源：腾讯云「Python 异常处理机制——Python 面试 100 道实战题目练习」（finally 题）· 场景改写',
    breakdown: `返回 <strong>finally 里的值</strong>——finally 中的 return 会<strong>吞掉</strong> try 的返回值，甚至吞掉抛出的异常（异常被 finally 的 return 静默替换）。危害：调用方拿到错误结果还不知道出错。正确姿势：finally 只做资源清理（close/rollback），绝不 return。AI 生成的清理代码里这是高频事故。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `捕获异常后想抛出新异常、但要保留「原始异常」以便溯源，正确写法是什么？裸 raise 又是什么？`,
    source: '考点来源：掘金「掌握 Python 异常处理：面试中的关键考点」（异常链题）· 场景改写',
    breakdown: `<code>raise NewError('包装信息') from e</code>——原始异常存进新异常的 <code>__cause__</code>，traceback 里两条链都能看到；<code>from None</code> 则显式切断链。裸 <code>raise</code>（except 块里不接对象）是<strong>原样重抛</strong>当前异常，用于「记录日志后继续上抛」。AI 生成的网关代码里，异常链保留是排查线上问题的关键。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 在入口处写了 <code>except:</code> 想把「所有错误」都兜住。审查：它其实会吞掉哪些不该吞的东西？为什么专家建议捕获 Exception 甚至更具体的异常？`,
    source: '考点来源：掘金「掌握 Python 异常处理：面试中的关键考点」（BaseException 题）· 场景改写',
    breakdown: `异常体系分两支：<code>Exception</code>（常规错误）与<strong> BaseException 直属的 SystemExit / KeyboardInterrupt / GeneratorExit</strong>。裸 <code>except:</code> 连 Ctrl+C（KeyboardInterrupt）和 sys.exit 都吞——用户想停服务都停不掉。正确：<code>except Exception</code> 兜底常规错误，具体业务异常更具体地捕获；清理逻辑用 finally 而不是 except。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `上下文管理器的 <code>__exit__</code> 返回 True 会发生什么？什么时候该「吞掉」异常，什么时候必须让它传播？`,
    source: '考点来源：腾讯云「Python 高级特性解析与面试应对策略」（with 与异常交互题）· 场景改写',
    breakdown: `<code>__exit__</code> 返回 True = 告诉解释器「异常已处理」，异常<strong>不再传播</strong>给调用方。必须传播：资源操作失败、业务错误——吞了调用方就不知道失败。可以吞：抑制型场景（如 <code>contextlib.suppress(FileNotFoundError)</code> 明确表达「这个错无所谓」）。设计原则：吞异常必须是显式的、有理由的，而不是默认行为。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个安全的配置读取函数（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '读取 JSON 配置：文件不存在抛 ConfigError（用 raise ... from e 保留原始异常）；解析失败同理；finally 保证句柄关闭；写测试断言 __cause__ 链完整。',
      accept: ['两类失败都抛 ConfigError 且保留 __cause__', '文件句柄在异常路径下也关闭（finally）', 'Ctrl+C 之类的 BaseException 不被误吞'],
    },
    source: '任务基于《16.异常处理》课程知识点 · 来源层级：一手（Python 官方文档异常章节）场景化',
    breakdown: `思路：<code>except FileNotFoundError as e: raise ConfigError('配置不存在') from e</code>；finally 里 close；测试里 <code>assert cm.exception.__cause__</code>。坑：捕获范围写死具体异常类型，别用裸 except（审查题同款）；finally 里别 return。`,
  },
]'''),
    ('0017-迭代器与生成器.html', '巩固与延伸', '0017-迭代器与生成器', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `可迭代对象、迭代器、生成器三者的区别是什么？怎么快速判断一个对象属于哪种？`,
    source: '考点来源：CSDN「Python 面试宝典（终极版）」（三者区别题）· 场景改写',
    breakdown: `<strong>可迭代对象</strong>：有 <code>__iter__</code>（list/dict/str/文件）；<strong>迭代器</strong>：有 <code>__next__</code> 且 __iter__ 返回自身（iter(list) 的结果）；<strong>生成器</strong>：含 yield 的函数调用产物，是最常用的迭代器。判断口诀：for 得动 = 可迭代；next 得动 = 迭代器；函数里有 yield = 生成器。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `要逐行处理一个 10GB 的日志文件做统计，内存只有 2GB。你会怎么写？为什么不能 <code>readlines()</code>？`,
    source: '考点来源：腾讯云「Python 高级特性解析与面试应对策略」（惰性读取题）· 场景改写',
    breakdown: `<code>for line in f:</code>——文件对象是<strong>惰性迭代器</strong>，逐行读取、每行处理完即释放，内存占用恒定；<code>readlines()</code> 会把 10GB 全部载入内存，直接 OOM。进阶：处理逻辑包成<strong>生成器管道</strong>（逐行过滤→转换→统计），保持全链路惰性。AI 写的数据处理代码最爱上 readlines() 或 read()，审查大文件处理时先看这一条。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了下面的代码，第二次统计是 0。审查：为什么 list 能 for 两遍，迭代器不能？
<pre><code>data = (x * 2 for x in range(100))   # 生成器表达式
print(sum(data))   # 9900
print(sum(data))   # 0  ← ？</code></pre>`,
    source: '考点来源：CSDN「Python 面试宝典（终极版）」（可重复遍历题）· 场景改写',
    breakdown: `<strong>迭代器是单程的</strong>：迭代器的 <code>__iter__</code> 返回自身，第一次 sum 已把它耗尽，第二次从尽头继续自然为空；list 的 __iter__ 每次返回<strong>新迭代器</strong>，所以可以反复遍历。修复：结果要复用就物化成 list，或需要时重新生成。AI 代码把生成器当集合复用是数据管道里的头号 bug。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `<code>yield</code> 和 <code>yield from</code> 有什么区别？生成器的 send() 是干什么的？什么场景会用到它？`,
    source: '考点来源：Runebook（Python 官方文档中文版）（send 协议题）· 场景改写',
    breakdown: `<code>yield</code> 产出一个值；<code>yield from</code> 把控制<strong>委托</strong>给子生成器（for 循环的语法糖，异常/close 也透传）。<code>send(v)</code> 让外部向<strong>挂起的 yield 表达式注入值</strong>——生成器从「只出不进」变成「双向通道」，是协程/管道的雏形。典型场景：事件流处理、Actor 模型、需要外部反馈的流水线。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个日志统计管道（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '模拟 10 万行日志（不落大文件，用生成器产出），管道内完成：过滤 error 行 → 提取错误码 → 统计 Top3；全程用生成器/迭代器惰性处理，峰值内存恒定。',
      accept: ['全链路惰性（生成器管道，无一次性大列表）', 'Top3 统计正确', '能说出峰值内存为什么是常数级'],
    },
    source: '任务基于《17.迭代器与生成器》课程知识点 · 场景化',
    breakdown: `思路：<code>def gen_logs()</code> 产出日志 → <code>(code for line in gen_logs() if 'error' in line)</code> 过滤 → Counter 增量统计。坑：过滤生成器只能消费一次（审查题同款），统计前别中途物化；Counter 本身就是 O(去重数) 内存，恰好是「惰性流 + 小聚合」的标准组合。`,
  },
]'''),
    ('0018-上下文管理器.html', '巩固与延伸', '0018-上下文管理器', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `with 语句的工作原理是什么？它比「手动 open + try/finally + close」好在哪里？`,
    source: '考点来源：腾讯云「Python 高级特性解析与面试应对策略」（with 原理题）· 场景改写',
    breakdown: `with 是 <strong>__enter__ / __exit__ 协议</strong>的语法糖：进入时调 __enter__（拿返回值绑到 as 变量），<strong>无论正常退出还是抛异常</strong>都调 __exit__（参数含异常信息）。好处：资源释放（close/commit/释放锁）由协议保证，不可能忘写；异常路径和正常路径同一条清理逻辑。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `自定义上下文管理器有哪两种实现方式？各自怎么用、怎么选？`,
    source: '考点来源：腾讯云「Python 高级特性解析与面试应对策略」（实现方式题）· 场景改写',
    breakdown: `① <strong>类实现 __enter__ / __exit__</strong>：状态多、逻辑重、要复用方法时用；② <strong>@contextlib.contextmanager</strong> 装饰生成器函数：yield 前是 __enter__、yield 后是 __exit__，适合一次性轻量场景（计时、临时改配置）。选择原则：要多次使用/带状态 → 类；用完即弃的包装 → contextmanager。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的数据库上下文管理器，__exit__ 里 <code>return True</code>。审查：线上事务失败为什么没报警？什么场景才该吞异常？`,
    source: '考点来源：腾讯云「Python 高级特性解析与面试应对策略」（吞异常代价题）· 场景改写',
    breakdown: `<code>__exit__</code> 返回 True 会把异常<strong>吞掉</strong>——事务失败静默，调用方以为成功，监控永远不响。正确：__exit__ 返回 None/False 让异常继续传播（回滚后再传播是标准姿势）；只有「显式预期中的无关紧要错误」才吞（<code>contextlib.suppress</code>）。AI 代码默认吞异常是生产事故高发写法。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `为什么「失败重试」必须用装饰器实现，而上下文管理器实现不了？两者的职责边界是什么？`,
    source: '考点来源：腾讯云「Python 高级特性解析与面试应对策略」（retry 设计题）· 场景改写',
    breakdown: `with 块是<strong>一次性进入-退出</strong>：__exit__ 在退出时执行，无法「重新进入」代码块——重试需要把同一段代码<strong>循环执行</strong>，只有装饰器（包装函数、循环调用）做得到。职责边界：上下文管理器管<strong>资源生命周期</strong>（连接、锁、临时状态），装饰器管<strong>调用行为</strong>（重试、缓存、限流、日志）。判断标准：问「要不要再执行一遍？」——要 → 装饰器。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `实现一个 <code>timer</code> 上下文管理器（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '分别用「类实现协议」和「@contextmanager 生成器」两种方式实现：进入记录开始时间，退出打印块耗时；块内抛异常时也要打印耗时且异常继续传播。',
      accept: ['两种实现行为一致', '异常路径下耗时照常打印、异常不丢失', '能说清两种方式的适用场景'],
    },
    source: '任务基于《18.上下文管理器》课程知识点 · 来源层级：一手（Python 官方文档 contextlib 章节）场景化',
    breakdown: `思路：类版 __enter__ 记 time.perf_counter() 返回 self，__exit__ 算差值打印并<strong>返回 None</strong>（不吞异常）；生成器版 yield 放中间、finally 里打印。坑：__exit__ 别返回 True（审查题同款）；计时用 perf_counter 不用 time.time（墙钟会被系统时间调整干扰）。`,
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
