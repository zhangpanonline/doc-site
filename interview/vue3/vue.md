---
sidebar_position: 1
# slug: BBB
# title: AAA!
# authors:
# - name: Joel Marcey
# url: https://github.com/JoelMarcey
# image_url: https://github.com/JoelMarcey.png
# tags: [Demo]
---

## 1. Proxy 与 Object.defineProperty 优劣对比

### Proxy 的优势
* `Proxy` 可以直接监听对象而非属性
* `Proxy` 可以直接监听数组的变化
* `Proxy` 有多达 13 种拦截方法,不限于 `get`、`set` 等，是 `Object.defineProperty` 不具备的
* `Proxy` 返回的是一个新对象，我们可以只操作新的对象达到目的，而 `Object.defineProperty` 只能遍历对象属性直接修改，特别耗费性能
### Object.defineProperty 的优势
* 兼容性好，支持 `IE9`，而 `Proxy` 的存在浏览器兼容性问题,而且无法用 `polyfill` 磨平，因此在`Vue3`才能用 `Proxy` 重写

## 2. Vue3 组合式/响应性 API实现原理

### 原理

* 通过 `Proxy` （代理）：拦截对象中任意属性的变化，比如属性值的读写、添加、删除等13种拦截方法。
* 通过 `Reflect` （反射）：对被代理对象的属性进行操作。

### 实现

* reactvie

  ```js
  // 定义一个reactiveHandler处理对象
  const reactiveHandler = {
    // 获取属性值
    get (target, prop) {
      const result = Reflect.get(target, prop)
      console.log('拦截了读取数据', prop, result)
      return result
    },
    // 修改属性值或者是添加属性
    set (target, prop, value) {
      const result = Reflect.set(target, prop, value)
      console.log('拦截了修改数据或者是添加属性', prop, value)
      return result
    },
    // 删除某个属性
    deleteProperty (target, prop) {
      const result = Reflect.deleteProperty(target, prop)
      console.log('拦截了删除数据', prop)
      return result
    }
  }
  
  // 定义一个reactive函数,传入一个目标对象
  function reactive (target) {
    // 判断当前的目标对象是不是object类型(对象/数组)
    if (target && typeof target === 'object') {
      // 对数组或者是对象中所有的数据进行reactive的递归处理
      // 先判断当前的数据是不是数组
      if (Array.isArray(target)) {
        // 数组的数据要进行遍历操作
        target.forEach((item, index) => {
          target[index] = reactive(item)
        })
      } else {
        // 再判断当前的数据是不是对象
        // 对象的数据也要进行遍历的操作
        Object.keys(target).forEach(key => {
          target[key] = reactive(target[key])
        })
  
      }
      return new Proxy(target, reactiveHandler)
    }
    // 如果传入的数据是基本类型的数据,那么就直接返回
    return target
  }
  ```

* Ref

  ```js
  // 定义一个ref函数
  function ref (target) {
    // 如果将对象分配为ref值，则将它被处理为深层的响应式对象。故调用reactive函数
    target = reactive(target)
    return {
      // 保存target数据保存起来
      _value: target,
      _is_ref: true, // 标识当前的对象是ref对象！！！！
      get value () {
        console.log('劫持到了读取数据')
        return this._value
      },
      set value (val) {
        console.log('劫持到了修改数据,准备更新界面', val)
        this._value = val
      }
    }
  }
  ```



## 3. Vue3 中做了哪些优化

分为三个方面

### 源码

* 源码管理

  vu3整个源码通过`monorepoe`的方式维护，根据功能将不同的模块拆分到 `packages` 目录下面不同的子目录中；

  另外一些 `package` （比如 `reactivity` 响应式库）是可以独立于 `Vue` 使用的，这样如果只想使用 vue3 的响应式能力，可以值使用响应式库，而不用依赖整个 vue 。

* TypeScript

  vue3 是基于 typeScript 编写的，提供了更好的类型检查，能支持复杂的类型推导。

### 性能

* 编译阶段

  1. diff 算法优化

     进行静态标记，下次发生变化时只在有标记的地方进行比较

  2. 静态提升

     vue3 对不参与更新的元素，会做静态提升，在编译时只创建一次，在渲染时直接复用，不会再做对比

  3. 事件监听缓存

     默认情况下事件会被视为动态绑定，座椅每次都会追踪他的变化，开启事件监听缓存后，也会进行静态标记，每次对比时如果没有标记，就直接使用

  4. SSR优化（服务器端渲染）

     当静态内容大到一定量级的时候，会用 `createStaticeVNode` 方法在客户端去生成静态节点，这些静态节点会直接插入dom中，不会说是去创建对象，然后根据对象再渲染。

* 体积优化

  Vue3 移除了一些不常用的API，还使用了 `Tree shanking`功能，任何一个函数，比如 ref、reactive、computed 等，仅仅在用到的时候才打包，没用到的模块都被摇掉，打包的整体体积变小了。

* 数据劫持优化

  Vue2 使用 Object.defineProperty，但是这个API只能遍历对象属性进行劫持，并且不能检测对象和数组属性的添加和删除，需要重写数组方法，额外增加 set、delete方法

  Vue3 使用 Proxy API，直接可以劫持整个对象，并返回新对象，只需要操作新对象就行，不需要遍历属性，他有13中拦截方式，可以直接监听数组、对象的变化

语法 API

也就是 composition API，两大显著的优化：

* 优化逻辑组织

  是功能更内聚，还不是分散在不同的地方

* 逻辑复用

  可以将复用的代码抽离出来作为一个 `hook` 函数，只要使用的地方直接调用，而 vue2 需要使用 mixin，存在**命名冲突**和**数据来源不清晰难以维护**的问题。



