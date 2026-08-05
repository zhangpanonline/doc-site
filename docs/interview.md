# 1. 请描述一下你在项目中如何做技术选型与目录结构设计？  
在我的项目中，我采用了 Vite + Vue3 + TypeScript + TailwindCSS 作为核心前端栈，这样可以保证开发效率、类型安全和可维护性。为了实现可扩展的架构，我选择了领域驱动结构（feature-based folder），将每个业务模块（如用户管理、权限管理）进行解耦，每个模块都有自己的组件、页面、service 等，利于后期多人协作和模块测试。同时，集成了 Supabase 提供的 Auth、数据库和 Storage 服务，简化后端接口开发，并使用 husky + commitlint 保证团队提交规范。

# 2. git提交规范  
在团队中我们采用了基于 Conventional Commits 的提交规范，配合 husky + commitlint 做了 Git 钩子校验，同时接入了 commitizen 提供交互式提交体验，确保所有人都能按照统一风格提交。这样我们可以基于提交记录自动生成 changelog，同时也方便代码回溯与版本管理。在 CI/CD 流程中我们还使用了 semantic-release，让构建、打包、发布、发版本号等完全自动化。

# 3. [你怎么优化 Element Plus 的打包体积？](./按需自动导入.md#1-你怎么优化-element-plus-的打包体积)

# 4. 为什么 Access Token + Refresh Token 比传统的 Session（基于 cookie 的 session ID 更有优势

## 1. 传统 Session 模式

* 用户登录后，服务器生成一个唯一的 session ID，存在数据库里（如 Redis、SQL）。
* 这个 ID 会通过 cookie 发送给浏览器。
* 每次请求时，浏览器带着 cookie → 服务器拿 session ID 去数据库里查 → 确认用户身份。

### 问题：

1. 依赖数据库/认证服务

   * 只要 Auth 服务器或数据库挂了，所有请求就无法鉴权 → 应用全瘫痪。
   * 系统要维护高可用的 session 存储，成本高。

2. **单点瓶颈**

   * 每个请求都得访问 Auth 服务 → 增加延迟。
   * 系统扩展时，Auth 服务压力巨大。

3. **扩展性差**

   * 如果多个服务都需要认证信息，每个都得去 Auth 服务查 → 性能和可用性差。

---

## 2. JWT + Access/Refresh Token 模式

* 登录后，用户直接拿到一个 Access Token（短期有效） + Refresh Token（长期有效但只能使用一次）。
* Access Token 是自包含的 JWT：里面就有用户 ID、权限等信息（经过签名保证不被篡改）。
* API 服务只需要验证 token 的签名和过期时间，不依赖中央数据库。

### 优点：

1. 去中心化，不依赖 Auth 数据库实时在线

   * API 只验证 JWT → 即使 Auth 服务器短暂宕机，业务系统仍能正常工作。
   * 增强了系统的容错能力。

2. 性能更好

   * API 不需要每次都查数据库，只需解析 JWT。
   * 降低了请求延迟，提升了吞吐量。

3. 更适合分布式/微服务架构

   * 多个服务可以共享 JWT，不必每个服务都去 Auth 查询用户信息。
   * 跨系统通信更方便。

4. 支持安全续签

   * 当 Access Token 过期时，可以用 Refresh Token 获取新的 Access Token。
   * 用户体验好：不会频繁要求重新登录。
   * 即使 Auth 服务挂了，只要旧的 Access Token 还有效，应用仍能跑。

5. 成本更低，可扩展性更好

   * Auth 服务压力大幅降低（主要负责发 token 和刷新 token）。
   * 适合大规模用户系统。

---

## 3. 对比总结

| 特性  | 传统 Session（cookie+数据库） | JWT（access + refresh token）        |
| --- | ---------------------- | ---------------------------------- |
| 可用性 | Auth 服务宕机 → 全部登录失效     | 短期内不依赖 Auth 服务，容错高                 |
| 性能  | 每次请求都查数据库              | API 只校验签名，快                        |
| 扩展性 | 单点瓶颈，扩展困难              | 多服务共享 JWT，天然支持微服务                  |
| 安全性 | Session 固定 ID，容易被劫持    | Access Token 短期有效，Refresh Token 可控 |
| 成本  | 需要高可用存储                | 主要负担在签发/刷新 Token                   |

---

✅ 这就是为什么 Supabase Auth（以及大多数现代 Auth 服务，比如 Auth0、Firebase）都选择 JWT + Access/Refresh Token 模式 —— 可靠性高、性能更好、成本更低、扩展更容易。

---

