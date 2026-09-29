---
title: 官方术语表
---

# 官方术语表

以下术语解释均摘自对应官方文档，AI 搜索只从这里获取通用术语的解释。

## 中位数
来源：https://www.itl.nist.gov/div898/handbook/eda/section3/boxplot.htm

中位数（median）是将一组数据按大小排序后位于正中间位置的值；样本量为奇数时取正中间的观测值，为偶数时取中间两个观测值的平均值。中位数对极端值不敏感，常用于描述数据的中心位置。

## 分位数
来源：https://www.itl.nist.gov/div898/handbook/eda/section3/boxplot.htm

分位数（quantile）把有序数据分为若干等份。第 p 分位数是这样一个值：约有 p% 的观测值小于等于它。常见的四分位数 Q1（第 25 百分位）、Q2（第 50 百分位，即中位数）、Q3（第 75 百分位）；P10/P25/P50/P75/P90 分别对应第 10/25/50/75/90 百分位。

## 箱线图
来源：https://www.itl.nist.gov/div898/handbook/eda/section3/boxplot.htm

箱线图（box plot）用五个统计量概括一组数据：最小值、第一四分位数（Q1）、中位数、第三四分位数（Q3）与最大值，可直观展示数据的中心、离散程度与异常值。

## API
来源：https://developer.mozilla.org/zh-CN/docs/Glossary/API

API（应用程序接口）是让程序之间相互通信的一组规则与接口定义；开发者通过 API 调用已有功能，而无需了解其内部实现。

## REST
来源：https://developer.mozilla.org/zh-CN/docs/Glossary/REST

REST（表述性状态转移）是一种基于 HTTP 的软件架构风格：资源以 URL 标识，用 GET/POST/PUT/DELETE 等方法操作，客户端与服务器之间无状态交互。

## WebSocket
来源：https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket

WebSocket 是一种在单个 TCP 连接上进行全双工通信的协议。与 HTTP 请求-响应不同，WebSocket 允许服务器主动向客户端推送数据，常用于实时应用。

## HTTP 缓存
来源：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching

HTTP 缓存让浏览器与服务器存储已获取资源的副本，后续请求可直接复用，减少网络传输与服务器负载。常见机制有 Cache-Control、ETag、Expires 等响应头。

## CDN
来源：https://developer.mozilla.org/zh-CN/docs/Glossary/CDN

CDN（内容分发网络）是分布在多个地理位置的服务器组，就近向用户提供静态资源，降低延迟并分担源站压力。

## DNS
来源：https://developer.mozilla.org/zh-CN/docs/Glossary/DNS

DNS（域名系统）将人类可读的域名（如 example.com）解析为 IP 地址。浏览器访问网站前会先向 DNS 查询该域名对应的服务器地址。

## Cookie
来源：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Cookies

Cookie 是服务器通过 Set-Cookie 响应头要求浏览器保存的小段数据，浏览器会在后续同源请求中自动携带，常用于会话保持、用户偏好与统计标识。

## JSON
来源：https://developer.mozilla.org/zh-CN/docs/Glossary/JSON

JSON（JavaScript 对象表示法）是一种轻量的数据交换格式，语法与 JavaScript 对象字面量接近，支持对象、数组、字符串、数字、布尔值与 null。

## venv（Python 虚拟环境）
来源：https://docs.python.org/3/library/venv.html

venv 是 Python 标准库自带的虚拟环境模块：为每个项目创建独立的 Python 解释器与 site-packages 目录，使不同项目的依赖互不干扰。

## WSGI 与 ASGI
来源：https://peps.python.org/pep-3333/

WSGI（PEP 3333）是 Python Web 服务器与 Web 应用之间的同步调用接口规范；ASGI 是其异步扩展，支持 WebSocket 等长连接协议（如 FastAPI、Django Channels 使用 ASGI）。

## Docker 容器
来源：https://docs.docker.com/

容器是应用的轻量级运行单元：把应用与依赖打包在一起，与宿主机共享内核，隔离在独立的文件系统、网络与进程空间中运行。

## Kubernetes
来源：https://kubernetes.io/docs/concepts/overview/

Kubernetes（K8s）是开源的容器编排平台，负责容器的自动化部署、扩缩容、负载均衡与故障恢复，声明式管理应用的期望状态。

## CI/CD
来源：https://docs.gitlab.com/ee/ci/

CI（持续集成）指代码变更自动构建与测试并频繁合并；CD（持续交付/部署）指通过自动化流水线将验证过的变更发布到环境。CI/CD 流水线通常由 .gitlab-ci.yml 或 GitHub Actions 等工作流文件定义。

## JWT
来源：https://datatracker.ietf.org/doc/html/rfc7519

JWT（JSON Web Token，RFC 7519）是一种紧凑的、URL 安全的令牌格式，由头部、载荷、签名三部分组成，常用于无状态身份认证与授权传递。

## 数据库索引
来源：https://www.postgresql.org/docs/current/indexes.html

索引是数据库中用于加速数据检索的附加结构：按索引键有序存储指针，查询时可快速定位行，代价是写入时需要维护索引。常用类型有 B-tree、Hash、GIN 等。

## 事务与 ACID
来源：https://www.postgresql.org/docs/current/transaction-iso.html

事务是把多条语句作为一个整体执行的单元。ACID 指原子性（全做或全不做）、一致性、隔离性（并发事务互不干扰的程度，分读已提交/可重复读/可串行化等级别）、持久性。

## Git
来源：https://git-scm.com/doc

Git 是分布式版本控制系统：每个克隆都含完整提交历史，通过工作区-暂存区-仓库三态管理变更，支持分支、合并与远程协作。

## Markdown
来源：https://daringfireball.net/projects/markdown/

Markdown 是一种轻量标记语言：用 #、*、[]()、``` 等纯文本符号表示标题、列表、链接与代码块，可转换为 HTML。

## 正则表达式
来源：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions

正则表达式是用字符模式匹配文本的工具：由字面字符与元字符（如 . * + ? [] () ^ $）组成，可用于查找、校验、替换与提取字符串。

## 微服务
来源：https://learn.microsoft.com/zh-cn/azure/architecture/guide/architecture-styles/microservices

微服务架构把应用拆分为一组可独立部署的小型服务，每个服务围绕单一业务能力构建，服务间通过 API 通信，可独立扩展与演进。
