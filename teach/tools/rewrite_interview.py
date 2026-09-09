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
    """把题组渲染成内嵌数据脚本（window.__interview）；EXTRA 里的 B 路线补题追加到组尾。"""
    extra = EXTRA.get(lesson)
    if extra:
        # questions 以 ']' 结尾：剥掉 ']' 与最后一个对象的尾逗号，再拼接追加题
        inner = questions.rstrip()[:-1].rstrip()
        if inner.endswith(','):
            inner = inner[:-1]
        questions = inner + ', ' + extra.strip() + ']'
    return ('      <script>\n'
            f'        window.__interview = {{\n'
            f'          lesson: {lesson!r},\n'
            f'          questions: {questions},\n'
            '        };\n'
            '      </script>')


# 题源协议 B 补题：新题必须来自实际检索的来源（链接 + 检索日期 + 层级）。
# 追加到对应课程的题组尾部（key = lesson 键）。
EXTRA = {
    '0005-函数': r'''  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的代码想生成一组「各自加 1」的函数，结果全部返回 2：
<pre><code>funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])   # [2, 2, 2] ？</code></pre>
为什么三个 lambda 记住了同一个 i？怎么修复？`,
    source: '来源：Python 官方文档 FAQ「Why do lambdas defined in a loop with different values all return the same result?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<strong>晚绑定</strong>：闭包捕获的是<strong>变量本身</strong>（不是定义时的值）——三个 lambda 共享同一个 i 的引用，循环结束后 i=2，调用时全部读 2。修复：用默认参数做<strong>值快照</strong> <code>lambda i=i: i</code>（定义时求值），或用 functools.partial。这是官方 FAQ 原题，AI 生成「循环里造回调」代码时的头号坑。`,
  },
  {
    type: 'mechanism',
    level: '初级岗常问',
    prompt: `写一个「API 日志外壳」：包装任意函数、参数全部透传，以后被包装函数新增参数也不改外壳。官方 FAQ 推荐的写法是什么？`,
    source: '来源：Python 官方文档 FAQ「How can I pass optional or keyword parameters from one function to another?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<code>def wrapper(*args, **kwargs): ...; return fn(*args, **kwargs)</code>——用 * 与 ** 在调用侧<strong>解包透传</strong>，外壳与真实签名解耦。这正是装饰器/工具注册表（Agent 工具统一日志、限流外壳）的标准写法；FAQ 同时提醒：参数是「参数」，调用时传的是「实参」，两者术语别混。`,
  },
''',
    '0008-类和对象': r'''  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的类里有 <code>def __secret(self)</code>，你发现外部居然能 <code>obj._A__secret()</code> 调到它。双下划线开头到底发生了什么？它是「私有」吗？`,
    source: '来源：Python 官方文档 FAQ「private names / name mangling」条目 + datamodel 名称改写规范 · 检索 2026-09-09 · 层级：一手',
    breakdown: `<strong>名称改写</strong>：<code>__spam</code>（至少两个前导下划线、最多一个尾部）在类体内被文本替换为 <code>_classname__spam</code>。目的不是安全（官方 FAQ 明说「Python programmers never bother to use private variable names」），而是<strong>防止子类无意覆盖</strong>：B(A) 里再写 __spam 会变成 _B__spam，碰不到 A 的。结论：防手滑用 __、真需要私有靠约定（单下划线）。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 把「文件句柄清理」写进了 <code>__del__</code>，结果句柄迟迟不关。审查：del 语句和 __del__ 是什么关系？为什么不推荐用 __del__ 做资源清理？`,
    source: '来源：Python 官方文档 FAQ「My class defines __del__ but it is not called when I delete the object」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<code>del x</code> 只是<strong>减引用计数</strong>——计数归零时 __del__ 才被调用；若有循环引用（子节点存父引用），计数永不归零，只能等 GC 的<strong>不定时</strong>回收。所以 __del__ 的调用时机<strong>不可预测</strong>，不适合做资源清理。正确：with / contextmanager / 显式 close()。AI 生成代码把「销毁即清理」当 C++ 析构来用是经典错位。`,
  },
''',
    'db-0006-索引': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `登录查询是 <code>WHERE lower(email) = ?</code>——email 上的普通索引用不上（对列做了函数运算）。官方文档给的解法是什么？UNIQUE 表达式索引还能多约束什么？`,
    source: '来源：PostgreSQL 官方文档 11.7「Indexes on Expressions」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<strong>表达式索引</strong>：<code>CREATE INDEX ON users (lower(email))</code>——索引建在函数结果上，查询里的 lower(email) 直接命中。声明 <code>UNIQUE</code> 后还能防「大小写不同但业务上重复」的行（<code>User@x.com</code> 与 <code>user@x.com</code> 无法并存）——普通唯一约束做不到这点。文档原句：「indexes on expressions can be used to enforce constraints that are not definable as simple unique constraints」。`,
  },
  {
    type: 'design',
    level: '高级岗常问',
    prompt: `产品要求「邮箱大小写不敏感 + 唯一」。候选方案：① lower(email) 表达式索引；② citext 类型；③ 应用层统一小写。你选哪个？依据是什么？`,
    source: '来源：PostgreSQL 官方文档 11.7「Indexes on Expressions」（大小写不敏感查询场景）· 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `① <strong>表达式索引</strong>：不改列类型、存量数据不动，查询处写 lower(email) 即可命中——<strong>侵入最小</strong>，首选；② <strong>citext</strong>：列类型换成大小写不敏感文本，查询零改动，但改类型要迁移数据、扩展依赖；③ 应用层统一：最弱——历史数据/多入口（API、后台、导入脚本）总有一处漏小写。结论：默认 ①，类型可控的新表可选 ②，③ 只做最后兜底不依赖。`,
  },
''',
    '0004-容器类型': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `面试官问：复制对象有哪些姿势？各自的深浅语义是什么？`,
    source: '来源：Python 官方文档 FAQ「How do I copy an object in Python?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `官方 FAQ 给三法：① <strong>通用</strong> <code>copy.copy()</code>（浅）/ <code>copy.deepcopy()</code>（深）——大多数对象都可用；② <strong>字典</strong>自带 <code>olddict.copy()</code>；③ <strong>序列</strong>切片 <code>new_l = l[:]</code>。后两者都是<strong>浅拷贝</strong>（内层可变对象仍共享）。FAQ 也提醒「Not all objects can be copied」——含锁/文件句柄的对象拷贝会失败或行为异常。`,
  },
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的代码用 <code>dict.copy()</code> 复制了配置，改嵌套值却把原配置也改了。为什么？什么时候必须上 deepcopy？`,
    source: '来源：Python 官方文档 FAQ「How do I copy an object in Python?」· 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `<code>dict.copy()</code> 与切片都是<strong>浅拷贝</strong>：外层容器新了，内层可变对象（嵌套 dict/list）还是原引用——改嵌套即改原对象。规则：<strong>只有一层</strong>用 copy()/切片；嵌套结构要完全独立必须 <code>copy.deepcopy()</code>（性能更贵，按需用）。审查 AI 的「复制后修改」代码先看嵌套层级。`,
  },
''',
    '0006-作用域': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `多个模块要共享同一份配置，官方 FAQ 推荐的规范做法是什么？原理是什么？`,
    source: '来源：Python 官方文档 FAQ「How do I share global variables across modules?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<strong>专用 config 模块模式</strong>：config.py 里定义默认值，各模块 <code>import config</code> 后通过属性读写 <code>config.x = 1</code>。原理：<strong>模块是单例</strong>（每个模块对象全局只有一份），对模块对象的改动处处可见。这是比「真全局变量」干净得多的共享方式——有命名空间、可追踪赋值点。`,
  },
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的代码用 <code>from config import x</code> 引入配置，然后在别的模块里改 x，改动却没生效。为什么？正确姿势是什么？`,
    source: '来源：Python 官方文档 FAQ「How do I share global variables across modules?」· 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `<code>from config import x</code> 把<strong>当前值拷贝</strong>成局部名字——之后改 x 改的是自己的副本，config.x 纹丝不动（FAQ 的规范姿势是「import 模块、改模块属性」）。正确：<code>import config; config.x = 1</code>；需要热生效的配置对象（如 dict）同理——from 导入的引用改内部内容生效、重新赋值不生效，别混。`,
  },
''',
    '0007-lambda表达式': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `官方 FAQ 说高阶函数有哪两种实现方式？以「生成 y = a*x + b 的函数」为例说明。`,
    source: '来源：Python 官方文档 FAQ「How do you make a higher order function in Python?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `① <strong>嵌套函数/闭包</strong>：<code>def linear(a, b): def result(x): return a*x + b; return result</code>；② <strong>可调用对象</strong>：类里存 a、b，实现 __call__。两者都能 <code>taxes = linear(0.3, 2)</code> 后像函数一样调用。FAQ 的取舍提示：可调用对象能放更多方法与状态——多行为选类、单行为选闭包。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `你要让 AI 实现一个「函数工厂」：生成带配置的回调（如按税率计算税费）。什么时候让它用闭包、什么时候用可调用对象？`,
    source: '来源：Python 官方文档 FAQ「How do you make a higher order function in Python?」· 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `单行为、状态简单（linear 这种只算一个公式）→ <strong>闭包</strong>，代码最少；需要<strong>再挂方法/多状态/可继承</strong>（税率对象还要 set_rate()、历史记录）→ <strong>可调用对象</strong>。给 AI 的提示词里把「是否需要后续扩展方法」说清楚，AI 就不会在两个形态间摇摆。`,
  },
''',
    '0003-python基本语法': r'''  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `<code>-22 // 10</code> 在 Python 里等于几？为什么不是 -2？官方 FAQ 怎么解释这个设计？`,
    source: '来源：Python 官方文档 FAQ「Why does -22 // 10 return -3?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `等于 <strong>-3</strong>：// 是<strong>向下取整（floor）</strong>。FAQ 的设计理由：保证 <code>i == (i // j) * j + (i % j)</code> 恒等式成立，且让 <code>i % j</code> 与 j <strong>同号</strong>——j 为正时余数非负最有用（时钟例子：现在 10 点，200 小时前是 -190 % 12 == 2 点）。C 系语言向零截断，结果是 -2——跨语言写 AI 代码时这里最容易翻车。`,
  },
  {
    type: 'mechanism',
    level: '初级岗常问',
    prompt: `字符串怎么「原地修改」？<code>s[0] = 'x'</code> 为什么报错？真要频繁修改文本怎么办？`,
    source: '来源：Python 官方文档 FAQ「How do I modify a string in place?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<strong>字符串不可变</strong>——不能原地改，常规做法是<strong>拼出新字符串</strong>；确需「原地可变 Unicode 数据」用 <code>io.StringIO</code>（seek/write 后 getvalue）或 array 模块。FAQ 原例：StringIO 里 seek(7) + write("there!") 把 "Hello, world" 改成 "Hello, there!"。AI 生成的文本处理代码里「字符串 += 拼接」循环是性能坑，高频拼接让 AI 用 join 或 StringIO。`,
  },
''',
    '0009-对象的类型': r'''  {
    type: 'mechanism',
    level: '初级岗常问',
    prompt: `想知道一个对象有哪些属性和方法，官方 FAQ 推荐用什么？dir 返回什么？`,
    source: '来源：Python 官方文档 FAQ「How can I find the methods or attributes of an object?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<code>dir(x)</code>——返回<strong>按字母排序</strong>的名字列表，含实例属性、类定义的方法与属性。进阶：想知道「哪个类定义的」用 <code>type(x)</code>，逐个深挖用 inspect 模块（getmembers/signature）。这是读 AI 生成的第三方代码、摸清对象接口的第一步。`,
  },
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的代码想「获取变量的名字」当字典 key（如 <code>name_of(obj)</code> 返回 'obj'）。FAQ 说这基本不可能——为什么？`,
    source: '来源：Python 官方文档 FAQ「How can my code discover the name of an object?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<strong>对象没有名字</strong>：赋值只是把<strong>名字绑定到值</strong>，一个对象可以有零到多个名字（<code>B = A; a = B()</code>——a 的名字是什么？A 还是 B？无从谈起）。FAQ 原话「Generally speaking, it can't」。硬要「命名」得自己维护映射表（name → obj），别让 AI 写反射变魔术。`,
  },