## 1. 请解释Vue 3中Composition API的核心概念，以及它与Options API的区别。为什么在大型项目中更推荐使用Composition API？请用TypeScript示例说明一个简单的Composition API用法。

Composition API是Vue 3引入的一种新的组件编写方式，  
* 核心是通过setup函数（或`<script setup>`语法糖）组织组件逻辑。  
* 使用 ref、reactive、computed、watch 等 API 直接操作响应式数据。  
* 使用自定义的composable(组合)函数来实现逻辑复用。  
相比Options API，Composition API的逻辑组织更灵活，代码按功能聚合而不是按类型（如data、methods）分散。

与Options API的区别：
1. **代码组织方式：** Options API将组件逻辑分散在data、methods、computed等选项中，同一个功能的代码可能分布在不同地方，难以维护。Composition API允许将相关逻辑（如一个计数器的状态、方法和计算属性）放在一起，提升可读性和维护性。 
2. **逻辑复用性：** Options API复用逻辑通常依赖mixins，但mixins有命名冲突和隐式依赖问题。Composition API通过composable函数（如useCounter）实现逻辑复用，代码更清晰且易于测试。
3. **类型推导：** Composition API与TypeScript结合更友好，ref和reactive可以显式定义类型，而Options API的this上下文类型推导复杂。
4. **灵活性：** Composition API没有固定的结构，可以自由组织代码，适合复杂组件。

为什么大型项目推荐Composition API：
* 代码组织： 逻辑按功能聚合，减少大型组件的维护成本。
* 复用性：composable函数便于提取和共享逻辑，减少重复代码。
* TypeScript支持：类型安全的代码更适合大型团队协作，减少运行时错误。
* 维护性：composable函数独立于组件，易于维护。

TypeScript示例：
```typescript
<script setup lang="ts">
import { ref, computed } from 'vue';

// 定义composable函数
function useCounter() {
  // 定义响应式状态
  const count = ref<number>(0);
  // 定义方法
  const increment = () => {
    count.value++;
  };
  return { count, increment };
}

// 使用composable
const { count, increment } = useCounter();
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
```

## 2. 在Vue 3中使用Vue Router时，如何实现动态路由和导航守卫？请结合TypeScript给出代码示例。

在Vue 3中，Vue Router是用于管理路由的官方库。动态路由指的是通过参数化路由（如/user/:id）或程序化添加路由（如router.addRoute）来动态生成页面，通常用于根据用户数据或角色加载不同路由。导航守卫则是用于控制路由跳转的钩子函数，比如beforeEach可以用来实现鉴权、跳转拦截等功能。两者结合可以实现灵活的路由管理和权限控制。

### 动态路由的实现
* 参数化路由：通过在路由路径中定义动态参数（如/user/:id），可以根据参数动态渲染组件。
* 程序化添加路由：使用router.addRoute动态添加路由，例如根据用户角色加载特定模块的路由。
* 典型场景：如为不同用户动态生成个人页面，或根据权限动态加载管理面板。

### 导航守卫的实现
* 使用beforeEach全局守卫检查用户权限，决定是否允许访问目标路由。
* 通过路由的meta字段定义额外信息（如isAuth表示需要登录），结合TypeScript类型确保代码安全。

### 代码示例
1. 路由配置（包含动态路由）： 
    ```typescript
    // router/index.ts
    import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
    import Home from '../views/Home.vue';
    import User from '../views/User.vue';
    import Login from '../views/Login.vue';
    
    // 定义meta字段的类型
    interface RouteMeta {
      isAuth?: boolean;
      title?: string;
    }
    
    // 路由配置
    const routes: RouteRecordRaw[] = [
      {
        path: '/',
        name: 'home',
        component: Home,
        meta: { title: 'Home' },
      },
      {
        path: '/user/:id', // 动态路由
        name: 'user',
        component: User,
        meta: { isAuth: true, title: 'User Profile' },
      },
      {
        path: '/login',
        name: 'login',
        component: Login,
        meta: { title: 'Login' },
      },
    ];
    
    const router = createRouter({
      history: createWebHistory(),
      routes,
    });
    
    // 动态添加路由（示例：根据用户角色）
    function addDynamicRoutes(role: string) {
      if (role === 'admin') {
        router.addRoute({
          path: '/admin',
          name: 'admin',
          component: () => import('../views/Admin.vue'),
          meta: { isAuth: true, title: 'Admin Panel' },
        });
      }
    }
    
    export default router;
    ```
2. 导航守卫（结合鉴权）：
    ```typescript
    // router/guards.ts
    import router from './index';
    import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
    
    // 模拟鉴权函数
    function isAuthenticated(): boolean {
      return !!localStorage.getItem('token');
    }
    
    // 全局前置守卫
    router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized): boolean | { name: string } => {
      const requiresAuth = to.meta.isAuth as boolean | undefined;
    
      if (requiresAuth) {
        if (isAuthenticated()) {
          return true; // 允许导航
        } else {
          return { name: 'login' }; // 未登录，重定向到登录页
        }
      }
      return true; // 无需鉴权，直接通过
    });
   ```

3. 组件中使用动态路由：

    ```typescript
    // views/User.vue
    <script setup lang="ts">
    import { useRoute } from 'vue-router';
    import { ref, onMounted } from 'vue';
    
    const route = useRoute();
    const userId = ref<string>('');
    
    // 获取动态路由参数
    onMounted(() => {
      userId.value = route.params.id as string;
    });
    </script>
    
    <template>
      <div>
        <h1>User Profile: {{ userId }}</h1>
      </div>
    </template>
    ```

