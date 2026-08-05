* 使用 Pinia 实现全局数据共享
* 使用 pinia-plugin-persistedstate 实现数据持久化
* 使用 secure-ls 实现数据加密

## 1. 安装依赖

```bash
pnpm install pinia secure-ls
pnpm install -D pinia-plugin-persistedstate
```

## 2. 创建 Pinia 实例

```javascript
// store/index.js
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import SecureLS from 'secure-ls'

const ls = new SecureLS({ encodingType: 'aes', encryptionSecret: 'encryptionSecret' })

const pinia = createPinia()
pinia.use(createPersistedState, {
  storage: {
    getItem: key => ls.get(key),
    setItem: (key, value) => ls.set(key, value),
    removeItem: key => ls.remove(key)
  } as Storage
})

export default pinia
```

## INTERVIEW
### 1. 项目状态管理是如何做的？  
我们的项目采用集中式全局状态管理，将登录用户信息（如 token、用户信息等）放在 app/store/auth.ts 中，通过 Pinia 管理并持久化，同时配合自动续签逻辑，在项目任意模块中均可访问和控制登录状态。