''',
    '0005-函数': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `面试官问：Python 怎么写「输出参数」（call by reference）风格的函数？官方 FAQ 的答案是什么？`,
    source: '来源：Python 官方文档 FAQ「How do I write a function with output parameters (call by reference)?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `FAQ 开宗明义：参数是<strong>按赋值传递</strong>，不存在 call-by-reference——形参与实参之间没有别名。要「返回多个结果」的正路：① <strong>返回元组</strong> <code>return a, b</code>；② 传可变对象进去改内容；③ 用实例属性/全局（不推荐）。别让 AI 写「函数里改参数名希望外面变」的代码——外面不会变。`,
  },
''',
    '0009-对象的类型': r'''  {
    type: 'design',
    level: '中级岗常问',
    prompt: `用字符串调用函数/方法（如按配置名执行对应动作），官方 FAQ 推荐的最佳做法是什么？为什么不用 eval？`,
    source: '来源：Python 官方文档 FAQ「How do I use strings to call functions/methods?」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<strong>字典分发</strong>：<code>dispatch = {'go': a, 'stop': b}</code>（注意存函数不带括号），调用 <code>dispatch[get_input()]()</code>。FAQ 指出两大优势：字符串不必与函数同名（可读的键名映射任意函数）+ 天然充当 switch-case。eval/exec 执行任意字符串有注入风险，功能上也更笨重。Agent 工具注册表就是这个模式。`,
  },
''',
    '0010-对象的创建过程': r'''  {
    type: 'trap',
    level: '高级岗常问',
    prompt: `官方文档说：__new__ 返回什么，__init__ 才一定会被调用？什么情况下 __init__ 会被跳过？这对写单例/缓存的 AI 代码意味着什么？`,
    source: '来源：Python 官方文档 datamodel「Basic customization」object.__new__ 条目 · 检索 2026-09-09 · 层级：一手',
    breakdown: `文档原文规则：<strong>__new__ 返回 cls 的实例 → 该实例的 __init__ 被调用</strong>（self = 新实例，其余参数照传）；<strong>返回的不是 cls 实例 → __init__ 不被调用</strong>。所以单例里 __new__ 返回缓存的旧实例时，初始化会「悄悄不执行」——AI 写的单例/对象池代码依赖 __init__ 做初始化就是踩这条规则。初始化要么放 __new__ 成功后，要么显式幂等保护。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `面试官问：__new__ 存在的主要目的是什么？官方文档怎么定位它的用途？`,
    source: '来源：Python 官方文档 datamodel「Basic customization」object.__new__ 条目 · 检索 2026-09-09 · 层级：一手',
    breakdown: `文档原文：__new__ <strong>intended mainly to allow subclasses of immutable types</strong>（主要是让不可变类型的子类化成为可能）——如 int/str/tuple/frozenset 的内容在创建时就定型，必须赶在 __init__ 之前（__new__ 里）过滤/调整。其余场景（缓存实例、单例）是「顺手能做的扩展用途」，不是它的设计主场。`,
  },
''',
    '0012-元类': r'''  {
    type: 'mechanism',
    level: '高级岗常问',
    prompt: `官方文档描述 class 语句背后发生了什么？元类（metaclass）在哪一步介入？`,
    source: '来源：Python 官方文档 datamodel「Metaclasses」小节 · 检索 2026-09-09 · 层级：一手',
    breakdown: `文档原文：<strong>类体在一个新命名空间中执行，类名被绑定到 type(name, bases, namespace) 的结果</strong>。所以：① 类体里的代码在 class 语句执行时就<strong>真正运行</strong>（可以 print、可以算）；② 元类 = 定制这一步——用 metaclass 参数（或继承带元类的类）替换 type 的调用，从而拦下「类对象诞生」的瞬间。`,
  },
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `既然 <code>MyClass = type('MyClass', (Base,), ns)</code> 与 class 语句等价，AI 写动态建类代码时这两者可以随便互换吗？有什么区别？`,
    source: '来源：Python 官方文档 datamodel「Metaclasses」小节 · 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `等价但不完全互换：type() 调用<strong>跳过了类体执行</strong>——ns 里的方法/属性要手动用 dict 组装（没有语句、装饰器、注解的自动执行）；class 语句则完整走「执行类体 → 交给元类」。且 class 语句里 <code>__qualname__</code>、模块归属等自动填充，type() 建类这些要手填（影响 pickle/日志）。动态建类适合「配置驱动生成」，写死 class 适合正常业务代码。`,
  },
''',
    '0015-描述符': r'''  {
    type: 'mechanism',
    level: '高级岗常问',
    prompt: `官方文档给「描述符」的严格定义是什么？判定一个对象是不是描述符的标准是什么？`,
    source: '来源：Python 官方文档 datamodel「Implementing Descriptors」小节 · 检索 2026-09-09 · 层级：一手',
    breakdown: `文档原文：描述符 = <strong>属性访问被描述符协议方法覆盖的对象</strong>——定义了 <code>__get__() / __set__() / __delete__()</code> 中<strong>任意一个</strong>，它就是描述符。默认属性访问是「从实例字典取/改/删」（文档原话：get, set, or delete the attribute from an object's dictionary）——描述符就是在这个默认行为<strong>之前</strong>插进来的协议钩子。property、classmethod、staticmethod 全是内置描述符。`,
  },
  {
    type: 'trap',
    level: '高级岗常问',
    prompt: `面试官追问：<code>a.x</code> 的查找链是什么？数据描述符和非数据描述符在哪一步介入？`,
    source: '来源：Python 官方文档 datamodel「Invoking Descriptors」小节 · 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `查找链：<strong>① 数据描述符</strong>（有 __set__/__delete__）在类上定义时优先于实例字典 → ② <strong>实例字典</strong>（默认行为）→ ③ <strong>非数据描述符</strong>（只有 __get__）与类属性 → ④ __getattr__ 兜底。所以「只写 __get__ 的缓存描述符」会被实例同名属性遮蔽（复习审查题），而 property（数据描述符）永远拦在实例字典前面——这就是两个坑的机制根源。`,
  },
''',
    '0011-可调用对象': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `官方文档说 <code>x(arg1, arg2)</code> 大致等价于什么？为什么普通 object 实例不可调用、而「类」本身却可调用？`,
    source: '来源：Python 官方文档 datamodel「Emulating callable objects」object.__call__ 条目 · 检索 2026-09-09 · 层级：一手',
    breakdown: `文档原文：x(arg1, arg2, ...) 大致等价于 <code>type(x).__call__(x, arg1, ...)</code>——调用协议在<strong>类型上</strong>执行。类可调用是因为 <code>type</code> 定义了 __call__（调用即实例化）；而 <strong>object 本身不提供 __call__</strong>（文档原话），所以普通对象默认不可调用——想让实例可调用，得自己的类定义 __call__。`,
  },
  {
    type: 'trap',
    level: '高级岗常问',
    prompt: `审查 AI 的代码：它想在运行时给某个实例「挂上 __call__」让它可调用（<code>t.__call__ = lambda: 1</code>）。为什么按官方文档的定义，这不可能生效？`,
    source: '来源：Python 官方文档 datamodel「Emulating callable objects」+「Special method lookup」· 检索 2026-09-09 · 层级：一手',
    breakdown: `调用翻译是 <code>type(x).__call__(x, ...)</code>——直接在<strong>类型对象上查找</strong> __call__，实例字典里的同名属性根本不参与；文档在「Special method lookup」一节明确：特殊方法的隐式调用<strong>只保证在对象类型上定义时正确工作</strong>（理由是跳过实例字典查找更快）。修复：把 __call__ 定义在类里；动态场景用 types.MethodType 绑到实例（普通属性调用不受此限）。`,
  },
''',
    '0014-魔术方法': r'''  {
    type: 'mechanism',
    level: '高级岗常问',
    prompt: `<code>c.__len__ = lambda: 5</code> 之后 <code>len(c)</code> 还是报 TypeError。官方文档给出的规则是什么？为什么这样设计？`,
    source: '来源：Python 官方文档 datamodel「Special method lookup」小节 · 检索 2026-09-09 · 层级：一手',
    breakdown: `文档原文规则：对自定义类，特殊方法的<strong>隐式调用只保证在对象类型上定义时正确工作，实例字典里的定义无效</strong>（文档原例正是 c.__len__ = lambda: 5 后 len(c) 抛 TypeError: object of type 'C' has no len()）。设计理由：特殊方法若走实例字典查找，每个对象都要带一份方法表，<strong>性能和一致性</strong>都差。结论：len/str/iter/call 等协议方法一律定义在类上。`,
  },
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的「给对象打补丁」代码：<code>obj.__str__ = 自定义函数</code> 想让 print 变格式。按官方规则会怎样？正确做法是什么？`,
    source: '来源：Python 官方文档 datamodel「Special method lookup」小节 · 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `print(obj) 走 <code>type(obj).__str__</code>——实例字典里的 __str__ 被<strong>无视</strong>，print 输出照旧。正确做法：① 类上定义（设计时就该有）；② 临时需求用 <code>type(obj).__str__ = ...</code> 猴子补丁（改的是类型，会生效但影响所有实例，慎用）；③ 换协议函数显式调用（自己调 obj.attr 而不是依赖隐式协议）。审查规则：看到「实例上挂 dunder」直接判无效。`,
  },
''',
    '0017-迭代器与生成器': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `官方文档对 <code>__iter__</code> 的要求原文是什么？这解释了为什么 list 能 for 两遍、迭代器只能一遍。`,
    source: '来源：Python 官方文档 datamodel「object.__iter__」条目 · 检索 2026-09-09 · 层级：一手',
    breakdown: `原文：__iter__ <strong>should return a new iterator object</strong>——每次调用返回<strong>新</strong>迭代器（list 的 __iter__ 每次新建 → 可反复遍历）；而迭代器自身的 __iter__ 返回 self（旧的那一个、已被耗尽 → 第二遍为空）。原文还补充：对映射（dict），迭代的是<strong>键</strong>。这条规则是「为什么能/不能重复遍历」的官方答案。`,
  },
''',
    '0018-上下文管理器': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `官方文档定义的 <code>__exit__</code> 签名与语义是什么？三个异常参数什么时候会是 None？`,
    source: '来源：Python 官方文档 datamodel「With Statement Context Managers」object.__exit__ 条目 · 检索 2026-09-09 · 层级：一手',
    breakdown: `签名 <code>__exit__(self, exc_type, exc_value, traceback)</code>——参数描述<strong>导致退出上下文的异常</strong>；<strong>无异常退出时三者全为 None</strong>。若异常存在且方法想<strong>抑制</strong>（阻止传播），<strong>返回真值</strong>；返回 None/假值则异常照常向上传播。这就是 with 块异常语义的完整官方定义。`,
  },
  {
    type: 'trap',
    level: '高级岗常问',
    prompt: `AI 写的上下文管理器 __exit__ 里无条件 <code>return True</code>，想「保证不崩」。审查：官方语义下这会怎样？只想抑制特定异常该怎么写？`,
    source: '来源：Python 官方文档 datamodel「With Statement Context Managers」object.__exit__ 条目 · 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `return True = <strong>抑制一切异常</strong>——业务错误、程序员 bug 全部静默，调用方永远以为成功（线上事故标配）。正确写法：<code>if exc_type is 目标异常: 处理; return True</code>——<strong>只对明确预期的异常返回真值</strong>，其余返回 None 让异常传播。无异常时（三个参数 None）别去 return True 做多余事。`,
  },
''',
    '0026-协程-Coroutine': r'''  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 写的代码把同一个协程对象用了两次：<code>coro = fetch(); await coro; await coro</code>。运行时会怎样？官方文档从哪个版本开始明确这是错误？`,
    source: '来源：Python 官方文档 datamodel「Coroutines」条目（Changed in version 3.5.2）· 检索 2026-09-09 · 层级：一手',
    breakdown: `第二次 await 抛 <code>RuntimeError: cannot reuse already awaited coroutine</code>——文档明确「It is a RuntimeError to await on a coroutine more than once」（3.5.2 起）。协程对象是<strong>一次性执行体</strong>：每次需要执行就<strong>重新调用 async 函数</strong>拿新协程（或每次 create_task）。AI 生成代码把协程当「可复用句柄」存起来是最常见的 asyncio 错误之一。`,
  },
''',
    '0013-装饰器': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `官方文档给 <code>functools.wraps</code> 的准确定义是什么？assigned 与 updated 两个参数分别控制什么？`,
    source: '来源：Python 官方文档 functools「functools.wraps」条目 · 检索 2026-09-09 · 层级：一手',
    breakdown: `原文：wraps 是「定义 wrapper 时把 update_wrapper 当装饰器用的<strong>便捷函数</strong>」，<strong>等价于 partial(update_wrapper, wrapped=wrapped, assigned=..., updated=...)</strong>。<code>assigned</code>（默认 WRAPPER_ASSIGNMENTS）把 __module__/__name__/__qualname__/__doc__/__annotations__ 从原函数<strong>赋给</strong> wrapper；<code>updated</code>（默认 WRAPPER_UPDATES）把原函数 __dict__ <strong>合并进</strong> wrapper 的 __dict__。`,
  },
  {
    type: 'trap',
    level: '高级岗常问',
    prompt: `AI 写的装饰器用了 @wraps(f)，却抱怨「函数上的自定义属性丢了」。审查：wraps 到底复制什么、不复制什么？`,
    source: '来源：Python 官方文档 functools「functools.wraps」条目 · 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `wraps 只复制 <strong>assigned 名单里的元信息</strong>（__name__/__doc__ 等五个）+ updated 把 __dict__ <strong>浅合并</strong>——若 wrapper 自己定义了同名属性会<strong>覆盖</strong>合并来的；原函数属性里指向可变对象的仍是<strong>共享引用</strong>（改一处两处变）。「复制所有东西」的期望不成立：闭包状态、非名单属性一律不碰。要完整保留自定义属性：手动 update_wrapper 传自定义 assigned/updated，或把状态挂到装饰器外部容器。`,
  },
''',
    '0016-异常处理': r'''  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `finally 块里写 return 会怎样？官方教程怎么说？Python 3.14 起又有什么新变化？`,
    source: '来源：Python 官方教程《Errors and Exceptions》8.5 节 + PEP 765 · 检索 2026-09-09 · 层级：一手',
    breakdown: `教程原文：finally 里有 return 时，返回值<strong>来自 finally 的 return</strong>而不是 try 的（连异常都会被吞掉）——原文直接说「This can be confusing and is therefore discouraged」。<strong>3.14 起编译器对 finally 中的 return 发出 SyntaxWarning</strong>（PEP 765），未来可能变成语法错误。AI 生成的清理代码里 finally-return 是经典暗雷，审查时直接标红。`,
  },
  {
    type: 'mechanism',
    level: '高级岗常问',
    prompt: `<code>except*</code> 和 <code>except</code> 有什么区别？异常组（ExceptionGroup）解决什么问题？`,
    source: '来源：Python 官方教程《Errors and Exceptions》8.9「Raising and Handling Multiple Unrelated Exceptions」· 检索 2026-09-09 · 层级：一手',
    breakdown: `<code>ExceptionGroup</code>（3.11+）把<strong>多个不相关异常打包成一个</strong>（如并发任务里同时炸了三个错，不丢任何一个）；<code>except*</code> <strong>选择性提取</strong>组内匹配类型的异常处理，不匹配的<strong>继续向后续 except* 子句传播</strong>，最终未处理的重抛——嵌套异常组也能逐层剥离。普通 except 只匹配单一异常，遇上组只能整体处理。AI 写的「批量任务收集异常」代码用它才能既汇总又不丢细节。`,
  },
''',
    '0019-ABC': r'''  {
    type: 'mechanism',
    level: '高级岗常问',
    prompt: `除了 register()，官方还提供什么机制来定制 isinstance/issubclass 的判定？官方例子（MyIterable）是怎么写的？`,
    source: '来源：Python 官方文档 abc「abc.ABCMeta.__subclasshook__」条目 · 检索 2026-09-09 · 层级：一手',
    breakdown: `<code>__subclasshook__(cls, C)</code>：类方法——返回 True 判为子类、False 判不是、<strong>NotImplemented 交给默认规则</strong>。官方例子：MyIterable 里检查 <code>any('__iter__' in B.__dict__ for B in C.__mro__)</code>——<strong>按结构</strong>（有没有实现 __iter__）而不是按继承判定，配合 register 补第三方类。这是「结构化判定」的官方实现方式，面试官问虚拟子类机制时这才是完整答案。`,
  },
  {
    type: 'trap',
    level: '高级岗常问',
    prompt: `AI 写 ABC 时同时用了 register() 和 __subclasshook__。审查：两者语义有什么本质区别？什么场景必须用后者？`,
    source: '来源：Python 官方文档 abc「ABCMeta.register」与「__subclasshook__」条目 · 检索 2026-09-09 · 层级：一手（场景化改写）',
    breakdown: `<strong>register</strong>：无条件<strong>点名登记</strong>——不看类长什么样，isinstance 恒 True（不检查实现，审查题同款风险）；<strong>__subclasshook__</strong>：<strong>按结构判定</strong>——逐个候选类检查是否真的实现了协议方法，没实现的照旧 False。规则：第三方类无法改继承 → register；需要「像鸭子才算鸭子」的严格语义 → subclasshook（官方 MyIterable 就是它）。AI 只知 register 不知 subclasshook，是 ABC 认知盲区。`,
  },
''',
    '0020-类型标注': r'''  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `官方文档给 Any 的定义原文是什么？3.11 之后 Any 多了什么用法？`,
    source: '来源：Python 官方文档 typing「typing.Any」条目 · 检索 2026-09-09 · 层级：一手',
    breakdown: `原文：Any = <strong>unconstrained type</strong>（无约束类型），<strong>「Every type is assignable to Any. Any is assignable to every type.」</strong>——双向兼容，所以它是类型检查的黑洞：把 Any 传给 int 参数不报错、从 Any 取值调任何方法也不报错。3.11 起 Any 还<strong>可作基类</strong>（文档：用于高度动态/任意鸭子类型的类避免检查器报错）。审查 AI 代码时 Any 泛滥即「类型标注形同虚设」。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `官方文档说 Protocol 类「primarily used with static type checkers that recognize structural subtyping」——这句话怎么理解？`,
    source: '来源：Python 官方文档 typing「class typing.Protocol」条目 · 检索 2026-09-09 · 层级：一手',
    breakdown: `<strong>结构化子类型（静态鸭子类型）</strong>：<code>class Proto(Protocol): def meth(self) -> int: ...</code> 定义一个「形状」；任何定义了 meth 的类<strong>自动被静态检查器视为 Proto 的子类型</strong>（无需继承/注册），官方例子 func(x: Proto) 传普通类 C 就能过检查。与 ABC 的本质区别：Protocol 的判定发生在<strong>类型检查器里</strong>（零运行时开销、零继承侵入），ABC 判定发生在运行时。`,
  },
''',
}