## 3. 在Vue 3中，Pinia是如何管理状态的？请结合TypeScript展示一个Pinia Store的定义和使用方式，并说明它与Vuex的区别。

### Pinia状态管理机制
Pinia是Vue 3的官方状态管理库，基于Vue的响应式系统（ref、reactive）管理状态。每个Pinia Store是一个独立的响应式对象，通过defineStore定义，内部可以包含状态（ref或reactive）、getters（类似计算属性）和actions（同步或异步方法）。Pinia通过useStore钩子与Vue组件集成，组件可以直接访问Store的响应式状态并自动更新视图。Pinia支持两种Store定义方式：Setup Store（函数式，推荐）和Option Store（类似Vuex）。相比Vuex，Pinia设计更轻量，API更简洁，且与TypeScript深度集成。

### 与Vuex的区别
1. 模块化设计：
    * Vuex使用单一的全局Store，所有状态通过模块组织，配置复杂。
    * Pinia允许多个独立的Store，天然支持模块化，无需复杂的模块注册。
2. API设计：
    * Vuex依赖state、getters、mutations和actions，需要显式提交mutations来修改状态。
    * Pinia去掉了mutations，状态可以直接修改（如store.count++），API更直观。
3. TypeScript支持：
    * Vuex的类型推导较弱，尤其是动态模块和this上下文。
    * Pinia与TypeScript深度集成，ref和reactive的类型推导更强，Store支持类型导出。
4. 性能和体积：
    * Pinia更轻量（约1KB），移除了Vuex的一些冗余功能（如严格模式）。
    * Pinia利用Vue 3的Proxy响应式系统，性能更优。

