---
sidebar_position: 2
# slug: BBB
# title: AAA!
# authors:
# - name: Joel Marcey
# url: https://github.com/JoelMarcey
# image_url: https://github.com/JoelMarcey.png
# tags: [Demo]
---

## 1. vue-router 路由模式有几种？

vue-router 有 3 种路由模式
* hash：使用 URL hash 值来做路由。支持所有浏览器，包括不支持 HTML5 History Api 的浏览器
* history : 依赖 HTML5 History API 和服务器配置。具体可以查看 HTML5 History 模式；
* abstract : 基于内存的历史，支持所有 JavaScript 运行环境，如 Node.js 服务器端。如果发现没有浏览器的 API，路由会自动强制进入这个模式

## 2. vue-router 中常用的 hash 和 history 路由模式实现原理

### hash 模式的实现原理

`https://www.word.com#search`中的 `#search` 就是 `hash`，他有以下特性：

* `URL` 中 `hash` 值只是客户端的一种状态，也就是说当向服务器端发出请求时，`hash` 部分不会被发送
* `hash` 值的改变，都会在浏览器的访问历史中增加一个记录。因此我们能通过浏览器的回退、前进按钮控制 `hash` 的切换
* 可以通过 `a` 标签，并设置 `href` 属性，当用户点击这个标签后，`URL` 的 `hash` 值会发生改变；或者使用 `JavaScript` 来对 `loaction.hash` 进行赋值，改变 `URL` 的 `hash` 值

所以我们可以使用 `hashchange` 事件来监听 `hash` 值的变化，从而对页面进行跳转（渲染）

### `history` 模式的实现原理

`history` 路由模式的实现主要基于存在下面几个特性：
* `pushState` 和 `repalceState` 两个 API 可以在不刷新的情况下操作浏览器的历史记录，实现 URL 的变化
* 我们可以使用 `popstate` 事件来监听 `url` 的变化，从而对页面进行跳转
* `history.pushState()` 或 `history.replaceState()` 不会触发 `popstate` 事件，这时我们需要手动触发页面跳转（渲染）