LESSONS = [
    # (文件名, 巩固小节标题, lesson 键, 题组 JS 文本)
    # ——— 已完成试点（保持幂等） ———
    ('0008-类和对象.html', '巩固与延伸', '0008-类和对象', "[\n            {\n              type: 'trap',\n              level: '中级岗常问',\n              prompt: `你用 AI 工具写了一个购物车类：\n<pre><code>class Cart:\n    items = []\n\n    def add(self, sku):\n        self.items.append(sku)</code></pre>\n两个实例 c1、c2 各自 add 了不同的商品，结果 c2.items 里出现了 c1 的商品。为什么？怎么改？`,\n              source: '考点来源：CSDN 文库「Python 面试核心考点解析：面向对象」（类属性陷阱题）· 场景改写',\n              breakdown: `<code>items = []</code> 是<strong>类属性</strong>：整个类只有一份，存在类字典里。实例访问 <code>self.items</code> 时沿查找链命中类属性，append 改的就是这个共享列表——所有实例看到同一份数据。修复：在 <code>__init__</code> 里写 <code>self.items = []</code>（实例属性，每个实例一份）。这是「可变类属性的幽灵共享」，与可变默认参数陷阱同源；AI 生成代码时非常常见，面试官也知道你在用 AI，专挑这种坑问。`,\n            },\n            {\n              type: 'mechanism',\n              level: '中级岗常问',\n              prompt: `多继承 <code>class D(B, C)</code>，B、C 都继承 A，四个类都有 <code>who()</code>，且 B、C 的 <code>who()</code> 里都调用了 <code>super().who()</code>。调用 <code>D().who()</code> 时，执行顺序是怎样的？super() 到底指向谁？`,\n              source: '考点来源：千锋教育「Python 面试题：阅读下面的代码说出运行结果」（MRO 题）· 场景改写',\n              breakdown: `MRO 由 C3 线性化得出：<strong>D → B → C → A → object</strong>。<code>super()</code> 指向的不是「父类」，而是<strong>MRO 中的下一个类</strong>——所以 B.who 里的 super 走到 C.who（而不是 A），C 里的 super 再走到 A.who，A 只执行一次。把「super = MRO 下一个」刻进脑子，菱形继承的所有走位题都能手推。`,\n            },\n            {\n              type: 'review',\n              level: '高级岗常问',\n              prompt: `AI 生成了下面的多继承代码，你在代码审查。找出所有问题并给出修复：\n<pre><code>class Animal:\n    def __init__(self, name):\n        self.name = name\n\nclass Flyer(Animal):\n    def __init__(self, name, wings):\n        Animal.__init__(self, name)\n        self.wings = wings\n\nclass Swimmer(Animal):\n    def __init__(self, name, fins):\n        Animal.__init__(self, name)\n        self.fins = fins\n\nclass Duck(Flyer, Swimmer):\n    def __init__(self, name):\n        Flyer.__init__(self, name, 2)\n        Swimmer.__init__(self, name, 2)</code></pre>`,\n              source: '考点来源：CSDN「一份高质量的 Python 基础知识笔试题完整解析」（super 硬编码调用题）· 场景改写',\n              breakdown: `两个问题：① <code>Animal.__init__</code> 被调用了<strong>两次</strong>（Flyer、Swimmer 各硬编码一次）——若 __init__ 里有计数/注册等副作用就会翻倍；② 硬编码父类名切断了 super 的 MRO 协作链：Swimmer 在链上被跳过，「每个类只执行一次且有序」的保证不复存在。修复：全部改用 <code>super().__init__(...)</code>，多继承时参数全量透传，让 MRO 自己调度。`,\n            },\n            {\n              type: 'design',\n              level: '高级岗常问',\n              prompt: `你要用 AI 搭一个 Agent 工具系统，每个工具都要有「日志、超时、重试」能力。在给 AI 的提示词里，你该让它用继承还是组合来复用这些能力？为什么？`,\n              source: '考点来源：Real Python《Inheritance and Composition: A Python OOP Guide》· 场景改写',\n              breakdown: `优先<strong>组合</strong>：把日志/超时/重试做成独立组件注入（如 <code>Tool(runner, logger, retry)</code>）。继承只应表达严格的 is-a 关系，用它复用横切能力会掉进多继承 MRO 的深水区（上一题就是活例）。组合可插拔、可独立测试、也更容易让 AI 一次写对——这是「多用组合、少用继承」在 AI 协作时代的实践版。`,\n            },\n            {\n              type: 'scenario',\n              level: '中级岗常问',\n              prompt: `写一个 <code>inspect_class</code> 反射小工具（建议用 Claude Code 完成），任务与验收点见任务卡。`,\n              scene: {\n                time: '约 15 分钟',\n                goal: '传入任意类，打印它的 MRO 与方法分类（实例方法 / 类方法 / 静态方法），并校验一组 isinstance / issubclass 关系（如 issubclass(Duck, Animal)）。',\n                accept: ['MRO 对多继承类打印正确', '三种方法分类无遗漏、无错分', 'isinstance / issubclass 结论与 MRO 一致'],\n              },\n              source: '任务基于《8.类和对象》课程知识点（反射工具小节）· 来源层级：一手（Python 官方文档 inspect 模块）场景化',\n              breakdown: `思路：<code>cls.__mro__</code> 拿 MRO；遍历 <code>cls.__dict__</code>，用 <code>isinstance(v, classmethod)</code> / <code>isinstance(v, staticmethod)</code> / <code>types.FunctionType</code> 区分三种方法；isinstance/issubclass 直接调用即可。坑：判断「实例方法」时别在实例上 hasattr（会踩类属性共享的幽灵），在类字典上分类才干净。`,\n            },\n          ]"),
    ('db-0006-索引.html', '巩固延伸', 'db-0006-索引', "[\n            {\n              type: 'trap',\n              level: '初级岗常问',\n              prompt: `你用 AI 写了一条高频搜索：<code>SELECT * FROM users WHERE name LIKE '%明%'</code>，name 列上有 B+ 树索引，但 EXPLAIN 显示 Seq Scan（全表扫）。为什么索引没生效？怎么改？`,\n              source: '考点来源：牛客专刊「数据库索引-笔面试必考点 15 讲」（索引失效题）· PostgreSQL 场景改写（答案以 PG16 实测执行计划为准）',\n              breakdown: `前导 % 破坏了 B+ 树的字典序定位——「任意位置含『明』」无法用树缩小范围，只能全表扫（左模糊连 text_pattern_ops 索引也无能为力）。改法：① 前缀匹配改成右模糊 <code>name LIKE '明%'</code>，注意 PG 默认排序规则下<strong>普通 btree 索引不服务 LIKE</strong>——需要 C 排序规则或 <code>text_pattern_ops</code> 索引（实测：建 pattern_ops 索引后走 Bitmap Index Scan，Index Cond 落在「明」到「昏」的区间）；② 中缀/模糊搜索用 pg_trgm 的 GIN 三元组索引或全文检索（tsvector + GIN）。同类失效还包括：对索引列做运算/函数、隐式类型转换、OR 关联非索引列。`,\n            },\n            {\n              type: 'mechanism',\n              level: '初级岗常问',\n              prompt: `面试官连问：为什么 B+ 树索引能加快查询？二级索引不是直接拿到数据了吗，为什么还要「回表」？`,\n              source: '考点来源：CSDN「MySQL 索引、锁、三大范式一篇搞定」+ 牛客网回表考点 · PostgreSQL 口径改写',\n              breakdown: `B+ 树是排好序的查找结构：树高 2~4 层，几次 IO 就能定位（O(log n)），替代逐行比对的全表扫（O(n)）——就像书的目录。二级索引叶子只存<strong>索引键 + 行指针（PG 的 TID）</strong>，整行数据在表（heap）里；要拿索引外的列，必须再按 TID 查一次表——这次再查就是「回表」。若查询列全在索引里（覆盖索引 / Index Only Scan），可免回表。`,\n            },\n            {\n              type: 'review',\n              level: '高级岗常问',\n              prompt: `AI 生成了订单表联合索引和四条查询，你在代码审查。逐条判断：用得上这个索引吗（全部 / 部分 / 完全不行）？\n<pre><code>CREATE INDEX idx_orders ON orders(user_id, status, created_at);\n\n-- ①\nSELECT * FROM orders WHERE user_id = 1 AND status = 'paid';\n-- ②\nSELECT * FROM orders WHERE status = 'paid' AND created_at > now() - interval '7 days';\n-- ③\nSELECT * FROM orders WHERE user_id = 1 AND created_at > now() - interval '7 days';\n-- ④\nSELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC LIMIT 20;</code></pre>`,\n              source: '考点来源：CSDN「MySQL 索引、锁、三大范式一篇搞定」（最左前缀题）· PostgreSQL 场景改写（答案以 PG16 + 100 万行实测执行计划为准）',\n              breakdown: `联合索引按 user_id → status → created_at 排序（PG16 + 100 万行实测）：① 从最左列连续命中，user_id、status 都进入 Index Cond，索引范围定位 ✓；② 跳过最左列，索引无法定位起点 → Parallel Seq Scan，完全用不上；③ user_id 定位到子树，created_at 因中间 status 断层只能作为<strong>索引内过滤</strong>（逐条检查而非范围 seek，选择性大打折扣）——注意：MySQL 经典答案说「范围后断最左前缀」，PG 里它仍会进 Index Cond，但只是过滤器；④ 索引序是 (status, created_at)，ORDER BY created_at 缺 status 等式 → 出现 Sort 节点；补上 <code>AND status = 'paid'</code> 后变成 Index Only Scan Backward，免排序。`,\n            },\n            {\n              type: 'design',\n              level: '高级岗常问',\n              prompt: `团队要做一个 RAG 问答系统，AI 提议「文档全放向量库就够了」。你坚持保留 PostgreSQL。向量索引和 B+ 树索引各解决什么问题？混合检索为什么离不开关系库？`,\n              source: '来源层级：一手（PostgreSQL 官方文档 pgvector / indexes 章节）+ 场景化改写',\n              breakdown: `向量索引（如 pgvector 的 HNSW）解决<strong>相似度召回</strong>（语义相近的文档块），B+ 树解决<strong>结构化精确查询</strong>（用户、权限、元数据、状态过滤）。RAG 实际要的是混合检索：先按 user_id/权限/时间做结构化过滤，再向量召回，还要事务（计费、去重）与一致性——这些是关系库的标配。pgvector 让向量与 B+ 树共存一个库，避免两套系统同步的复杂度。`,\n            },\n            {\n              type: 'scenario',\n              level: '中级岗常问',\n              prompt: `用 Claude Code 完成一次慢查询排查（任务与验收点见任务卡）。`,\n              scene: {\n                time: '约 20 分钟',\n                goal: 'orders 表 100 万行、建有联合索引，某高频查询 EXPLAIN 显示 Seq Scan。诊断索引为什么没生效，写出修正 SQL，并用 EXPLAIN 验证执行计划改变。',\n                accept: ['能指出失效原因（列上运算 / 左模糊 / 跳过最左列等）', '修正后的 SQL 执行计划出现 Index Scan（或 Index Only Scan）', '能说出新计划的代价变化'],\n              },\n              source: '任务基于《06.索引》课程知识点 · 来源层级：一手（PostgreSQL 官方文档 EXPLAIN 章节）场景化',\n              breakdown: `思路：先 <code>EXPLAIN (ANALYZE, BUFFERS)</code> 看计划与代价；对照 WHERE/ORDER BY 检查最左前缀、列上是否有函数/运算/类型转换、是否左模糊；修正后再次 EXPLAIN 对比。坑：统计信息过期时计划可能仍不走索引——先 <code>ANALYZE orders;</code> 再验证。`,\n            },\n          ]"),
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
    # ——— 第五批 ———
    ('0019-ABC.html', '巩固与延伸', '0019-ABC', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `Python 的「鸭子类型」是什么意思？AI 生成的代码里没有任何 isinstance 检查，反而更 Pythonic——为什么？`,
    source: '考点来源：博客园「Python 面试题面向对象」（鸭子类型题）· 场景改写',
    breakdown: `<strong>「走起来像鸭子、叫起来像鸭子，就是鸭子」</strong>：只关心对象<strong>有没有所需的方法</strong>，不关心它的类型。所以函数参数不写类型检查、任何实现了 read() 的对象都能传给读文件的逻辑——协议兼容即类型。代价：错误推迟到运行时才暴露（TypeError: missing method）。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `面向对象的三大特性是什么？Python 的多态靠什么实现？`,
    source: '考点来源：博客园「Python 面试题面向对象」（OOP 三特性题）· 场景改写',
    breakdown: `<strong>封装</strong>（隐藏实现细节，暴露接口）、<strong>继承</strong>（复用与扩展）、<strong>多态</strong>（同一接口、不同行为）。Python 的多态主要靠<strong>鸭子类型</strong>实现——不要求继承同一基类，只要实现相同方法就能互换（这也是 ABC 存在的原因：当接口需要显式契约时用它约束）。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的代码用 <code>register()</code> 把没实现接口的类注册成了 ABC 的虚拟子类。审查：虚拟子类与真实继承有什么区别？register 有什么风险？
<pre><code>class Storage(ABC):
    @abstractmethod
    def save(self, data): ...

class Weird:          # 没有 save 方法
    def load(self): ...

Storage.register(Weird)
print(isinstance(Weird(), Storage))   # True！</code></pre>`,
    source: '考点来源：博客园「Python 面试题面向对象」（虚拟子类题）· 场景改写',
    breakdown: `<code>register()</code> 只在 ABCMeta 的注册表里登记，<strong>isinstance/issubclass 返回 True，但完全不检查实现</strong>——Weird() 没有 save()，调用即 AttributeError。真实继承 + @abstractmethod 会在<strong>实例化时</strong>通过 __abstractmethods__ 检查拦下未实现者。风险：register 绕过全部契约检查，只应在「第三方类无法改继承关系」时谨慎使用，且调用前自己兜底。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `什么时候选 Protocol 而不是 ABC？两者的本质区别是什么？`,
    source: '考点来源：Maxiom「Python Developer Interview Questions（2026）」（ABC vs Protocol 题）· 场景改写',
    breakdown: `<strong>ABC</strong>：运行时契约——强制继承关系，实例化时检查抽象方法，适合「你的体系里必须显式注册」；<strong>Protocol</strong>：<strong>静态（类型检查器）契约</strong>——结构化子类型，任何「长得像」的类自动兼容，零运行时开销，适合给第三方代码、鸭子类型场景补类型检查。口诀：要运行时拦截选 ABC，要静态检查且不打扰运行时选 Protocol。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `用 ABC 定义一个存储接口（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '定义 Storage 抽象基类（save/load 抽象方法）；实现 FileStorage 与 MemoryStorage；漏实现抽象方法的类在实例化时报 TypeError；再用 register 注册一个第三方类并说明行为差异。',
      accept: ['两个实现正常使用', '漏实现时实例化即报错', 'register 的虚拟子类 isinstance 通过但调用缺方法报错（能解释差异）'],
    },
    source: '任务基于《19.ABC》课程知识点 · 来源层级：一手（Python 官方文档 abc 章节）场景化',
    breakdown: `思路：<code>class Storage(ABC): @abstractmethod def save...</code>；子类继承并全部实现。坑：抽象方法装饰器别漏（漏了实例化不拦截）；register 虚拟子类不检查实现（审查题同款）；ABC 与 @dataclass 混用时注意 ABC 的 __init__ 约束。`,
  },
]'''),
    ('0020-类型标注.html', '巩固与延伸', '0020-类型标注', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `Python 的类型标注会在运行时强制吗？不会的话，它的价值在哪？`,
    source: '考点来源：CSDN「Python 面试宝典（终极版）」（类型标注题）· 场景改写',
    breakdown: `<strong>运行时完全不强制</strong>（除非用 pydantic 等库主动校验）——标注只是元数据。价值：① 静态检查器（mypy/pyright）提前发现类型错误；② IDE 补全/跳转；③ 给 AI 与协作者的「接口文档」——AI 时代这是最大的价值：标注写清楚，AI 生成代码的类型错误率显著下降。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `写一个「类型安全的通用容器」，get 返回的元素类型与放入的一致，用什么实现？核心写法是什么？`,
    source: '考点来源：CSDN「Python 面试宝典（终极版）」（泛型场景题）· 场景改写',
    breakdown: `<strong>TypeVar + Generic</strong>：<code>T = TypeVar('T'); class Box(Generic[T]): def get(self) -> T: ...</code>——<code>Box[int].get()</code> 静态检查推断为 int。类型检查器据此追踪类型流转：从 Box[int] 取出的值赋给 str 会报错。这是「类型安全容器」的标准答案。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的代码参数全标 <code>Any</code>，审查时你要求收敛。Any 和 object 有什么区别？为什么专家说 Any 是「类型检查的黑洞」？`,
    source: '考点来源：CSDN「Python 面试宝典（终极版）」（Any vs object 题）· 场景改写',
    breakdown: `<code>Any</code>：<strong>关闭所有检查</strong>——与任何类型双向兼容，赋值/调用都不报错，一个 Any 污染整条链（黑洞）；<code>object</code>：最宽但<strong>具体</strong>的类型——只能当普通 object 用，调方法要 isinstance 收窄。审查规则：Any 只出现在「真·动态」边界（反序列化、插件参数），内部逻辑必须收窄成具体类型。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `要给一个存量大型项目引入类型检查，正确的推进策略是什么？一次全标为什么行不通？`,
    source: '考点来源：Maxiom「Python Developer Interview Questions（2026）」（渐进式类型化题）· 场景改写',
    breakdown: `<strong>渐进式</strong>：① 从<strong>核心模块/公共接口</strong>开始标注（收益最大）；② 检查器增量开启（先 basic 再 strict，或用 per-file 忽略列表）；③ 第三方库无标注的补 stub 或用 Any 隔离；④ CI 里逐步收紧。一次全标会引爆几千条既有错误，没人敢合——类型化是过程不是开关。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `给一段现有代码补类型标注（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '给一个「用户查找」模块的函数补全标注（参数/返回值/Optional 字段）；写一个 Generic[T] 的 Result 容器；若装了 mypy/pyright 则跑通无错（未装则说明标注含义）。',
      accept: ['函数签名标注完整（含 Optional 场景）', 'Result[T] 泛型容器标注正确', '能说清每处标注对静态检查的作用'],
    },
    source: '任务基于《20.类型标注》课程知识点 · 来源层级：一手（Python 官方文档 typing 章节）场景化',
    breakdown: `思路：参数 <code>-> list[User]</code>、可空字段 <code>Optional[str]</code>（3.10+ 用 str | None）；容器 <code>T = TypeVar('T'); class Result(Generic[T])</code>。坑：别用 Any 偷懒（审查题同款）；dict 要标全 <code>dict[str, int]</code> 而不是裸 dict。`,
  },
]'''),
    ('0021-模块化.html', '巩固与延伸', '0021-模块化', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `模块和包的区别是什么？Python 3.3+ 的「命名空间包」又是什么？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（基础理论 + 工程实践篇）」· 场景改写',
    breakdown: `<strong>模块</strong>：单个 .py 文件；<strong>包</strong>：目录 + <code>__init__.py</code>（含子模块）。命名空间包：3.3+ 无 __init__.py 的目录也能当包导入（便于大型项目分目录合并），但显式 __init__.py 能控制导出与包级初始化，工程上仍推荐。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `两个模块相互 import 导致 ImportError/AttributeError，怎么解决？有哪些方案？`,
    source: '考点来源：腾讯云「Python 模块化编程：面试题深度解析」（循环导入题）· 场景改写',
    breakdown: `循环导入的本质：A 导入 B 时 B 又要导入 A，A 尚在<strong>半初始化状态</strong>（需要的名字还没定义）。方案：① <strong>延迟导入</strong>（import 写进函数体，调用时才执行）；② 抽公共依赖到第三个模块（C），A、B 都只 import C；③ 改「导入模块」为「导入名字」（from .b import f 换成 import .b 再 b.f 调用）。AI 生成的多模块代码最爱互导，审查时见到 A→B 与 B→A 同时出现就要报警。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的 utils 模块顶层直接执行了「读环境变量 + 建数据库连接 + 启动定时线程」。审查：模块顶层代码什么时候执行？这些副作用会带来什么问题？`,
    source: '考点来源：腾讯云「Python 模块化编程：面试题深度解析」（导入副作用题）· 场景改写',
    breakdown: `模块顶层代码在<strong>首次被 import 时执行一次</strong>（整个进程生命周期仅一次）。副作用问题：① 导入变慢（连 DB 要等超时）；② 导入顺序依赖（环境变量还没设好就连接）；③ 测试/CLI 场景无法隔离；④ import 失败连带整个应用起不来。修复：顶层只定义函数/常量，副作用放进显式 init()/连接池懒加载。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `包内部引用兄弟模块，用相对导入还是绝对导入？为什么？`,
    source: '考点来源：腾讯云「Python 模块化编程：面试题深度解析」（导入方式题）· 场景改写',
    breakdown: `<strong>包内用相对导入</strong>：<code>from .models import User</code>——包改名/移动位置后内部引用零改动，且明确表达「这是包内关系」；绝对导入（from app.models import User）依赖顶层包名，被嵌入别的项目时全崩。注意：相对导入只能在<strong>包内模块</strong>用，直接运行的顶层脚本（__main__）必须绝对导入。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `把一个扁平脚本拆成包（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '原脚本 200 行全在 main.py：拆成 utils/（工具函数）、models/（数据结构）两个包；包内用相对导入；入口 main.py 用绝对导入；无循环导入；顶层无副作用。',
      accept: ['包结构清晰、内部相对导入', 'main.py 运行结果与原脚本一致', 'import 任意子模块不触发副作用'],
    },
    source: '任务基于《21.模块化》课程知识点 · 场景化',
    breakdown: `思路：按职责拆函数进 utils/、类进 models/，__init__.py 里做轻量 re-export；包内 from .x import y；入口 import utils、import models 绝对导入。坑：别在 __init__.py 里做重活（导入副作用题同款）；拆完跑一遍原测试/样例确保行为一致。`,
  },
]'''),
    ('0022-标准库.html', '巩固与延伸', '0022-标准库', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `读写文件的标准姿势是什么？为什么 open 必须显式写 <code>encoding='utf-8'</code>？`,
    source: '考点来源：CSDN 文库「Python 面试核心考点解析」（文件操作题）· 场景改写',
    breakdown: `<code>with open(path, 'r', encoding='utf-8') as f: ...</code>——with 保证异常路径也关闭句柄；encoding 显式指定避免<strong>平台默认编码</strong>（Windows 是 GBK，读 UTF-8 文件直接乱码/UnicodeDecodeError）。AI 生成的跨平台脚本漏写 encoding 是乱码事故头号来源。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `用正则匹配「行首 1–6 个 # 后跟至少一个空格」的 Markdown 标题，正确的模式是什么？贪婪与非贪婪怎么选？`,
    source: '考点来源：CSDN 文库「Python 面试核心考点解析」（正则题）· 场景改写',
    breakdown: `<code>^#{1,6} \\S</code> 或 <code>^#{1,6} +</code>（注意量词后跟空格是字面空格）；用 <code>re.MULTILINE</code> 让 ^ 匹配每行行首。贪婪 vs 非贪婪：<code>.*</code> 贪婪尽量多吃（容易跨行多吃），<code>.*?</code> 非贪婪见好就收——提取一对标记之间的内容用非贪婪，匹配「整行注释」这类有明确边界时贪婪更快更安全。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的路径拼接：<code>path = dir + '/' + filename</code>。审查：在 Windows 上会怎样？正确姿势是什么？
<pre><code>import os

def save(dir, name):
    path = dir + '/' + name
    with open(path, 'w') as f:
        f.write('x')</code></pre>`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目」（路径拼接陷阱题）· 场景改写',
    breakdown: `硬编码 <code>'/'</code> 在 Windows 上方向错误、且尾部多斜杠/目录缺斜杠都会出问题；同目录判等、规范化都没保障。正确：<code>os.path.join(dir, name)</code> 或更现代的 <code>pathlib.Path(dir) / name</code>——自动处理分隔符与边界。AI 生成代码最爱手拼路径，跨平台部署（服务器 Linux、本地 Windows）时必炸。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `pathlib 相比 os.path 好在哪里？新项目为什么推荐 pathlib？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目」（pathlib 题）· 场景改写',
    breakdown: `<strong>面向对象</strong>：Path 对象自带属性与操作（<code>p.parent / p.suffix / p.read_text()</code>），链式 <code>p / 'a' / 'b'</code> 比嵌套 join 可读得多；<strong>跨平台</strong>：WindowsPath/PosixPath 自动适配；内置遍历 <code>p.glob('**/*.py')</code> 比 os.walk 简洁。os.path 仍可用（兼容老代码），但新代码默认 pathlib。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个目录扫描统计工具（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '用 pathlib 递归扫描目录：用正则过滤目标文件（如 _test.py 结尾）；统计每个文件行数与总行数；输出按路径排序的表格。',
      accept: ['pathlib 全链路（无字符串拼路径）', 'glob/正则过滤正确', '行数统计与总行数正确'],
    },
    source: '任务基于《22.标准库》课程知识点 · 来源层级：一手（Python 官方文档 pathlib/re 章节）场景化',
    breakdown: `思路：<code>for p in Path(root).rglob('*.py'): if re.search(r'_test\\.py$', p.name)</code> 过滤；<code>p.read_text(encoding='utf-8').count('\\n')</code> 行数；结果 sorted。坑：read_text 记得 encoding（陷阱题同款）；二进制/大文件用迭代计数而不是整读。`,
  },
]'''),
    # ——— 第六批 ———
    ('0023-第三方库.html', '巩固与延伸', '0023-第三方库', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `AI 让你直接 <code>pip install xxx</code> 装到系统 Python。审查：项目依赖管理的正确工作流是什么？为什么必须先建虚拟环境？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（依赖管理工作流题）· 场景改写',
    breakdown: `正确工作流：<strong>建 venv（每项目一个）→ 激活 → pip install → 记录依赖到 requirements.txt → 锁版本</strong>。不建 venv 直接装全局：多个项目依赖互相污染、版本冲突无法隔离、系统 Python 被第三方包搞坏（macOS/服务器都踩过）。AI 给的安装命令默认没 venv，是新手项目事故的头号来源。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `<code>requirements.txt</code> 里的 <code>==</code>、<code>>=</code>、<code>~=</code> 各是什么意思？写「范围」有什么风险？`,
    source: '考点来源：pip 官方文档 Requirement Specifiers · 场景改写',
    breakdown: `<code>==</code> 精确版本；<code>>=</code> 下限不限上限（未来大版本可能不兼容）；<code>~=</code> 兼容版本（<code>~=1.4.2</code> == >=1.4.2, <1.5.0——允许补丁/次版本升级、禁止主版本跳变）。风险：范围过大时「今天能装、半年后装出来行为不同」——部署不可复现，生产环境必须锁死。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 装了两个库：库 A 依赖 X==1.0、库 B 依赖 X==2.0。审查：pip 会怎么处理？运行时会发生什么？怎么解决？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（依赖冲突题）· 场景改写',
    breakdown: `pip 默认<strong>不做全局依赖解析</strong>——后装的 X 覆盖先装的（版本漂移），运行时谁的行为错随导入顺序「随机」爆发：A 调 X 的旧 API 报 AttributeError，或更糟——<strong>静默行为不一致</strong>。解决：① 锁文件 + 依赖解析器（uv/pip-tools）提前发现冲突；② 找兼容版本组合；③ 隔离到不同 venv/服务。AI 装包不检查依赖树是生产环境「依赖地狱」的起点。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `手写 requirements.txt（直接依赖 + 版本范围）与锁文件（uv.lock / poetry.lock）的区别是什么？部署环境为什么必须用锁文件？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（锁定策略题）· 场景改写',
    breakdown: `requirements.txt 通常只列<strong>直接依赖</strong>（可带范围），间接依赖版本不受控；锁文件记录<strong>完整依赖树的精确版本 + 哈希</strong>——同一份锁文件在任何机器装出来字节级一致。部署/CI 原则：开发用范围（宽松、好升级），<strong>发布与部署用锁文件</strong>（可复现、可回滚）。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `搭一个可复现的项目环境（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '建 venv → 安装两个依赖（如 requests 与 pytest）→ 生成 requirements.txt 与锁文件（pip freeze）→ 用第二个全新 venv 按锁文件安装，验证 pip show 版本一致。',
      accept: ['venv 隔离生效（全局 python 不受影响）', '两个环境安装出的版本完全一致', '能说清 requirements 与锁文件的区别'],
    },
    source: '任务基于《23.第三方库》课程知识点 · 来源层级：一手（Python 官方文档 venv / pip freeze 章节）场景化',
    breakdown: `思路：<code>python3 -m venv .venv && source .venv/bin/activate && pip install requests pytest</code>；<code>pip freeze > requirements.lock.txt</code>；第二个 venv 里 <code>pip install -r requirements.lock.txt</code> 后 <code>pip show</code> 对比。坑：freeze 输出含全部间接依赖（这是锁文件的特性不是 bug）；pip 自身的版本也影响安装行为，必要时一并记录。`,
  },
]'''),
    ('0024-事件循环.html', '巩固与延伸', '0024-事件循环', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `asyncio 是单线程的，为什么能实现高并发？事件循环到底在做什么？`,
    source: '考点来源：腾讯云「Python 并发编程模型：面试中的重点考察点」（并发模型题）· 场景改写',
    breakdown: `单线程通过<strong>事件循环</strong>调度成千上万个协程：协程在<strong>等待 IO 时让出控制权</strong>（await），循环立刻切换到其他就绪协程——CPU 几乎不空闲，一个线程扛住大量并发连接。适合 <strong>IO 密集</strong>（网络请求、数据库、文件）；CPU 密集计算会独占线程，得用进程池/线程池。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `协程在什么时机切换？一段没有 await 的同步代码会打断其他协程吗？`,
    source: '考点来源：腾讯云「Python 并发编程模型」（协程切换题）· 场景改写',
    breakdown: `只在 <code>await</code> 处切换（等待不可立即完成的 IO/任务时让出）。<strong>没有 await 的代码是原子的</strong>——一段同步计算会一路跑完，期间其他协程全部排队（所以循环里做重计算/调阻塞函数会卡死整个 loop）。这就是「协程是协作式调度」的含义：不让，谁也抢不走。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的代码给 Future 挂了 done 回调，回调里没写 try/except。审查：回调抛异常会发生什么？主流程能捕获到吗？
<pre><code>async def main():
    fut = loop.create_future()
    fut.add_done_callback(boom)   # boom 内部 raise ValueError

def boom(fut):
    raise ValueError('回调爆炸')</code></pre>`,
    source: '考点来源：Runebook（Python 官方文档中文版）（回调异常题）· 场景改写',
    breakdown: `回调异常<strong>不会传播回 await 方</strong>——它被事件循环捕获并交给 <code>loop 的异常处理器</code>（默认打日志），主流程若无其事继续跑。危害：关键失败静默。修复：回调内部 try/except 显式处理；需要「失败即中止」语义时改用 await/回调链返回。AI 生成的回调代码最爱裸奔。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `在子线程里 await 主线程事件循环创建的 Task/Future，会发生什么？跨线程该怎么做？`,
    source: '考点来源：Runebook（Python 官方文档中文版）（线程亲和性题）· 场景改写',
    breakdown: `Future/Task <strong>绑定创建它的循环</strong>：在别的线程直接 await 会 RuntimeError（Future attached to a different loop）。跨线程协作的姿势：① <code>loop.call_soon_threadsafe(cb)</code> 把回调投递回主循环；② <code>asyncio.run_coroutine_threadsafe(coro, loop)</code> 拿到 concurrent Future 在别的线程等待。Agent 服务里「后台线程发事件给主循环」就是这个模式。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个 asyncio 并发下载器（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '用 asyncio.gather 并发请求 10 个 URL（可用 asyncio.sleep 模拟）；统计并发总耗时显著小于 10 次串行耗时；其中一个请求失败不影响其他结果收集。',
      accept: ['并发执行（总耗时 ≈ 单个最长耗时而非求和）', '单个失败不中断全部（return_exceptions 或按任务捕获）', '能说出 await 在哪几个点让出'],
    },
    source: '任务基于《24.事件循环》课程知识点 · 场景化',
    breakdown: `思路：<code>async def fetch(i): await asyncio.sleep(0.1); return i</code>；<code>results = await asyncio.gather(*[fetch(i) for i in range(10)], return_exceptions=True)</code>。坑：gather 默认任一失败即抛（其余被取消）——收集部分失败要 return_exceptions；并发数无上限时注意对端限流（下节课的限流工具）。`,
  },
]'''),
    ('0025-Future类.html', '巩固与延伸', '0025-Future类', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `asyncio 里 Task 与 Future 是什么关系？各在什么场景出现？`,
    source: '考点来源：Skillup「Python 后端面试题（asyncio 高频面试题汇总）」（Task vs Future 题）· 场景改写',
    breakdown: `<strong>Task 是 Future 的子类</strong>：Future 是「未来结果的占位符」（谁都可以 set_result 完成它，库/框架用它做回调桥接）；Task 额外<strong>包装一个协程</strong>并由事件循环调度执行——<code>asyncio.create_task(coro)</code> 得到的都是 Task。业务代码几乎总是跟 Task 打交道，Future 出现在自定义同步原语/桥接层。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `在协程里调用了同步阻塞函数（如 <code>time.sleep(5)</code> 或 requests.get），会发生什么？正确做法是什么？`,
    source: '考点来源：腾讯云「Python 并发编程模型」（事件循环陷阱题）· 场景改写',
    breakdown: `<strong>整个事件循环被阻塞 5 秒</strong>——所有协程全部停摆（单线程，睡死就是全死）。正确做法：① 有异步版本换 <code>await asyncio.sleep</code> / httpx；② 没有异步版本的 CPU/阻塞调用丢进线程池 <code>await loop.run_in_executor(None, blocking_fn)</code>。AI 在 asyncio 代码里塞同步 requests 是并发性能杀手，审查必查。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的代码创建了 Task 但没 await、也没取异常。审查：Task 抛异常后会发生什么？
<pre><code>async def worker():
    raise ValueError('任务炸了')

async def main():
    task = asyncio.create_task(worker())
    await asyncio.sleep(1)   # 没有 await task</code></pre>`,
    source: '考点来源：Runebook（Python 官方文档中文版）（Task 异常题）· 场景改写',
    breakdown: `异常<strong>不会中断主流程</strong>——事件循环只在 Task 被回收时打一条 <code>Task exception was never retrieved</code> 警告，然后静默丢弃。危害：任务失败无人知晓。修复：<code>await task</code>（异常照常抛）、<code>gather</code> 收集、或显式 <code>task.exception()</code>。规则：创建 Task 就必须有人「认领」它的结果或异常。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `一个 Future 注册了多个 done 回调，其中一个回调抛异常，其他回调还会执行吗？依赖回调做关键业务逻辑的设计有什么问题？`,
    source: '考点来源：Skillup「Python 后端面试题（asyncio 高频汇总）」（回调隔离题）· 场景改写',
    breakdown: `<strong>其他回调照常执行</strong>——回调异常被 loop 异常处理器单独记录，互不影响（隔离性其实不错）。但设计问题：回调是「发后不理」语义，业务关键路径（比如支付结果处理）放进回调，失败只打日志、无法可靠重试与告警。正确姿势：关键流程用 await/Task 编排，回调只做「通知/清理」类非关键工作。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个带超时的任务管理器（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '并发运行 5 个可能超时/失败的任务（asyncio.sleep 模拟）；单任务超时 1 秒即标记超时；全部结束后返回「成功/失败/超时」分类统计；没有任何 Task 异常被静默丢弃。',
      accept: ['超时任务被正确标记（asyncio.wait_for 或 wait+timeout）', '统计分类正确', '无「Task exception was never retrieved」警告'],
    },
    source: '任务基于《25.Future类》课程知识点 · 场景化',
    breakdown: `思路：<code>await asyncio.wait_for(task, timeout=1)</code> 逐个包裹（或 wait+timeout 批量）；捕获 TimeoutError/CancelledError 分类；每个任务都 await/exception() 认领。坑：wait_for 超时会<strong>取消</strong>任务——任务里 finally 清理要能扛取消；被取消的任务别重复 await。`,
  },
]'''),
    ('0026-协程-Coroutine.html', '巩固与延伸', '0026-协程-Coroutine', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `<code>async def f()</code> 只是定义。调用 <code>f()</code> 而不 await、也不交给循环，会发生什么？协程对象的生命周期是怎样的？`,
    source: '考点来源：腾讯云「Python 并发编程模型」（async/await 原理题）· 场景改写',
    breakdown: `调用 async 函数返回一个<strong>协程对象</strong>——<strong>一行都不会执行</strong>，直到它被 await（或被包装进 Task 交给循环）。裸调用不 await：Python 打 <code>RuntimeWarning: coroutine was never awaited</code>，函数体从未运行。AI 生成代码时「调了没 await」是 asyncio 头号低级错误，审查时看到 async 函数被裸调用就报警。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `单线程的协程也会有竞态条件吗？给一个具体例子。`,
    source: '考点来源：腾讯云「Python 并发编程模型」（协程竞态题）· 场景改写',
    breakdown: `<strong>会</strong>——没有 GIL 竞争，但有<strong>逻辑竞态</strong>：两个协程在 await 之间读写共享状态，交错执行。经典例子：<code>if balance >= amount: await 扣款()</code> 两个协程同时通过判断、双花扣款。没有 await 的代码段是原子的，但一旦 await 让出，回来时世界可能已经变了。修复：检查与修改放在同一段无 await 代码里，或用 asyncio.Lock。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的代码在协程里又调了 <code>asyncio.run()</code>，运行时报 <code>RuntimeError: asyncio.run() cannot be called from a running event loop</code>。审查并修复：
<pre><code>async def fetch():
    # AI 写的小工具函数内部
    return asyncio.run(do_http())   # ？</code></pre>`,
    source: '考点来源：Runebook（Python 官方文档中文版）（嵌套 run 题）· 场景改写',
    breakdown: `<code>asyncio.run()</code> 是「创建新循环并运行到结束」的<strong>入口函数</strong>——在一个循环里再 run 必然冲突。修复：协程内<strong>直接 await</strong>（<code>await do_http()</code>）；如果调用的是同步函数（requests 之类）则 <code>run_in_executor</code>。AI 生成「工具函数内部自带 asyncio.run」是最常见的复用性 bug——入口只能有一个。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `协程 A 中调用了同步阻塞函数（如 requests.get），对同一循环里的其他协程有什么影响？如何设计才能不传染？`,
    source: '考点来源：Runebook（Python 官方文档中文版）（阻塞传导题）· 场景改写',
    breakdown: `<strong>阻塞会传导给所有人</strong>：单线程循环卡死，其他协程（包括用户的健康检查、心跳）全部停摆——一条慢请求拖垮整个服务。设计原则：协程内<strong>禁止同步阻塞调用</strong>；必须用时 <code>run_in_executor</code> 隔离到线程池，或把阻塞调用封装成「异步外观」的适配层（同步实现 + 异步包装），让上层代码永远只看见 await。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个协程版限流批量请求器（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '对 20 个任务按「每批最多 5 个并发」分批执行；单任务失败不影响同批其他任务；模拟一次阻塞调用并正确放进 run_in_executor；全部结束后给出成败统计。',
      accept: ['并发上限 5 生效（asyncio.Semaphore）', '失败隔离且统计正确', '阻塞调用经 run_in_executor 执行、不卡住其他任务'],
    },
    source: '任务基于《26.协程-Coroutine》课程知识点 · 场景化',
    breakdown: `思路：<code>sem = asyncio.Semaphore(5)</code>，任务内 <code>async with sem:</code> 限流；失败逐任务捕获；阻塞函数 <code>await loop.run_in_executor(None, sync_work)</code>。坑：Semaphore 要在<strong>任务内</strong>获取（gather 前批量 acquire 会把并发上限变成 0）；executor 默认线程池，CPU 密集要传进程池。`,
  },
]'''),
    # ——— 第七批 ———
    ('0027-异步编程.html', '巩固与延伸', '0027-异步编程', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `asyncio.Lock 与 threading.Lock 有什么区别？为什么协程里用 threading.Lock 是坑？`,
    source: '考点来源：腾讯云「Python 并发编程模型：面试中的重点考察点」（锁的区别题）· 场景改写',
    breakdown: `<code>asyncio.Lock</code> 的等待是<strong>异步的</strong>——拿不到锁时 await 挂起、让出事件循环，其他协程照常跑；<code>threading.Lock</code> 的等待是<strong>同步阻塞</strong>——在单线程事件循环里拿不到锁会把<strong>整个循环卡死</strong>（连解锁的协程都跑不了，直接死锁）。AI 在 asyncio 代码里混用线程锁是高发事故。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `<code>gather</code> 与 <code>TaskGroup</code> 都能并发运行协程，失败处理有什么不同？`,
    source: '考点来源：Skillup「Python 后端面试题（asyncio 高频面试题汇总）」（gather vs TaskGroup 题）· 场景改写',
    breakdown: `gather 默认<strong>一个失败全部取消</strong>（且异常推迟到 await 时抛，部分结果拿不到，除非 return_exceptions）；<code>TaskGroup</code>（3.11+）任一任务失败会<strong>取消组内所有任务并立刻把异常抛给 with 块</strong>——失败语义更严格、资源清理更可靠。需要「部分成功也算成功」用 gather(return_exceptions=True)；需要「一组任务要么全成要么全失败」用 TaskGroup。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的代码：协程 A 先锁 L1 再等 L2，协程 B 先锁 L2 再等 L1——服务跑着跑着卡死。审查：这是什么问题？如何修复？
<pre><code>async def transfer(a, b, amount):
    async with locks[a]:
        await asyncio.sleep(0)      # 模拟 IO 让出
        async with locks[b]:        # ← 反向获取时死锁
            ...</code></pre>`,
    source: '考点来源：CSDN「终面倒计时 5 分钟：候选人用 trio 破解 asyncio 死锁危机」（异步死锁题）· 场景改写',
    breakdown: `<strong>锁顺序反转导致死锁</strong>：A 持 L1 等 L2、B 持 L2 等 L1，互相等待永不释放（asyncio.Lock 无超时会永远挂起）。修复：① 所有协程按<strong>固定顺序</strong>获取锁（如按账户 id 排序）；② 单次原子获取（asyncio.gather 两把锁一起拿，拿不到全释放）；③ 加超时 + 重试/回滚。AI 生成的转账/资源分配代码，锁顺序是死锁审查的第一检查点。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `生产环境的异步服务疑似死锁，第一时间该做什么？`,
    source: '考点来源：PHP 中文站「如何在 Python 生产环境下调试异步死锁与任务阻塞问题」（死锁诊断题）· 场景改写',
    breakdown: `① <strong>开启 asyncio debug</strong>（PYTHONASYNCIODEBUG=1 或 loop.set_debug）——<strong>慢回调日志</strong>会打印超过 100ms 的阻塞协程与堆栈，直指嫌疑人；② 打印<strong>所有 Task 的堆栈</strong>（asyncio.all_tasks + get_stack），看谁在等什么锁；③ 检查锁获取顺序与超时缺失。先定位「卡在哪个 await」，再谈修复——别急着重启丢现场。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个防死锁的账户转账函数（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '多账户并发转账：锁按账户 id 排序后按序获取（避免顺序反转）；转账余额不足抛异常并释放锁；并发跑 20 笔互逆转账不死锁、余额守恒。',
      accept: ['锁按固定顺序获取（排序）', '20 笔并发转账无死锁', '结束后总余额守恒、异常路径锁已释放'],
    },
    source: '任务基于《27.异步编程》课程知识点（锁小节）· 场景化',
    breakdown: `思路：<code>for acct in sorted([a, b], key=id): async with locks[acct]</code> 按序拿锁；转账体在锁内无 await 的同步操作；异常用 finally/with 保证释放。坑：锁内不要再 await 无谓的 sleep（扩大临界区）；余额检查与扣减要在同一临界区内完成。`,
  },
]'''),
    ('0028-多线程与多进程.html', '巩固与延伸', '0028-多线程与多进程', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `什么是 GIL？它对多线程有什么影响？如何规避？`,
    source: '考点来源：CSDN「Python 面试突击 · 大厂高频面试题：从 GIL 锁机制到内存管理」（GIL 题）· 场景改写',
    breakdown: `GIL = <strong>全局解释器锁</strong>：同一时刻只有一个线程执行 Python 字节码。影响：<strong>CPU 密集</strong>多线程不但不加速反而因锁切换更慢；<strong>IO 密集</strong>不受影响（等待 IO 时释放 GIL）。规避：CPU 密集用<strong>多进程</strong>（multiprocessing 各进程独立 GIL）、C 扩展（numpy 内部释放 GIL）、IO 密集用线程或 asyncio。AI 时代这题的新问法：你的 Agent 服务里哪部分该用进程池——答案：模型推理/重计算。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `并发与并行的区别是什么？用「一个人煮面」打个比方。`,
    source: '考点来源：腾讯云「Python 并发编程模型」（并发 vs 并行题）· 场景改写',
    breakdown: `<strong>并发</strong>：任务交替执行、逻辑上同时（一个人同时煮面、接电话——快速切换）；<strong>并行</strong>：任务真正同时执行（两个人各煮一碗）。单核 CPU 只能并发不能并行；多核才谈得上并行。对应 Python：多线程/协程是<strong>并发</strong>（GIL 下单核干活），多进程是<strong>并行</strong>。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的代码两个线程互相等对方的锁，服务卡死。审查：死锁产生的四个必要条件是什么？破坏哪一个都能避免死锁——通常最划算的是破坏哪个？`,
    source: '考点来源：腾讯云「Python 并发编程模型」（死锁理论题）· 场景改写',
    breakdown: `① <strong>互斥</strong>（资源独占）；② <strong>持有并等待</strong>（拿着 A 等 B）；③ <strong>不可剥夺</strong>（别人抢不走你手里的锁）；④ <strong>循环等待</strong>（A 等 B、B 等 A）。破坏任一即免死锁；工程上最划算的是破坏<strong>④</strong>——<strong>全局固定加锁顺序</strong>（按锁对象 id 排序获取），改动最小、无需超时回滚逻辑。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `为什么 numpy 的重计算在多线程下能利用多核，而纯 Python 循环不能？`,
    source: '考点来源：CSDN「Python 面试突击 · 大厂高频面试题」（GIL 边界题）· 场景改写',
    breakdown: `GIL 只锁<strong> Python 字节码</strong>：numpy 的重计算发生在 <strong>C 扩展内部</strong>，C 代码在执行前主动<strong>释放 GIL</strong>，多线程各自跑各自的 C 代码 → 真并行。纯 Python 循环全程持 GIL → 单核。推论：判断「多线程有没有用」看<strong>耗时在不在 Python 字节码里</strong>——在 C 扩展里（numpy/加密/hash）就有用，在 Python 循环里就没用。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一个线程安全计数器 + GIL 对比实验（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '① threading.Lock 保护的计数器：20 线程各加 1 万次，结果恰好 20 万；② 纯 Python 循环 vs numpy 向量计算的多线程耗时对比，验证「C 扩展释放 GIL」结论。',
      accept: ['计数器结果精确 20 万（无竞态丢失）', 'numpy 版多线程明显快于单线程、纯 Python 版没有', '能解释两组实验差异的原因'],
    },
    source: '任务基于《28.多线程与多进程》课程知识点（GIL 小节）· 场景化',
    breakdown: `思路：计数器<code>with lock: count += 1</code>（裸 += 会竞态丢更新）；对比实验用小矩阵 dot 循环足够次数。坑：numpy 可能未安装（pip install numpy）；线程数取 CPU 核数即可，别开 100 个线程自找调度开销。`,
  },
]'''),
    ('0029-构建发布.html', '巩固与延伸', '0029-构建发布', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `如何把一个带依赖的服务发布到生产环境，保证「在我机器上能跑」？完整链路是什么？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（工程可复现题）· 场景改写',
    breakdown: `完整链路：<strong>pyproject.toml 声明依赖 → 锁文件（uv.lock）固定全树 → venv/容器隔离 → 构建产物（wheel/镜像）→ CI 构建 → 生产按锁文件安装</strong>。可复现三件套：锁文件（版本一致）、隔离环境（不依赖全局）、构建一次发布多次（不在生产现场跑 pip install 源码）。AI 给的「生产环境 pip install -r requirements.txt 就行」是事故配方。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `sdist 与 wheel 的区别是什么？现代 Python 安装为什么都走 wheel？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（sdist vs wheel 题）· 场景改写',
    breakdown: `<strong>sdist</strong>（源码分发包）：打包源码 + 元数据，安装时现场编译——需要编译器和依赖环境，慢且易失败；<strong>wheel</strong>（二进制分发包）：预编译好的成品，pip 直接解压安装，<strong>快、无需编译器、字节级可复现</strong>。现代发布标准：sdist 留作源码归档，<strong>安装走 wheel</strong>；带 C 扩展的包按平台标签（cp312-macosx_arm64 等）发布对应 wheel。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写了个安装脚本：pip install 时它把密码明文传给了私有源。审查：私有仓库/发布凭证的正确做法是什么？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（凭证安全题）· 场景改写',
    breakdown: `正确姿势：① 用<strong> token</strong> 代替密码（可最小权限、可单独吊销）；② token 只进<strong>环境变量/密钥管理</strong>（CI secret、.env 不入库），绝不写进 requirements 或脚本；③ 发布前检查 <code>.gitignore</code> 覆盖 .env/.pypirc；④ 定期轮换 + 最小权限（只读发布权限不要给 admin）。AI 生成脚本最爱把凭证内嵌——审查时 grep 密码/token 关键字。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `可编辑安装（pip install -e .）为什么「改源码即时生效」？它靠什么机制实现？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（.pth 机制题）· 场景改写',
    breakdown: `可编辑安装不复制源码，而是在 site-packages 里放一个 <strong>.pth 文件</strong>——Python 启动时逐行读 .pth，把里面列出的<strong>源码目录路径追加进 sys.path</strong>。于是 import 直接命中你的源码目录，改什么立刻生效什么。适合本地开发；发布部署绝不能用 -e（生产依赖源码目录存在，删了源码服务就起不来）。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `把你的小工具做成可发布的包（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '写 pyproject.toml（声明元数据+依赖）→ 构建 sdist 与 wheel → 新建 venv 安装 wheel → 命令行入口可用 → pip install -e . 验证可编辑安装改源码生效。',
      accept: ['sdist 与 wheel 都构建成功', '新环境按 wheel 安装后入口命令可用', '-e 安装下改源码即时生效（能说清 .pth 原理）'],
    },
    source: '任务基于《29.构建发布》课程知识点 · 来源层级：一手（Python 官方文档 packaging 章节）场景化',
    breakdown: `思路：pyproject.toml 里 [project] 元数据 + [build-system]（hatchling/setuptools）→ <code>python -m build</code> 产出 dist/ 两种产物 → 新 venv <code>pip install dist/*.whl</code> 验证入口。坑：入口点写在 [project.scripts]；构建前确认包目录结构（src 布局或平铺）；私有凭证别写进配置（审查题同款）。`,
  },
]'''),
    # ——— 第八批 ———
    ('0030-项目管理工具.html', '巩固与延伸', '0030-项目管理工具', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `uv 相比 pip + venv 的改进是什么？为什么现代项目都在迁移到 uv？`,
    source: '考点来源：腾讯云开发者社区（Python 面试高频考点中文版）（现代工具链题）· 场景改写',
    breakdown: `uv 是 Rust 写的<strong>一体化工具</strong>：① 装包快一个数量级（并行下载+缓存）；② <strong>uv.lock 全局依赖解析</strong>（pip 无解析，装冲突靠运气）；③ 自带 venv 管理（uv venv / uv sync）；④ 可当包管理器+运行器（uv run）。一句话：pip 时代「装对依赖」是手艺活，uv 把它变成确定性操作。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `pyproject.toml 里写 <code>requests>=2</code>、uv.lock 里锁的是 <code>requests==2.32.3</code>。两者不一致时 uv 以谁为准？为什么会出现不一致？`,
    source: '考点来源：uv 官方文档（锁文件漂移题）· 场景改写',
    breakdown: `<strong>uv.lock 是唯一事实源</strong>——安装永远按锁文件；pyproject 只是「意图声明」。不一致的典型原因：改了 pyproject 的依赖后<strong>忘了跑 uv lock / uv sync</strong>。识别方法：<code>uv lock --check</code> 在 CI 里验证锁文件是否过期。AI 改完依赖只改 pyproject 不重新锁定，是团队协作最常见的漂移事故。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `CI 里跑 uv，依赖安装每轮都要 2 分钟。审查：怎么加速？缓存键应该怎么设计才安全？`,
    source: '考点来源：uv 官方文档（CI 缓存题）· 场景改写',
    breakdown: `① CI 缓存 <code>~/.cache/uv</code>（uv 的全局包缓存）——命中的话 install 只做链接；② <strong>缓存键用 uv.lock 的哈希</strong>：锁文件变才失效缓存（用 pyproject 哈希则改一行注释也失效）；③ <code>uv sync --frozen</code>（CI 里锁死，禁止隐式改锁）；④ 自建镜像/PyPI 代理减少公网下载。缓存键设计错误（比如按日期失效）是 CI 慢且漂移的元凶。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `uv、poetry、pip + venv 怎么选？决策依据是什么？`,
    source: '考点来源：Maxiom「Python Developer Interview Questions（2026）」（工具选型题）· 场景改写',
    breakdown: `新项目默认 <strong>uv</strong>（快 + 现代标准 pyproject + 锁文件）；poetry 适合需要其<strong>发布工作流</strong>的团队（或存量项目已用它）；pip + venv 只在「最小依赖、不想引入新工具」时用（代价是没锁文件，自己用 pip freeze 补）。判断标准不是性能，而是<strong>团队是否需要一个权威的锁文件 + 统一的发布流程</strong>。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `把项目迁移到 uv（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: 'uv init → uv add 两个依赖（如 requests、pytest）→ 生成 uv.lock → CI 检查 uv lock --check 通过 → uv sync --frozen 在全新环境复现安装。',
      accept: ['uv.lock 生成且包含间接依赖', '--frozen 安装与锁文件一致', '能说清 pyproject 与 lock 的关系'],
    },
    source: '任务基于《30.项目管理工具》课程知识点 · 来源层级：一手（uv 官方文档）场景化',
    breakdown: `思路：<code>uv init && uv add requests pytest && uv sync</code>；CI 步骤加 <code>uv lock --check</code> 与 <code>uv sync --frozen</code>。坑：迁移老项目别丢原有 requirements 约束（先 uv add -r requirements.txt 再锁定）；--frozen 下 pyproject 与锁不一致会直接报错（这正是 CI 想要的）。`,
  },
]'''),
    ('0031-monorepo.html', '巩固与延伸', '0031-monorepo', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `什么场景选 Monorepo？它解决什么问题、引入什么成本？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（monorepo vs multirepo 题）· 场景改写',
    breakdown: `Monorepo = <strong>多包一个仓库</strong>：适合包间改动频繁、需要原子提交（改 API 同时改所有调用方）、统一 CI/依赖的场景（shared 库 + 多个服务）。成本：仓库变大、构建要增量化、发布要按包版本化。multirepo 适合包完全独立、团队边界清晰的情况。判断标准：<strong>包之间是不是经常一起改</strong>。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `uv 的 workspace 机制是什么？成员包之间怎么互相依赖？`,
    source: '考点来源：uv 官方文档 Using workspaces（workspace 机制题）· 场景改写',
    breakdown: `根目录 pyproject 的 <code>[tool.uv.workspace] members = [...]</code> 声明成员包；成员间用<strong>普通依赖声明</strong>（如 agents 依赖 <code>shared</code>）+ <strong>workspace 源码可编辑安装</strong>——本地解析为源码目录（改 shared 立即对 agents 生效），发布时解析为版本依赖。同仓库内不需要「发布后再安装」的流程。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `workspace 里 shared 依赖 agents、agents 又依赖 shared。审查：uv 会怎样？怎么修？`,
    source: '考点来源：uv 官方文档 Using workspaces（循环依赖题）· 场景改写',
    breakdown: `workspace 内<strong>禁止循环依赖</strong>——uv lock 会报错（依赖图无法排序）。修复：① 把互相需要的部分<strong>下沉到第三个包</strong>（如 contracts 包放公共接口/类型，两边都依赖它）；② 用<strong>依赖倒置</strong>：shared 只定义抽象/协议，agents 实现后注入。循环依赖是 monorepo 重构最该先治的病灶——它意味着边界设计错了。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `monorepo 里多个包，发布策略怎么选？CI 如何避免「改一个包、全量重测」？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（发布策略题）· 场景改写',
    breakdown: `发布：<strong>各包独立版本号</strong>（semver），改动哪个发哪个；根仓库不打统一 tag。CI 增量：① 按<strong>变更检测</strong>只跑受影响包（比较依赖图，shared 变了才重跑 agents）；② 缓存按「包 + 依赖哈希」组织；③ 影响面用工具（如 nx/turborepo 的 affected 命令）自动推导。目标：提交只改 docs 时不触发任何包测试。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `搭一个 uv workspace（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '根包 + shared（工具函数）+ agents（依赖 shared）两个成员包；agents 导入 shared 的函数运行成功；uv lock 成功；改 shared 源码后 agents 立即用到新行为（无需重装）。',
      accept: ['workspace 成员声明正确', 'agents 依赖 shared 解析为源码', 'shared 改动即时生效（能说清可编辑安装原理）'],
    },
    source: '任务基于《31.monorepo》课程知识点 · 来源层级：一手（uv 官方文档 Using workspaces）场景化',
    breakdown: `思路：根 pyproject 配 <code>[tool.uv.workspace]</code> + members；shared 与 agents 各自 pyproject；agents 里 <code>dependencies = ["shared"]</code>；<code>uv sync</code> 后 uv run 验证。坑：成员包都要有 version 字段；别在 workspace 内出现循环依赖（审查题同款）。`,
  },
]'''),
    ('0032-断点调试.html', '巩固与延伸', '0032-断点调试', r'''[
  {
    type: 'trap',
    level: '中级岗常问',
    prompt: `Python 调试器（pdb/debugpy）是怎么「停住」程序的？breakpoint() 背后发生了什么？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目」（调试原理题）· 场景改写',
    breakdown: `断点/breakpoint() 处调用 <code>sys.settrace</code> 注入<strong>跟踪函数</strong>——解释器<strong>每执行一行字节码前</strong>回调它，跟踪函数发现「该停了」就进入交互循环（pdb 提示符）。开销即来源：跟踪期间每一行都有回调成本，所以调试态明显变慢。<code>breakpoint()</code> 就是 <code>import pdb; pdb.set_trace()</code> 的内置快捷方式（可用 PYTHONBREAKPOINT 换成其他调试器）。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `线上/远程服务出问题，你常用的排查手段有哪些？优先级怎么排？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目」（调试实践题）· 场景改写',
    breakdown: `标准顺序：① <strong>日志</strong>（结构化、含 trace id/参数/耗时——线上第一现场）；② <strong>监控指标</strong>（CPU/内存/慢查询/错误率，定位时间点与范围）；③ <strong>错误聚合</strong>（Sentry 类，拿完整堆栈+上下文）；④ 可复现问题才上<strong>本地/远程调试器</strong>（debugpy attach）。「线上直接下断点」只在万不得已且不影响流量时做。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `VS Code 调试 asyncio 程序，断点「看起来跳过了 await 之后的行」、变量状态也不对。审查：为什么异步代码难调试？怎么设断点才对？`,
    source: '考点来源：PHP 中文站「为什么 Python 异步代码比同步代码难调试」（异步调试题）· 场景改写',
    breakdown: `协程是<strong>交错执行</strong>的：断点停住时，别的协程可能已在你挂起期间改过状态；await 之后「跳行」是因为执行在多个协程/回调间来回跳，不是顺序流。对策：① 单步用 <code>debugpy 的 asyncio 感知模式</code>（VS Code 支持按 Task 隔离堆栈）；② 断点打在<strong>await 之后的第一个同步行</strong>；③ 配合日志时间戳看交错顺序；④ 一次只调试一个协程（临时注释并发）。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `生产环境问题排查，为什么「先日志后断点」？什么情况下断点反而更高效？`,
    source: '考点来源：CSDN「100 道 Python 面试必背题目（工程实践篇）」（调试策略题）· 场景改写',
    breakdown: `<strong>日志是事后取证</strong>：生产问题多是「已经发生了」——断点只能逮现行，日志能还原历史（谁在什么时候做了什么）。且断点会暂停服务（流量受损）、影响时序（停一下竞态就没了）。断点更高效的场景：<strong>本地可稳定复现</strong>的复杂状态推导（循环几百次才出问题的第 N 次、深递归、复杂条件）——此时条件断点秒杀 print 轰炸。原则：先日志缩小范围，断点做最后一击。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `用条件断点定位「循环第 N 次出错」（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '写一个循环 500 次、第 300 次结果异常的函数；分别演示：① 用 breakpoint()/条件断点（VS Code 条件 i==299）直接停在第 300 次；② 用日志定位的大致流程；总结两者适用场景。',
      accept: ['条件断点能精确停在出错迭代', '能说清 sys.settrace 的调试原理', '能总结「日志先行、断点收尾」的适用边界'],
    },
    source: '任务基于《32.断点调试》课程知识点 · 来源层级：一手（Python 官方文档 pdb 章节）场景化',
    breakdown: `思路：<code>for i in range(500): if i == 299: breakpoint()</code>（或 VS Code 条件断点）；日志版在出错分支打 error 日志 + i 值。坑：循环里 breakpoint 要配条件，无脑断点要按 299 次继续；异步代码里的断点注意交错状态（审查题同款）。`,
  },
]'''),
    # ——— 第九批（数据库六课） ———
    ('db-0001-PostgreSQL安装.html', '巩固延伸', 'db-0001-PostgreSQL安装', r'''[
  {
    type: 'trap',
    level: '初级岗常问',
    prompt: `Docker 里跑的 PostgreSQL，容器一删数据就没了。为什么？正确做法是什么？`,
    source: '考点来源：CSDN「【部署】Docker 指令备忘清单」（Docker 部署 PostgreSQL 题）· 场景改写',
    breakdown: `容器文件系统是<strong>临时的</strong>：容器删除后写在其内的数据（包括 /var/lib/postgresql/data）一起消失。正确做法：<code>-v pgdata:/var/lib/postgresql/data</code> 把数据目录挂到<strong>卷（volume）</strong>——数据生命周期与容器解耦，容器重建数据仍在。AI 给的 docker run 命令不带 -v 是数据事故头号来源。`,
  },
  {
    type: 'mechanism',
    level: '初级岗常问',
    prompt: `<code>docker run -p 5432:5432 postgres</code> 里的端口映射是什么意思？写成 -p 5432 只有一个端口号会怎样？`,
    source: '考点来源：CSDN「【部署】Docker 指令备忘清单」（端口映射题）· 场景改写',
    breakdown: `<code>-p 宿主机端口:容器端口</code>——把宿主机的 5432 转发到容器内的 5432，外部客户端连「宿主机 IP:5432」。只写一个端口（-p 5432）表示宿主机随机端口映射到容器 5432——外部得先查 docker port 才知道连哪，适合临时环境；固定映射适合开发。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的 docker-compose 里，pgAdmin 用 <code>localhost:5432</code> 连 PostgreSQL，连接失败。审查：compose 内部网络该怎么连？`,
    source: '考点来源：Data Engineering Zoomcamp Homework 1（compose 网络题）· 场景改写',
    breakdown: `compose 里每个服务在<strong>独立的容器网络</strong>中：localhost 指的是 pgAdmin 容器自己，不是宿主机也不是 postgres 容器。正确：用<strong>服务名</strong>当主机名（如 <code>db:5432</code>，compose 自动 DNS 解析）；依赖服务顺序加 depends_on。localhost 只在「从宿主机连容器」时用。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `生产环境跑 PostgreSQL，数据卷选 named volume 还是 bind mount？为什么？`,
    source: '考点来源：codechick「Сети, тома и данные контейнера」（存储方案题）· 场景改写',
    breakdown: `生产首选 <strong>named volume</strong>：由 Docker 统一管理（权限/备份/跨平台行为一致），bind mount 把宿主机路径直接映射——权限与路径耦合、备份要自己操心，但方便调试（直接看文件）。原则：<strong>数据完整性优先用 named volume</strong>，开发调试想看文件用 bind mount。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `用 docker compose 起一个带持久化的 PostgreSQL（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: 'compose 定义 postgres（named volume 挂数据目录）→ 建一张表插入数据 → docker compose down 后 up 重启 → 数据仍在。',
      accept: ['named volume 挂载正确', '容器重建后数据仍在（验证持久化）', '能解释为什么容器删了数据没丢'],
    },
    source: '任务基于《01.PostgreSQL安装》课程知识点 · 来源层级：一手（Docker 官方文档 volumes 章节）场景化',
    breakdown: `思路：compose 里 <code>volumes: - pgdata:/var/lib/postgresql/data</code> + 顶层 volumes: 声明；环境变量配 POSTGRES_PASSWORD/USER/DB（镜像首次初始化时生效）。坑：数据目录挂载路径写错（要挂目录本身不是父目录）；改环境变量对已初始化卷不生效。`,
  },
]'''),
    ('db-0002-DDL.html', '巩固延伸', 'db-0002-DDL', r'''[
  {
    type: 'trap',
    level: '初级岗常问',
    prompt: `DELETE、TRUNCATE、DROP 三者有什么区别？谁保留表结构？谁最快？`,
    source: '考点来源：牛客网「DELETE、TRUNCATE 和 DROP 区别」· 场景改写',
    breakdown: `<strong>DELETE</strong>：按行删除（可带 WHERE），表结构保留，最慢（逐行记日志/MVCC）；<strong>TRUNCATE</strong>：清空全部数据，表结构保留，极快（整表操作）；<strong>DROP</strong>：表结构连数据一起删。口诀：删行 DELETE、清表 TRUNCATE、删表 DROP。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `TRUNCATE 为什么比 DELETE 快得多？PG 里对一张大表海量 DELETE 后表文件却没变小，为什么？`,
    source: '考点来源：牛客网「DELETE、TRUNCATE 和 DROP 区别」+ 腾讯云「[数据库]基础面试题总结」· 场景改写',
    breakdown: `TRUNCATE 是<strong>整表级操作</strong>（直接重置数据文件/段），不做逐行处理；DELETE 逐行生成<strong>死元组</strong>（MVCC 旧版本），表文件不变小——空间要靠 <code>VACUUM</code> 回收标记、VACUUM FULL 才真正压缩文件。PG 面试的「DELETE 后表没变小」答案就是 MVCC + 死元组。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 生成的建表语句给所有文本列用了 CHAR(255)。审查：定长 CHAR 与变长 VARCHAR 怎么选？CHAR(255) 有什么问题？`,
    source: '考点来源：CSDN「Java 最新面试题」（char 与 varchar 考点）· 场景改写',
    breakdown: `<strong>CHAR(n)</strong>：不足补空格到定长，适合长度固定的值（哈希码、状态码）；<strong>VARCHAR(n)</strong>：按实际长度存储，适合长度可变的文本。CHAR(255) 的问题：短值<strong>全部补空格</strong>（浪费存储 + 比较/去空格陷阱），AI 从 MySQL 抄来的坏习惯。通用原则：默认 VARCHAR。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `建一张订单表的 DDL，你会怎么设计字段与约束？DDL 与 DML 的本质区别是什么？`,
    source: '考点来源：CSDN「SQL 基础面试考点总结」（DDL vs DML 题）· 场景改写',
    breakdown: `DDL = <strong>定义结构</strong>（CREATE/ALTER/DROP，改 schema）；DML = <strong>操作数据</strong>（INSERT/UPDATE/DELETE/SELECT，改行）。订单表要点：主键（id）、金额用 NUMERIC 不用 float、状态列 CHECK 约束、created_at 默认 now()、外键列加索引。AI 建表常见漏项：没主键、金额用浮点、缺时间列。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `建表并对比 DELETE/TRUNCATE（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '建一张带约束的表 → 插入数据 → 对比 DELETE 与 TRUNCATE 的耗时/行为（TRUNCATE 不能带 WHERE）→ 海量 DELETE 后用 VACUUM 回收空间说明原理。',
      accept: ['建表含主键/CHECK/NUMERIC 等约束', 'DELETE 与 TRUNCATE 行为差异说清', 'VACUUM 回收死元组的原理能解释'],
    },
    source: '任务基于《02.DDL》课程知识点 · 来源层级：一手（PostgreSQL 官方文档 DDL 章节）场景化',
    breakdown: `思路：<code>CREATE TABLE orders(...); INSERT ...; DELETE WHERE ...; TRUNCATE orders;</code> 对比；DELETE 大表后查 pg_stat_user_tables 的 n_dead_tup 再 VACUUM。坑：TRUNCATE 在事务里可回滚但不可带 WHERE；VACUUM 不是 VACUUM FULL（后者锁表重写，生产慎用）。`,
  },
]'''),
    ('db-0003-表间关系.html', '巩固延伸', 'db-0003-表间关系', r'''[
  {
    type: 'trap',
    level: '初级岗常问',
    prompt: `外键（Foreign Key）的作用是什么？为什么说它是「引用完整性」的最后防线？`,
    source: '考点来源：php.cn「MySQL 外键使用面试题解析」（外键基础题）· 场景改写',
    breakdown: `外键保证<strong>引用完整性</strong>：子表的外键值必须存在于父表主键中——插入不存在的引用直接报错、父表删除被引用的行会被约束拦截。它是数据库层最后防线：应用 bug 漏校验时，脏数据在写入层就被挡住。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `<code>ON DELETE CASCADE</code> 与 <code>ON DELETE SET NULL</code> 各是什么语义？SET NULL 有什么前提条件？`,
    source: '考点来源：php.cn「MySQL 外键使用面试题解析」（SET NULL 细节题）· 场景改写',
    breakdown: `CASCADE：删父行时<strong>级联删除</strong>子表引用行；SET NULL：删父行时把子表外键列<strong>置 NULL</strong>（保留子行、断开关系）。SET NULL 前提：<strong>外键列必须可空</strong>（NOT NULL 列会报错），且业务上允许「孤儿行」语义。AI 写 schema 时常漏这个前提，建表直接失败。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `面试官问「为什么大厂都禁止使用外键」。最核心的原因是什么？AI 生成的 schema 里到处外键，你如何审查？`,
    source: '考点来源：博客园「为什么大厂都不推荐使用外键」· 场景改写',
    breakdown: `核心：<strong>外键在写入时做跨行/跨表校验并加锁</strong>——大表高频写入时成为锁竞争与性能瓶颈；且<strong>分库分表/数据迁移时外键无法跨库生效</strong>，扩容即拆约束。审查 AI 的 schema：核心交易表可以留外键，高频大表/待分库表去掉、一致性改由应用层保证。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `不用外键后，靠什么保证数据一致性？什么场景适合用外键、什么场景必须禁用？`,
    source: '考点来源：博客园「为什么大厂都不推荐使用外键」（架构设计题）· 场景改写',
    breakdown: `应用层手段：① 事务内先查父行再写子行；② <strong>定期对账任务</strong>扫孤儿数据修复/告警；③ 软删除 + 业务状态机兜底。适合外键：内部工具、数据量小、一致性优先（订单明细）；禁用外键：高频写入大表、分库分表、多团队共享表。原则：<strong>外键买的是即时一致性，代价是写入性能与扩展性</strong>。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `建一对父子表并验证外键行为（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: 'orders + order_items（外键引用 orders）→ 验证：插入不存在父行的子行被拒 → ON DELETE CASCADE 删父行级联删子行 → 去掉外键后插入孤儿行、写对账 SQL 找出它。',
      accept: ['外键拒绝非法引用（实测报错）', 'CASCADE 级联删除生效', '对账 SQL 能找出孤儿行'],
    },
    source: '任务基于《03.表间关系》课程知识点 · 来源层级：一手（PostgreSQL 官方文档 DDL 约束章节）场景化',
    breakdown: `思路：<code>REFERENCES orders(id) ON DELETE CASCADE</code>；孤儿行对账 <code>SELECT ... LEFT JOIN parent p ON ... WHERE p.id IS NULL</code>。坑：外键列类型要与父表主键完全一致；CASCADE 会穿透多级（A→B→C 删 A 把 C 也删了）。`,
  },
]'''),
    ('db-0004-DML.html', '巩固延伸', 'db-0004-DML', r'''[
  {
    type: 'trap',
    level: '初级岗常问',
    prompt: `WHERE 和 HAVING 有什么区别？能不能在 HAVING 里写非分组列的条件？`,
    source: '考点来源：CSDN「SQL 面试高频 50 题精讲」（WHERE vs HAVING 题）· 场景改写',
    breakdown: `<strong>WHERE 过滤行</strong>（分组前、可用任意列、不能用聚合）；<strong>HAVING 过滤分组</strong>（分组后、条件基于聚合结果如 HAVING SUM(amount) > 100）。在 HAVING 里写非分组列：PG 会报错（列必须出现在 GROUP BY 或聚合里）——MySQL 老版本会静默乱取一值，是坑。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `SQL 各子句的真实执行顺序是什么？为什么 WHERE 里不能引用 SELECT 里的别名？`,
    source: '考点来源：CSDN「面试题常见」（执行顺序题）· 场景改写',
    breakdown: `书写顺序 ≠ 执行顺序：<strong>FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT</strong>。WHERE 在 SELECT <strong>之前</strong>执行，别名还没诞生，所以不能用；ORDER BY 在 SELECT 之后，能用别名。理解顺序是分析 SQL 行为（哪些过滤早、哪些晚）的地基。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 写的「查所有员工及其部门名」：LEFT JOIN 后在 WHERE 里过滤右表字段，没部门的员工消失了。审查：
<pre><code>SELECT e.name, d.name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id
WHERE d.active = true;   -- ← 把未匹配行滤掉了</code></pre>`,
    source: '考点来源：CSDN「SQL 面试高频 50 题精讲」（LEFT JOIN 陷阱题）· 场景改写',
    breakdown: `LEFT JOIN 未匹配的行右表字段是 <strong>NULL</strong>——WHERE 里 d.active = true 对 NULL 判定为假，<strong>未匹配行全部被滤掉</strong>，LEFT JOIN 退化成 INNER JOIN。修复：条件移到 <strong>ON</strong>（<code>ON e.dept_id = d.id AND d.active</code>，过滤发生在连接时、保留左表行），或 WHERE 里加 <code>OR d.id IS NULL</code>。AI 写的报表 SQL 高频坑。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `子查询结果里可能含 NULL 时，NOT IN 会发生什么？为什么专家说改用 NOT EXISTS？`,
    source: '考点来源：CSDN「SQL 面试高频 50 题精讲」（NOT IN 陷阱题）· 场景改写',
    breakdown: `<code>x NOT IN (1, 2, NULL)</code> 的语义是 x≠1 AND x≠2 AND x≠NULL——与 NULL 比较结果是 <strong>unknown</strong>，整句永远不为真 → 结果<strong>空集</strong>，静默吞掉所有行。<code>NOT EXISTS</code> 用相关性检查「不存在匹配行」，无三值逻辑问题。规则：子查询可能含 NULL 就用 NOT EXISTS（或 NOT IN 子查询里加 WHERE x IS NOT NULL）。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `写一组报表查询并复现两个陷阱（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: 'employees/departments 两表：① LEFT JOIN 统计各部门人数（含没部门员工）且 HAVING 过滤人数 > 1；② 复现 NOT IN 含 NULL 返回空集，改写为 NOT EXISTS 结果正确。',
      accept: ['未匹配行保留在结果中（条件放 ON 或 OR NULL）', 'HAVING 过滤分组生效', 'NOT EXISTS 改写结果正确'],
    },
    source: '任务基于《04.DML》课程知识点 · 来源层级：一手（PostgreSQL 官方文档查询章节）场景化',
    breakdown: `思路：① <code>LEFT JOIN ... ON e.dept_id = d.id AND d.active</code> + <code>GROUP BY ... HAVING count(*) > 1</code>；② NOT IN 空集复现后改 <code>WHERE NOT EXISTS (SELECT 1 FROM t2 WHERE t2.x = t1.x)</code>。坑：HAVING 里用聚合别名（PG 允许 SELECT 别名，MySQL 不允许——以目标库为准）。`,
  },
]'''),
    ('db-0005-事务.html', '巩固延伸', 'db-0005-事务', r'''[
  {
    type: 'trap',
    level: '初级岗常问',
    prompt: `小明给小红转账 1000 元：扣小明 1000、加小红 1000 是两条 UPDATE。为什么必须包在事务里？`,
    source: '考点来源：CSDN「Java 最新面试题」· 事务考点 · 场景改写',
    breakdown: `两条 UPDATE 构成一个<strong>不可分割的业务操作</strong>：不包事务，第一条成功后崩溃/失败，钱就凭空消失（扣了没加）或凭空出现。事务保证<strong>原子性</strong>：要么两条都生效、要么都回滚。AI 写转账类代码漏事务是资金事故。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `ACID 四特性分别解决什么问题？`,
    source: '考点来源：CSDN「MySQL 数据库面试题」（ACID 题）· 场景改写',
    breakdown: `<strong>原子性 A</strong>（全成或全败——转账）；<strong>一致性 C</strong>（约束/规则不被破坏——余额不为负）；<strong>隔离性 I</strong>（并发事务互不干扰——两笔转账同时进行互不污染）；<strong>持久性 D</strong>（提交后不丢——断电数据仍在）。记忆法：A 转账、C 规则、I 并发、D 断电。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `面试官问：不可重复读和幻读有什么区别？PG 默认隔离级别下会同时出现吗？`,
    source: '考点来源：牛客网「【Java 春秋招】常见 MySQL 面试题」（辨析题）· 场景改写',
    breakdown: `<strong>不可重复读</strong>：同一事务内两次读<strong>同一行</strong>，值变了（别人 UPDATE 提交）；<strong>幻读</strong>：两次读<strong>同一范围</strong>，行数变了（别人 INSERT 提交）。PG 默认 <strong>READ COMMITTED</strong>：两者都可能出现（每次语句见最新已提交数据）；MySQL 默认 REPEATABLE READ：不可重复读被 MVCC 挡住，但幻读仍存在（需锁或更高隔离级）。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `事务隔离是怎么实现的？互联网高并发项目为什么普遍选 READ COMMITTED 而不是 SERIALIZABLE？`,
    source: '考点来源：CSDN「面经汇总-数据库」（隔离机制题）· 场景改写',
    breakdown: `主流实现是 <strong>MVCC</strong>：写不阻塞读、读不阻塞写——每行多版本，事务按快照读旧版本；再配合行锁解决写冲突。SERIALIZABLE 隔离最强但<strong>锁冲突/事务回滚率高</strong>，高并发下吞吐骤降；READ COMMITTED 每语句最新快照 + 应用层用乐观锁/幂等兜底，性价比最高——「数据库给基础、业务补边角」是互联网标准答案。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `两个会话实测不可重复读（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 25 分钟',
      goal: '会话 A：BEGIN 后查一行余额；会话 B：UPDATE 该行并 COMMIT；会话 A 再查——PG 默认级别下两次结果不同（复现不可重复读）；会话 A 换成 REPEATABLE READ 重试，两次结果一致。',
      accept: ['READ COMMITTED 下两次读结果不同（实测）', 'REPEATABLE READ 下两次读一致（快照）', '能解释 MVCC 快照机制'],
    },
    source: '任务基于《05.事务》课程知识点 · 来源层级：一手（PostgreSQL 官方文档事务隔离章节）场景化',
    breakdown: `思路：两个 psql 会话（或用 docker exec 开两个）——A 里 <code>BEGIN; SELECT balance...;</code>，B 里 <code>UPDATE ...; COMMIT;</code>，A 再 SELECT。坑：PG 的 BEGIN 是 READ COMMITTED（语句级快照），REPEATABLE READ 要显式 BEGIN ISOLATION LEVEL REPEATABLE READ；顺序不对会看不到差异。`,
  },
]'''),
    ('db-0007-拓展知识.html', '巩固延伸', 'db-0007-拓展知识', r'''[
  {
    type: 'trap',
    level: '初级岗常问',
    prompt: `数据库三大范式分别是什么？一句话说清每层解决什么。`,
    source: '考点来源：CSDN「MySQL 索引、锁、三大范式一篇搞定」· 场景改写',
    breakdown: `<strong>1NF</strong>：列不可再分（单元格原子值）；<strong>2NF</strong>：非主键列完全依赖<strong>整个</strong>主键（消除部分依赖——联合主键时代码列只依赖一半）；<strong>3NF</strong>：非主键列不传递依赖主键（消除冗余——部门名放员工表就是冗余）。口诀：1 拆格子、2 拆半依赖、3 拆传递。`,
  },
  {
    type: 'mechanism',
    level: '中级岗常问',
    prompt: `Redis 和 PostgreSQL 的本质区别是什么？各自解决什么问题？`,
    source: '考点来源：牛客专刊「数据库索引-笔面试必考点 15 讲」（选型题）· 场景改写',
    breakdown: `<strong>Redis</strong>：内存键值存储，主打<strong>高速缓存/计数器/会话</strong>——毫秒级读写、数据可丢（或 AOF/RDB 兜底）；<strong>PostgreSQL</strong>：磁盘关系库，主打<strong>结构化数据 + ACID 事务 + 复杂查询</strong>。典型组合：<strong>PG 存真相、Redis 做缓存</strong>（读多写少的查询结果/热点数据），缓存失效策略要配套。`,
  },
  {
    type: 'review',
    level: '高级岗常问',
    prompt: `AI 把 50 个字段的报表逻辑全塞进一个视图，还计划「视图当表用」。审查：视图的本质是什么？滥用视图有什么代价？`,
    source: '考点来源：CSDN「3.数据库部分面试题」（视图陷阱题）· 场景改写',
    breakdown: `普通视图只是<strong>保存的查询</strong>：每次引用都重新执行底层 SQL——视图套视图/复杂连接会带来<strong>多层展开的执行计划膨胀</strong>与性能黑洞，且底层表结构一改视图就失效。正确用法：视图做<strong>接口抽象</strong>（权限隔离、常见查询封装），重报表用物化视图（REFRESH 定时刷新）或独立报表表。`,
  },
  {
    type: 'design',
    level: '中级岗常问',
    prompt: `为什么实际项目里有时故意违反三范式（反范式）？举一个典型场景。`,
    source: '考点来源：CSDN「MySQL 索引、锁、三大范式一篇搞定」（反范式权衡题）· 场景改写',
    breakdown: `范式减少<strong>冗余</strong>，代价是<strong>多表 JOIN</strong>——高频查询要 JOIN 三张表才能拼出订单列表时，性能与复杂度都不划算。反范式：把高频读取的<strong>冗余字段</strong>（如订单表冗余存商品名快照）落库，牺牲少量一致性换查询性能。原则：<strong>写路径走范式保一致，读路径允许受控冗余换性能</strong>（冗余字段要有更新机制）。`,
  },
  {
    type: 'scenario',
    level: '初级岗常问',
    prompt: `建视图并做范式分析（建议用 Claude Code 完成），任务与验收点见任务卡。`,
    scene: {
      time: '约 20 分钟',
      goal: '设计两张表（故意含一处 3NF 冗余）；创建视图封装常用查询并查询成功；指出冗余字段违反 3NF、说明何时该保留（读多写少）何时该拆。',
      accept: ['视图创建与查询成功', '能指出冗余字段违反哪条范式', '能给出保留/拆分该冗余的取舍分析'],
    },
    source: '任务基于《07.拓展知识》课程知识点 · 来源层级：一手（PostgreSQL 官方文档视图章节）场景化',
    breakdown: `思路：<code>CREATE VIEW v_orders AS SELECT ...</code>；范式分析对照「非主键列是否依赖主键、是否传递依赖」。坑：视图上的写入有限制（多表视图不可直接 UPDATE）；视图引用底层表结构变更要重验。`,
  },
]'''),
]


def rewrite(path, questions_script):
    with open(path, encoding='utf-8') as f:
        src = f.read()
    src = src.replace('6 道面试实战（中/高/专家各 2 道）', '面试实战')
    # 站点 favicon（与 Docusaurus 站点一致），幂等
    if '<link rel="icon"' not in src:
        src = src.replace(
            '<link rel="stylesheet" href="../assets/course.css">',
            '<link rel="icon" href="../../img/avatar.png" type="image/png">\n  <link rel="stylesheet" href="../assets/course.css">',
        )
    h2 = src.index('      <h2>💼 面试实战</h2>')
    start = src.rindex('<section>', 0, h2)   # 面试实战小节的 <section> 开标签
    end = src.index('</section>', h2) + len('</section>')
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