### 代码示例
1. 定义Pinia Store：
    ```typescript
    // stores/user.ts
    import { defineStore } from 'pinia';
    import { ref, reactive, computed } from 'vue';
    
    // 定义用户类型
    interface User {
      userName: string;
      age: number | null;
    }
    
    // 定义Store返回值的类型
    interface UserStore {
      user: User;
      token: string;
      fullName: string;
      setToken: (newToken: string) => void;
      fetchUser: () => Promise<void>;
    }
    
    export const useUserStore = defineStore<'user', UserStore>('user', () => {
      // 响应式状态
      const user = reactive<User>({
        userName: '',
        age: null,
      });
    
      const token = ref<string>('');
    
      // Getter
      const fullName = computed(() => `${user.userName || 'Guest'}'s Profile`);
    
      // Action
      function setToken(newToken: string) {
        token.value = newToken;
      }
    
      // 异步Action
      async function fetchUser() {
        try {
          const response = await fetch('/api/user');
          const data = await response.json();
          user.userName = data.userName;
          user.age = data.age;
        } catch (error) {
          console.error('Failed to fetch user:', error);
        }
      }
    
      return { user, token, fullName, setToken, fetchUser };
    });
    ```
2. 在组件中使用Store：
    ```typescript
    // views/UserProfile.vue
    <script setup lang="ts">
    import { storeToRefs } from 'pinia';
    import { useUserStore } from '../stores/user';
    
    const userStore = useUserStore();
    
    // 直接访问响应式状态
    const { user, token, fullName } = storeToRefs(userStore);
    
    // 调用action
    const updateToken = () => {
      userStore.setToken('new-token');
    };
    
    // 异步获取用户数据
    onMounted(() => {
      userStore.fetchUser();
    });
    </script>
    
    <template>
      <div>
        <h1>{{ fullName }}</h1>
        <p>Username: {{ user.userName }}</p>
        <p>Age: {{ user.age ?? 'Unknown' }}</p>
        <p>Token: {{ token }}</p>
        <button @click="updateToken">Update Token</button>
      </div>
    </template>
    ```

## 4. 在Vite项目中，如何优化构建性能？请结合Vue 3和TypeScript，说明常见优化手段并提供配置示例。

在Vue 3项目中使用Vite作为构建工具，可以通过多种方式优化构建性能，包括代码分包、CDN引入、按需加载、Tree Shaking、代码压缩等。这些优化手段可以减少打包体积、提升首屏加载速度，并提高生产环境的性能。以下是常见优化手段的说明，以及结合Vue 3和TypeScript的配置示例。

### 常见优化手段：

1. 代码分包（Code Splitting）：
    * 实现方式：Vite内置支持代码分割，通过动态导入（import()）实现按需加载。例如，在Vue 3中可以通过路由 懒加载将组件按路由拆分为多个chunk。
    * 效果：减少首屏加载的JS体积，提升加载速度。
    * 适用场景：适用于路由较多的大型Vue 3项目。
2. CDN引入外部依赖：
    * 实现方式：通过Vite的external配置将大型库（如Vue、Pinia）从打包中排除，使用CDN加载。
    * 效果：减少打包体积，利用CDN的缓存和分布式加速。
    * 注意事项：需确保CDN可靠，并配置降级方案（如本地副本）。
3. 按需加载（Lazy Loading）：
    * 实现方式：结合Vue 3的动态组件或异步组件，按需加载非关键组件。
    * 效果：延迟加载次要模块，优化首屏渲染。
      > 动态组件、异步组件、 import() 动态导入什么区别？  
      > `---------------`动态组件：  `<component :is="currentComponent" />`
      > * currentComponent 可以是：
      >   * 已经 全局注册 或 局部注册 的组件对象
      >   * 组件名字符串（注册过的组件）
      > * 特点：  
      >   * 组件已经存在（在打包时就引入了）, 运行时切换组件
      >   * 切换时不会再请求新资源，只是 Vue 重新渲染组件, 组件已经在打包中
      >   * 可以和 v-if、keep-alive 结合优化性能, 不会触发额外网络请求  
      >
      > `---------------`异步组件是指 Vue 允许你 懒加载组件，只有在使用时才去加载：
      >
      > ```ts
      > import { defineAsyncComponent } from 'vue';
      > // 方式一
      > const AsyncFoo = defineAsyncComponent(() => import('./Foo.vue'));
      > // 方式二
      > const AsyncFoo = defineAsyncComponent({
      >   loader: () => import('./Foo.vue'),
      >   loadingComponent: Loading,
      >   errorComponent: ErrorComp,
      >   delay: 200,      // 200ms 后显示 loading
      >   timeout: 3000    // 3s 后失败显示 error
      > });
      > ```
      > * 特点总结：
      >   * 真正 懒加载，只有使用时才请求 JS 文件
      >   * 打包时会生成 独立的 chunk
      >   * 可减少首屏体积，优化加载性能  
      >
      > `---------------`import() 动态导入  
      > import() 是 原生 ES 模块语法，不仅限于 Vue
      > * 特点：
      >   * 返回一个 Promise
      >   * 支持懒加载模块或组件
      >   * 在 Vue 异步组件里，import() 是最常用的方式
      > * 区别：
      >   * 动态导入可以用于任何模块，不仅仅是 Vue 组件
      >   * 异步组件是 Vue 对动态导入的封装，自动处理加载状态和渲染
      >
      > `---------------`对比总结   
      > * `<component :is>` = “我已经有组件了，只是运行时选择显示哪个”
      > * 异步组件 = “我暂时不加载组件，等用户需要时再加载”
      > * import() = “JS 原生动态导入模块”，异步组件内部就是用它来懒加载 Vue 组件  
      >
      > | 特性                   | 动态组件 (`<component :is>`) | 异步组件 (`defineAsyncComponent`) | `import()` |
      > | -------------------- | ------------------------ | ----------------------------- | ---------- |
      > | 加载时机                 | 打包时就已加载                  | 使用时才加载                        | 使用时才加载     |
      > | 是否生成独立 chunk         | 否                        | 是                             | 是          |
      > | 是否需要 Promise         | 否                        | 是                             | 是          |
      > | 适用范围                 | Vue 已注册组件                | Vue 组件懒加载                     | 任意模块       |
      > | 首屏体积优化               | 无                        | 可以                            | 可以         |
      > | 是否可以设置 loading/error | 否                        | 可以                            | 需要自己实现     |
    
4. Tree Shaking：
    * 实现方式：Vite基于esbuild和Rollup，默认支持Tree Shaking，自动移除未使用的代码。
    * 效果：减少打包后的JS文件大小。
    * 适用场景：使用ESM模块化的库（如Lodash-es）时效果显著。
5. 代码压缩：
    * 实现方式：Vite使用esbuild进行开发时快速构建，生产环境默认使用esbuild压缩代码，可通过build.minify配置。
    * 效果：减小JS/CSS文件体积，加快加载。
6. 图片优化：
    * 实现方式：使用vite-plugin-image-optimizer等插件压缩图片，或将小图片转为Base64内联。
    * 效果：减少静态资源体积，优化加载速度。

### 代码示例
#### 1. Vite配置文件（结合TypeScript）

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';

// 定义环境变量类型
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

// 优化配置
export default defineConfig({
  plugins: [
    vue(),
    visualizer(), // 分析打包体积
  ],
  build: {
    minify: 'terser', // 使用Terser压缩代码
    rollupOptions: {
      // 外部化依赖，使用CDN加载
      external: ['vue', 'pinia'],
      output: {
        // 手动分包：将node_modules中的库打包到单独chunk
        manualChunks: {
          vendor: ['vue', 'pinia'],
        },
      },
    },
  },
  resolve: {
    // CDN引入时的别名配置
    alias: {
      vue: 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js',
      pinia: 'https://unpkg.com/pinia@2/dist/pinia.esm-browser.js',
    },
  },
});
```

#### 2. Vue 3路由懒加载（结合TypeScript）：

```typescript
// router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

// 定义路由类型
interface RouteMeta {
  title: string;
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'), // 动态导入
    meta: { title: 'Home' },
  },
  {
    path: '/user/:id',
    name: 'user',
    component: () => import('../views/User.vue'), // 动态导入
    meta: { title: 'User Profile' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
```

#### 3. 异步组件使用：

```typescript
// views/Home.vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

// 异步加载非关键组件
const HeavyComponent = defineAsyncComponent(() =>
  import('../components/HeavyComponent.vue')
);
</script>

<template>
  <div>
    <h1>Home Page</h1>
    <Suspense>
      <HeavyComponent />
      <template #fallback>Loading...</template>
    </Suspense>
  </div>
</template>
```
### 代码说明

* 代码分包：通过路由懒加载（import('../views/Home.vue')）和manualChunks实现按需加载和模块分离。
* CDN引入：通过external和alias将Vue和Pinia从打包中排除，使用CDN加载。
* 按需加载：使用defineAsyncComponent和`<Suspense>`加载非关键组件。
* TypeScript支持：通过RouteRecordRaw和自定义RouteMeta接口确保路由配置的类型安全；defineConfig和ImportMetaEnv提供类型安全的Vite配置。
* Tree Shaking和压缩：默认启用Tree Shaking，minify: 'terser'确保生产环境代码最小化。

### 优化效果

