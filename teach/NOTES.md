# 教学笔记

## 用户偏好（2026-09-05 确认）

- 课程内容使用**中文**，与文档站风格一致
- 受众：**网站读者 + 用户自己**（两者兼顾）
- 范围：**先只做协程一章**，效果满意后再考虑后续章节
- 课程形态：独立 HTML 页面，文档末尾追加**点击跳转的入口**

## 发布方式（重要）

- 工作区：`teach/`（MISSION/RESOURCES/NOTES/learning-records/lessons/assets/reference）
- 发布目录：`static/teach/`，需要把 `lessons/`、`assets/`、`reference/` **复制**过去，站点构建时才会带上
- 文档入口：`python/语言核心/24.协程.mdx` 末尾 → 链接 `/teach/lessons/0001-python-coroutines.html`
- 不要复制 MISSION.md / RESOURCES.md / NOTES.md / learning-records 到 static（属个人状态，不应发布）
- 若后续章节继续，可写一个同步脚本替代手动复制

## 测验设计原则

- 即时反馈：点击选项立刻显示对错 + 解释，不攒到最后
- 选项长度尽量一致，不通过格式泄露答案
- 题目只考文档已覆盖的知识；「执行顺序预测」是检验协程理解的最高效题型
- 解释要指回《24.协程》对应小节，形成「测验 → 回看文档」的循环

## 组件

- `assets/course.css`：共享样式（中文字体栈、卡片、图表、测验、打印样式）
- `assets/quiz.js`：可复用测验组件，纯 vanilla，无依赖；用法见 lessons/0001-python-coroutines.html
