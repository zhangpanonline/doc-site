# 协程课程工作区建立，定位与发布方式确定

2026-09-05 建立教学工作区。用户明确了课程定位：**受众兼顾网站读者与用户自己**，**范围仅限协程一章**（效果满意后再推广到其它章节）。

关键决定：课程以**独立 HTML 页面**发布——因为用户要求「文档末尾追加、点击跳转」，意味着课程必须是单独页面而非内联在 MDX 中；发布路径为 `static/teach/`（Docusaurus 静态目录），文档末尾入口链接指向 `/teach/lessons/0001-python-coroutines.html`。

内容边界 = 文档已覆盖范围（协程对象、await、Task/Future、事件循环、asyncio.run），不引入 TaskGroup/gather/取消等高级话题；测验以「执行顺序预测」为核心题型。

**Implications**: 后续会话按同一模式为其它章节生成课程时，复用 `assets/course.css` 与 `assets/quiz.js`，并需把 lessons/assets/reference 同步到 static/teach/。