* 首屏加载：懒加载和CDN引入显著减少初始JS体积。
* 打包体积：分包和Tree Shaking移除冗余代码，降低总体文件大小。
* 开发体验：TypeScript类型注解确保配置可靠，visualizer插件帮助分析打包体积。

### 注意事项

* CDN引入需确保网络可靠性，可配置本地副本作为降级。
* 分包策略需根据项目规模调整，避免chunk过多导致HTTP请求增加。

## 5. 在Vue 3项目中，如何结合Vite和TypeScript实现环境变量管理和多环境配置？请提供配置示例并说明其作用。

在Vue 3项目中使用Vite，可以通过.env文件实现环境变量管理和多环境配置。Vite默认加载根目录下的.env文件，按模式（mode）加载特定文件（如.env.development），并支持自定义变量（以VITE_开头）。通过命令行--mode参数指定模式，实现开发、生产等环境的切换。结合TypeScript，可以定义ImportMetaEnv接口，确保变量访问的类型安全。

### 环境变量加载机制：

* 文件命名：`.env（通用）、.env.development（开发）、.env.production（生产）、.env.local（本地覆盖，高优先级）`。
* 加载优先级：`.env.local > .env.[mode].local > .env.[mode] > .env`。
* 访问方式：在代码中使用`import.meta.env.VITE_XXX`。
* 启动命令：`vite --mode development（加载.env.development）`。
* `TypeScript`支持：扩展`ImportMetaEnv`接口，提供类型提示和自动补全。

### 代码示例：

#### 1. 环境变量文件

```ts
# .env.development
VITE_API_URL=http://localhost:3000
VITE_APP_TITLE=Development App

# .env.production
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=Production App
```

#### 2. TypeScript类型定义（在vite-env.d.ts中）

```ts
// vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

#### 3. Vite配置文件（处理mode）

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  console.log(`Current mode: ${mode}`); // 调试当前模式

  return {
    plugins: [vue()],
    define: {
      __APP_MODE__: JSON.stringify(mode), // 注入mode到代码中
    },
  };
});
```

#### 4. 在Vue 3组件中使用

```ts
// views/App.vue
// ...
```

#### 5. Git忽略规则（.gitignore）

```tex
# 环境变量文件
.env.local
.env.*.local
```

## 6. 在Vue 3全家桶项目中，如何使用TypeScript实现组件的props和emit的类型定义？请提供一个父子组件交互的代码示例。

在Vue 3中，组件的props用于父到子单向数据传递，emit用于子到父事件通信。结合TypeScript，可以通过defineProps和defineEmits定义类型，确保props和emit的参数类型安全，提供IDE自动补全和编译时检查。这在全家桶项目（如与Pinia状态同步或Router导航）中特别有用，避免运行时类型错误。

### 类型定义方式

* `Props`：使用`interface Props { title: string; }`，然后`const props = defineProps<Props>()`，支持默认值和验证（如`withDefaults`）。
* `Emit`：使用`defineEmits<{ update: (value: string) => true }>()`，定义事件名和`payload`类型（数组或函数签名）。
* 优势：TypeScript推导事件类型（如emit('update', 'new')自动检查参数），提升代码维护性。

### 代码示例（父子组件交互：子组件输入更新父组件title，实现类似v-model的双向绑定）

```vue
// Parent.vue
<template>
  <div>
    <h1>Parent Title: {{ title }}</h1>
    <Child :title="title" @update="setTitle" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Child from './Child.vue';

const title = ref<string>('Hello World');

const setTitle = (newTitle: string): void => {
  title.value = newTitle;
};
</script>
```

```vue
// Child.vue
<template>
  <div>
    <p>Child received prop: {{ props.title }}</p>
    <input 
      v-model="localTitle" 
      placeholder="Update title here" 
      @input="handleInput" 
    />
    <button @click="setTitle('Custom Update!')">Custom Update</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

// 定义Props类型
interface Props {
  title: string;
}

// 定义props，支持默认值和验证
const props = withDefaults(defineProps<Props>(), {
  title: 'Default Title',
});

// 定义emit类型：update事件接收string参数
const emit = defineEmits<{
  update: [value: string],
  (e: 'change', value: string): void
}>();

// 本地响应式状态，用于双向绑定
const localTitle = ref<string>(props.title);

// 监听props变化，同步到localTitle
watch(() => props.title, (newVal) => {
  localTitle.value = newVal;
});

// 处理输入变化，emit更新
const handleInput = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  localTitle.value = value;
  emit('update', value);  // TypeScript检查value为string
};

const setTitle = (val: string): void => {
  emit('update', val);
};
</script>
```

### 代码说明：

* Props定义：`interface Props`指定`title: string`，`withDefaults`添加默认值。父组件通过`:title="title"`传递，子组件读取`props.title`。
* `Emit`定义：`defineEmits<{ update: [value: string]}>`确保`emit('update', val)`的`val`必须是`string`。
* **交互演示**：子组件用localTitle ref处理输入（避免直接改props），@input触发handleInput emit事件。父组件@update监听更新title，实现双向同步。
* TypeScript集成：所有函数参数和ref都有类型注解，watch和event.target使用类型断言，确保类型安全。
* 运行效果：输入框变化会实时更新父组件的title；点击按钮触发固定更新。

## 7. 在Vue 3项目中使用Element Plus时，你对它进行过哪些二次封装？请讲一下你认为封装得比较好的组件，并说明封装的原因和实现要点。结合TypeScript给出简单代码示例。

