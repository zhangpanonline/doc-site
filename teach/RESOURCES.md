# 协程课程资源（Python Coroutines）

## Knowledge

- [Python 官方文档: Coroutines and Tasks](https://docs.python.org/3/library/asyncio-task.html)
  一手权威资料，涵盖协程、awaitable（协程/Task/Future）、`asyncio.run`、`create_task`。使用场景：核对课程中的每个概念表述与 API 签名。
- [Python 官方文档: Event Loop](https://docs.python.org/3/library/asyncio-eventloop.html)
  事件循环底层 API。使用场景：解释「驱动协程对象」的心智模型、`loop.create_future` 等细节。
- [David Beazley: A Curious Course on Coroutines and Concurrency](http://www.dabeaz.com/coroutines/)
  PyCon 2009 经典课程，从生成器的 `send()` 一路讲到无线程的协程调度系统。使用场景：理解「手动驱动协程对象」一节中 `coro.send()` 的渊源与机制。
- [Real Python: Async IO in Python: A Complete Walkthrough（Brad Solomon, 2019）](https://realpython.com/async-io-python/)
  面向初学者的完整异步教程，有中文译文流传。使用场景：为测验与讲解寻找更通俗的类比（如国际象棋表演类比）、反面例子。
- [本站课程: 22.事件循环](/python/语言核心/事件循环/) / [23.Future类](/python/语言核心/Future类/) / [24.协程](/python/语言核心/协程/) / [25.异步编程](/python/语言核心/异步编程/)
  课程的本体与上下文。使用场景：测验题目必须落在这些文档覆盖的范围内，链接回原文章节。

## Wisdom (Communities)

- [r/learnpython](https://www.reddit.com/r/learnpython/)
  初学者提问社区，异步是高频话题。使用场景：收集学习者的常见误解，用于设计测验的反例选项。
- [Stack Overflow: python-asyncio 标签](https://stackoverflow.com/questions/tagged/python-asyncio)
  真实工程问题的聚集地。使用场景：验证某个坑是否真实存在、常见程度如何。

## Gaps

- 暂无面向中文读者的权威 asyncio 入门教材；官方文档为英文，课程需自行承担「翻译 + 通俗化」的职责。
- 用户尚未表达加入线下/线上学习社区（如读书会）的意愿，暂不安排线下 Wisdom 渠道。