在Vue 3 + Element Plus的项目中，我经常进行二次封装，主要目的是解决原生组件的痛点，如API不统一、验证逻辑重复、主题适配复杂等。通过封装，可以提升代码复用性、维护性和团队协作效率。常见封装包括Form（统一验证）、Table（数据处理）、Upload（文件上传）。我认为封装得最好的两个是自定义Form和Table组件，下面详细说明。

### 1. 自定义Form组件（封装原因：原生ElForm验证规则繁琐、props配置冗余；封装后统一API，支持动态生成表单，支持TypeScript类型推导，与Pinia集成验证状态）

* 实现要点：使用defineProps定义通用props（如model、rules、labelWidth），内部包裹ElForm和ElFormItem，支持v-model双向绑定。添加默认验证（如必填），并暴露validate方法。TypeScript中定义FormProps接口，确保model类型安全。
* 优势：减少表单代码量50%，便于动态表单（如根据API生成字段）。

#### 代码示例（CustomForm.vue）

```vue
<template>
  <el-form
    ref="formRef"
    v-bind="$attrs"
    :model="localModel"
    :rules="rules"
    :label-width="labelWidth"
    @submit.native.prevent
  >
    <slot></slot>
    <el-form-item v-if="showSubmit" style="text-align: right;">
      <el-button type="primary" @click="handleSubmit">提交</el-button>
      <el-button @click="handleReset">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

// 定义Props类型
interface FormProps<T = any> {
  model: T;
  rules?: FormRules;
  labelWidth?: string;
  showSubmit?: boolean;
}

const props = withDefaults(defineProps<FormProps>(), {
  rules: () => ({}),
  labelWidth: '120px',
  showSubmit: true,
});

const emit = defineEmits<{
  submit: [data: any];
  reset: [];
}>();

const formRef = ref<FormInstance>();
const localModel = reactive({ ...props.model });

// 监听model变化
watch(() => props.model, (newVal) => {
  Object.assign(localModel, newVal);
}, { deep: true });

const handleSubmit = async () => {
  try {
    await formRef.value?.validate((valid) => valid);
    emit('submit', { ...localModel });
  } catch (error) {
    console.error('Validation failed:', error);
  }
};

const handleReset = () => {
  formRef.value?.resetFields();
  emit('reset');
};

defineExpose({ validate: () => formRef.value?.validate() });
</script>
```

#### 使用示例（在父组件）：

```vue
<template>
  <CustomForm :model="formData" @submit="onSubmit">
    <el-form-item label="用户名" prop="username">
      <el-input v-model="formData.username" />
    </el-form-item>
    <el-form-item label="年龄" prop="age">
      <el-input v-model.number="formData.age" type="number" />
    </el-form-item>
  </CustomForm>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import CustomForm from './CustomForm.vue';

interface FormData {
  username: string;
  age: number;
}

const formData = reactive<FormData>({
  username: '',
  age: 0,
});

const onSubmit = (data: FormData) => {
  console.log('Submitted:', data);
};
</script>
```

### 2. 自定义Table组件（封装原因：原生ElTable列配置复杂、数据源处理重复；封装后支持分页、搜索、选中状态，与Vite懒加载集成，TypeScript定义列类型）

* 实现要点：包裹ElTable和ElPagination，props包括columns（列定义）、data（表格数据）。内部处理排序、过滤，支持选中行emit。TypeScript用泛型TableColumn定义列，确保data和columns类型匹配。
* 优势：统一表格渲染逻辑，适合后台管理系统，减少样板代码。

#### 代码示例（CustomTable.vue，简化版）

```vue
<template>
  <div>
    <el-table
      ref="tableRef"
      v-bind="$attrs"
      :data="data"
      @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="showSelection" type="selection" width="55" />
      <template v-for="column in columns" :key="column.prop">
        <el-table-column
          v-bind="column"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
        >
          <template #default="{ row }">
            <slot :name="`col-${column.prop}`" :row="row">
              {{ row[column.prop] }}
            </slot>
          </template>
        </el-table-column>
      </template>
    </el-table>
    <el-pagination
      v-if="pagination"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      @current-change="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 定义列类型
interface TableColumn<T = any> {
  prop: keyof T;
  label: string;
  width?: number;
  sortable?: boolean;
}

interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  showSelection?: boolean;
  pagination?: boolean;
  currentPage?: number;
  pageSize?: number;
  total?: number;
}

const props = withDefaults(defineProps<TableProps>(), {
  showSelection: false,
  pagination: false,
  currentPage: 1,
  pageSize: 10,
  total: 0,
});

const emit = defineEmits<{
  'selection-change': [selection: any[]];
  'page-change': [page: number];
}>();

const tableRef = ref();

const handleSelectionChange = (selection: any[]) => {
  emit('selection-change', selection);
};

const handlePageChange = (page: number) => {
  emit('page-change', page);
};
</script>
```

### 总体封装经验

* 为什么好：这些封装让Element Plus更贴合项目（如主题变量注入CSS），TypeScript确保props不乱传，Vite支持热更新。
* 项目应用：在全家桶中，与Pinia联动Form验证，与Router懒加载Table数据，提升了开发效率
* 改进空间：未来可加更多插件支持，如国际化或暗黑模式。

## 8. 在Vue 3 + Vite + TypeScript项目中，如何处理全局异常和错误边界？请提供代码示例。

在Vue 3 + Vite + TypeScript项目中，异常处理分为全局异常（捕获整个应用的JS运行时错误）和错误边界（组件级隔离错误，防止单个组件崩溃影响整体）。全局异常使用app.config.errorHandler和onErrorCaptured钩子记录日志；错误边界通过自定义组件实现，结合处理异步错误。Vite支持dev模式下热重载错误日志，生产环境可集成Sentry上报。TypeScript定义Error类型，确保日志的类型安全。

### 处理机制

#### 1. 全局异常

* app.config.errorHandler：捕获未处理的Promise错误和渲染错误。
* onErrorCaptured：组件钩子，捕获子树错误，返回false阻止渲染。
* 作用：统一日志上报，防止白屏。

#### 2. 错误边界

* 自定义ErrorBoundary组件，使用onErrorCaptured隔离错误，提供fallback UI
* 结合Vite动态导入处理异步组件加载错误

#### 3. 请求错误：在API服务（如axios）中使用try-catch或拦截器，防止网络错误传播。

#### 4. Vite集成：使用vite.config.ts插件如@vitejs/plugin-vue的errorOverlay，或自定义插件上报

#### 5. TypeScript优势：定义CustomError接口，增强错误分类和IDE提示。

### 代码示例

#### 1. 全局异常处理（main.ts）

```ts
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';

const app = createApp(App);

// 定义错误类型
interface CustomError {
  message: string;
  stack?: string;
  component?: string;
}

// 全局错误处理器
app.config.errorHandler = (err: unknown, vm: any, info: string) => {
  const error: CustomError = {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    component: vm?.$options?.name || 'Unknown',
  };
  console.error('Global Error:', error); // 或上报Sentry: Sentry.captureException(error)
};

// Pinia和Router集成
app.use(createPinia());
app.use(router);

app.mount('#app');
```

#### 2. 错误边界组件（ErrorBoundary.vue）

```vue
<template>
  <div v-if="hasError" class="error-boundary">
    <h2>Something went wrong: {{ errorMessage }}</h2>
    <button @click="resetError">Retry</button>
  </div>
  <component v-else :is="childComponent" v-bind="$attrs">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, shallowRef, onErrorCaptured } from 'vue';

interface Props {
  component: any; // 动态组件
}

const props = defineProps<Props>();

const hasError = ref<boolean>(false);
const errorMessage = ref<string>('');
const childComponent = shallowRef<any>(props.component);

// 错误边界钩子
onErrorCaptured((err: unknown, target: any, info: string) => {
  hasError.value = true;
  errorMessage.value = err instanceof Error ? err.message : String(err);
  console.error('Error Boundary Captured:', { err, target, info }); // 日志上报
  return false; // 阻止错误向上冒泡
});

const resetError = () => {
  hasError.value = false;
  errorMessage.value = '';
  childComponent.value = props.component; // 重置组件
};
</script>

<style scoped>
.error-boundary {
  padding: 20px;
  border: 1px solid red;
  background: #fee;
}
</style>
```

#### 3. 使用错误边界（App.vue，结合Vite动态导入）

```vue
<template>
  <div id="app">
    <ErrorBoundary :component="asyncComponent">
      <router-view />
    </ErrorBoundary>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import ErrorBoundary from './components/ErrorBoundary.vue';

// Vite动态导入异步组件
const asyncComponent = defineAsyncComponent(() =>
  import('./views/Dashboard.vue').catch((err) => {
    console.error('Async Load Error:', err); // 捕获加载错误
    throw err;
  })
);
</script>
```

#### 4. API请求错误处理（services/api.ts，使用try-catch）

```ts
// services/api.ts
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

interface ApiError extends Error {
  status?: number;
  data?: any;
}

// 拦截器 + try-catch
api.interceptors.response.use(
  (response) => response,
  (error: ApiError) => {
    console.error('API Error:', error); // 日志上报
    // 防止传播：返回默认值或通知
    return Promise.reject(error);
  }
);

export const fetchData = async (): Promise<any> => {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    const apiError = error as ApiError;
    // 隔离错误：不影响其他组件
    throw new Error(`Fetch failed: ${apiError.message}`); // 或显示Toast
  }
};
```

### 代码说明

* 全局异常：errorHandler捕获Promise/渲染错误，TypeScript的CustomError确保日志结构化。
* 错误边界：onErrorCaptured返回false隔离错误，提供重试UI；与Vue的defineAsyncComponent结合处理异步加载失败。
* 请求错误：axios拦截器 + try-catch防止网络错误传播到组件树。

### 效果和作用

* 用户体验：错误边界显示友好fallback，避免白屏；全局日志便于调试。
* TypeScript安全：接口定义减少运行时错误。
* 项目集成：与Pinia结合上报状态错误，与Vite插件扩展（如rollup-plugin-sentry）自动化上报。

## 9. Vue 3中Teleport和Suspense的实际应用场景是什么？请结合TypeScript和Vite给出代码示例。

Vue 3的Teleport和Suspense是Composition API的重要部分，用于解决组件渲染和加载的痛点。Teleport允许将子组件的DOM“传送”到指定位置，脱离父组件的CSS作用域，常用于全局UI元素。Suspense处理异步组件或异步操作，提供fallback内容，直到resolve或reject。结合Vite的动态导入（import()）和TypeScript类型安全，可以实现高效的懒加载和错误处理。

### 实际应用场景

#### 1. Teleport

* 场景：模态框（Modal）或Tooltip脱离父容器，避免z-index冲突或父级样式影响；在后台管理系统中，将Dialog渲染到body末尾，确保全屏覆盖。
* 优势：保持组件逻辑封装，但DOM灵活；Vite热更新时不影响位置。

#### 2. Suspense

* **场景**：路由懒加载或异步数据组件；在Vue Router中包裹懒加载视图，展示加载spinner，直到组件/数据ready。
* 优势：提升用户体验，避免白屏；与Vite的代码分割结合，优化首屏加载。

### 代码示例（结合TypeScript和Vite动态导入）

#### 1. Teleport示例：全局模态框（Modal.vue）

```vue
<template>
  <Teleport to="body"> <!-- 传送至body，避免父级样式影响 -->
    <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-content" @click.stop>
        <h2>{{ title }}</h2>
        <slot /> <!-- 插槽内容 -->
        <button @click="close">关闭</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  title?: string;
  visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const handleOverlayClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) emit('close');
};

const close = () => emit('close');
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000; /* 高层级 */
}
.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
}
</style>
```

使用示例（在父组件）

```vue
<template>
  <button @click="showModal = true">打开模态框</button>
  <Modal :visible="showModal" title="自定义标题" @close="showModal = false">
    <p>模态框内容</p>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from './Modal.vue';

const showModal = ref<boolean>(false);
</script>
```

#### 2. Suspense示例：异步组件懒加载（结合Vite动态导入）

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncDashboard /> <!-- 异步组件 -->
    </template>
    <template #fallback>
      <div class="loading">加载中...</div> <!-- 后备内容 -->
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { defineAsyncComponent, Suspense } from 'vue';

// Vite动态导入 + TypeScript类型
const AsyncDashboard = defineAsyncComponent({
  loader: () => import('./Dashboard.vue'), // Vite代码分割
  loadingComponent: () => <div>预加载...</div>, // 可选加载中组件
  errorComponent: (err: Error) => ( // 错误处理
    <div>加载失败: {err.message} <button @click="retry">重试</button></div>
  ),
  delay: 200, // 延迟显示fallback
  timeout: 3000, // 超时抛错
});

const retry = () => {
  // 重试逻辑
};
</script>

<style scoped>
.loading {
  text-align: center;
  padding: 20px;
}
</style>
```

Dashboard.vue（异步组件示例，模拟数据请求）

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const data = ref<string[]>([]);

onMounted(async () => {
  // 模拟异步请求
  const response = await fetch('/api/dashboard');
  data.value = await response.json();
});
</script>

<template>
  <div>
    <h1>Dashboard 数据</h1>
    <ul>
      <li v-for="item in data" :key="item">{{ item }}</li>
    </ul>
  </div>
</template>
```

### 代码说明

* Teleport：`to="body"`将Modal DOM移到body，TypeScript的Props接口确保visible为boolean。Vite热更新时，位置不变。
* Suspense：包裹defineAsyncComponent，Vite的import()实现懒加载；#fallback显示加载UI，直到Dashboard的onMounted resolve。TypeScript的Error类型处理超时/加载失败。
* 集成：在Vue Router中用Suspense包裹，优化多页应用

### 优势和注意事项

* 性能：Vite代码分割 + Suspense减少初始bundle；Teleport避免嵌套DOM复杂性。
* TypeScript：接口/类型断言确保props和错误安全。
* 场景扩展：Teleport + Portal库增强；Suspense + IntersectionObserver实现视口懒加载。
* 坑点：Teleport目标必须存在；Suspense不支持SSR中异步setup。


## 10. 项目的全生命周期流程

分为需求分析阶段、技术选型阶段、代码设计阶段、编码阶段、测试阶段、部署阶段、维护阶段。

1. 需求分析阶段：与产品经理沟通，明确功能需求，例如登录页面需要几种登录方式，账号密码、手机验证等；菜单是否需要在页面配置，如果需要就要做动态路由；只是一个单一项目还是要有配套的后台管理系统，如果是两个项目那可能就需要使用Monorepo的方式来管理项目；对数据的安全要求是否高，高的话就要使用secure-ls对本地缓存的数据进行加密；对项目整体进行模块划分确定模块的优先级，要先做哪些模块，时间节点是什么，后做什么，时间节点。
2. 技术选型阶：使用Vue3框架，element-plus作为UI层，axios做接口请求的库，pinia做状态管理，使用ts确保类型安全，echarts实现数据可视化等，像这一部分，一般情况下公司为了所有项目的可持续维护性，技术其实都是确定的。
3. 系统设计阶段：规划代码结构，多项目就使用Monorepo方式管理，配置 pnpm-workspace；指定各个子项目放到apps文件下，共享的UI组件、typescirpt 配置、eslint配置可以放到 /packages 目录下；设计路由结构、状态管理；与后端工程师沟通，定义API通用返回数据结构、状态码，确定数据返回的ts接口类型，定义好ts。使用vite脚手架初始化项目，安装必要的依赖，例如pinia、echarts、element-plus、axios等，进行请求拦截封装，对echarts采用按需引用，环境变量的定义，对 vite 配置项进行修改，定义请求代理，使用一些插件vite的插件，实现vue、vue-router、element-plus的按需并且自动导入，减少开发工作中的反复导入。
4. 编码阶段：组件开发,编写组件使用文档、配置路由、实现状态管理和API调用，业务功能开发，
5. 测试阶段：按模块或按阶段，功能开发完后与后端一起自测一边，修复遇到的功能性bug或交互上的不合理，UI显示问题等，然后交付测试，对测试提出的问题再进行修复。
6. 部署阶段：修改 .env.production 的信息，vite配置项的打包配置进行修改，比如分包、tree Shaking（使用ESM模块化的库） ，将 minify 默认的 esbuild 配置改为 terser，来减小打包体积，安装打包分析器，查看打包后的依赖大小，对比较大的依赖进行特殊处理；安装vite-plugin-image-optimizer插件，压缩图片，将小图片转为base64内联；
7. 维护阶段：迭代新功能，bug修复，使用Sentry捕获错误，系统性能优化，编写README和组件文档，降低团队上手成本等









































































