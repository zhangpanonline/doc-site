### 1. `vue2` 和 `vue3`的区别

#### 1.1 数据响应式实现原理的不同

- `vue3` 中使用了 `ES6` 的 `Proxy` `API` 对数据代理，监测的是整个对象，而不再是某个属性
- `vue3` 可以监测到对象属性的删除和添加，可以监听数组的变化

#### 1.2 建立响应式数据的方式不同

- vue2：把数据放入 data()方法中
- vue3：需要在 setup()方法中，使用 ref、reactive()

#### 1.3 `vue3` 支持碎片化（Fragments）

- `Vue2` 在组件中只有一个根节点
- `vue3` 在组件中可以拥有多个根节点
- 减少内存占用，减少`dom`层级嵌套

#### 1.4 `API`模式不同

`vue2` 只支持选项式 `API`，而 `vue3` 除了兼容 `vue2` 的大部分写法，还支持组合式 `API`

#### 1.5 生命周期钩子不同

- `setup()`：开始创建组件之前，在 `beforeCreate` 和`created`之前执行。创建的是 `data` 和 `method`
- `onBeforeMount()`：组件挂载到节点上之前执行的函数
- `onMounted()`：组件挂载完成后执行的函数
- `onBeforeUpdate()`：组件更新之前执行的函数
- `onUpdated()`组件更新完成之后执行的函数
- `onBeforeUnmount()`组件卸载之前执行的函数
- `onUnmounted()`组件卸载完成后执行的函数

若组件被 `<keep-alive>` 包含，则多出下面两个钩子函数：

- `onActivated()`：被激活时执行
- `onDeactivated()`比如从 `A` 组件切换到 `B` 组件，`A`组件消失时执行

#### 1.6 除此之外，还存在其他的不同，例如 `父子传参不同`，子组件通过 `defineProps()` 进行接收，通过`defineEmits()` 向父组件派发事件等

#### 总结：`vue3` 性能更高，体积更小，更利于复用，代码维护更方便

### 2. `defineProperty` 和 `proxy` 的区别

`vue` 在实例初始化时遍历 `data` 中的所有属性，并使用 `Object.defineProperty` 把这些属性全部转为`getter/setter`，并劫持各个属性的 `getter` 和 `setter`，在数据变化时发布消息给订阅者，触发相应的监听回调，而这之间存在几个问题

1. 初始化时需要遍历对象所有 key，如果对象层次较深，性能不好

2. 通知更新过程需要维护大量 `dep` 实例和 `watcher` 实例，额外占用内存较多

3. `Object.defineProperty` 无法监听到数组元素的变化，只能通过劫持重写数组方法

4. 动态新增、删除对象属性无法拦截，只能用特定 `set/delete` `API` 代替

5. 不支持 `Map`、`Set` 等数据结构

`vue3` 使用 `Proxy` 来监控数据的变化。**Proxy** 对象用于创建一个对象的代理，从而实现基本操作的拦截和自定义（如属性查找、赋值、枚举、函数调用等）。相对`Object.defineProperty()` ，其有以下特点：

1. `Proxy`直接代理整个对象而非对象属性，这样只需做一层代理就可以监听同级结构下的所有属性变化，包括新增属性和删除属性

2. 它的处理方式是在`getter`中去递归响应式，这样的好处是真正访问到的内部属性才会变成响应式，简单的可以说是按需实现响应式，减少性能消耗

3. `Proxy`可以监听数组的变化

### 3. Vue3 Diff 算法和 Vue2 的区别

我们知道在数据变更触发页面重新渲染，会生成虚拟 DOM 并进行 patch 过程，这一过程在 vue3 中的优化有如下

**编译阶段的优化：**

- 事件缓存：将事件缓存（如：@click），可以理解为变成静态的了
- 静态提升：第一次创建静态节点时保存，后续直接复用
- 添加静态标记：给节点添加静态标记，以优化 Diff 过程

由于编译阶段的优化，除了能更快的生成虚拟 DOM 以外，还使得 Diff 时可以跳过“永远不会变化的节点”

**Diff 优化如下：**

- Vue2 是全量 Diff，Vue3 是静态标记 + 非全量 Diff
- 使用最长递增子序列优化了对比流程

根据 vue 作者公布的数据，Vue3 性能提升了 1.3 ~ 2 倍

### 4. composition API 与 options API 的区别

- 选项式 API

  优点：易于学习和使用，每个代码有着明确的位置

  缺点：相似的逻辑，不容易复用，在大项目中尤为明显，虽然 optionsAPI 可以通过 mixins 提取相同的逻辑，但是也并不是特别好维护

- 组合式 API

  - 基于逻辑功能组织代码的，一个相关功能 api 放到一起
  - 即使项目大了，功能多了，也能快速定位相关功能的 api
  - 大大的提升了代码可读性和可维护性

- vue3 推荐使用组合式 API，也保留了了选项式 API 的写法

### 5. Composition API 与 React Hook 很像，区别昰什么

从 React Hook 的实现角度看，React Hook 是根据 useState 调用的顺序来确定下一次重新渲染时的 state 是来源于哪个 useState，所以出现了以下限制：

- 不能在循环、条件、嵌套函数中调用 hook
- 必须确保总是在你的 React 函数的顶层调用 Hook
- useEffect、useMemo 等函数必须手动确定依赖关系

而组合式 API 是基于 Vue 的响应式系统实现的，与 React Hook 的相比：

- 声明在 setup 函数内，一次组件实例化只调用一次 setup，而 React Hook 每次重新渲染都需要调用 Hook，使得 React 的垃圾回收比 Vue 的更有压力，性能也相对于 Vue 来说比较慢
- 组合式 AP 的调用不需要顾虑调用顺序，也可以在循环、条件、嵌套函数中使用
- 响应式系统自动实现了依赖收集，进而组件的部分性能优化由 Vue 内部自己完成，而 React Hook 需要手动传入依赖，而且必须保证依赖的顺序，让 useEffect、useMemo 等函数正确的捕获依赖变量，否则会由于依赖不正确使得组件性能下降

虽然组合式 API 看起来比 React Hook 好用，但是其设计思想也是借鉴 React Hook 的。

### 6. setup 函数

setup() 函数是 vue3 中，专门为组件提供的新属性。它为我们使用的 vue3 的 Composition API 新特性提供了统一入口，setup 函数会在 beforeCreate、created 之前执行，vue3 也是取消了这两个钩子，统一用 setup 代替，该函数相当于一个生命周期函数，vue 中过去的 data、methods、watch 等都用新的 api 写在 setup() 函数中。

setup() 函数接收两个参数 props 和 context。它里面不能使用 this，而是用 context 对象代替当前执行上下文绑定的对象，context 对象有四个属性：arrts、emits、slots、expose

setup() 里面通过 ref 和 reactive 代替以前的 data 语法，return 出去的变量和方法可以在模板中使用。

```vue
<template>
   
  <div class="container">
       
    <h1 @click="say()">{{ msg }}</h1>
     
  </div>
</template>

<script>
export default {
  setup(props, context) {
    console.log("setup执行了");
    console.log(this); // undefined // 定义数据和函数
    const msg = "hi vue3";
    const say = () => {
      console.log(msg);
    };
    // Attribute (非响应式对象，等同于 $attrs)
    context.attrs; // 插槽 (非响应式对象，等同于 $slots)
    context.slots; // 触发事件 (方法，等同于 $emit)
    context.emit; // 暴露公共 property (函数)
    context.expose;

    return { msg, say };
  },
  beforeCreate() {
    console.log("beforeCreate执行了");
    console.log(this);
  },
};
</script>
```

### 7. setup 语法糖（script setup 语法）

script setup 是在单文件组件（SFC）中使用组合式 API 的语法糖，相比于普通的 script 语法更加简洁。

不用写 export default {}，子组件只需要 import 进来就可以直接使用，不用注册，属性和方法也不用 return。

并且里面不需要用 async 就可以直接使用 await，可以直接调用：defineProps、defineEmits、definedExpose、useSlots、useAttrs。

### 8. reactive、shallowReactive 函数

#### reactive

reactive() 函数接收一个普通对象，返回一个响应式的数据对象，响应式转换是“深层”的，它影响所有嵌套属性，基于 proxy 来实现。

#### shallowReactive

shallowReactive() 创建一个响应式代理，它跟踪其自身属性的响应性生成非递归响应数据，只监听第一层数据的变化，但不执行嵌套对象的深层响应式转化（暴露原始值）。

### 9. ref、shallowRef、isRef、toRefs 函数

#### ref

ref() 函数用来根据给定的值创建一个响应式的数据对象，ref() 函数调用的返回值是一个对象，这个对象上只包含一个 value 属性，只在 setup 函数内部访问 ref 函数需要加 .value，用来创建独立的原始值。

#### reactive

reactive 将解包所有深层的 ref，同时维持 ref 的响应性。当将 ref 分配给 reactive 属性时，ref 将会自动解包。

#### shallowRef

ref() 的浅层作用形式。shallowRef() 常常用于对大型数据结构的性能优化或是与外部的状态管理系统集成。

#### isRef

isRef() 用来判断某个值是否为 ref() 创建出来的对象。

#### toRefs

**使用场景：如果对一个响应数据，进行解构或者展开，会丢失他的响应式特性！**

原因：vue3 底层昰对对象进行监听劫持

作用：对一个响应式对象的所有内部属性，都做响应式处理

1. reactive/ref 的响应式功能是赋值给对象的，如果给对象解构或者展开，会让数据丢失响应式的能力
2. 使用 toRefs 可以保证该对象展开的每个属性都是响应式的

### 10. readonly、isReadonly、shallowReadonly 函数

#### readonly

传入 ref 或 reactive 对象，并返回一个原始对象的只读代理，对象内部任何嵌套的属性也都是只读的、并且递归只读。

#### isReadonly

检查对象是否是由 readonly 创建的只读对象。

#### shallowReadonly

shallowReadonly 作用只处理对象最外层属性的响应式（浅响应式）的只读，但不执行嵌套对象的深度只读转换（暴露原始值）。

### 11. readonly 和 const 有什么区别

- const 是赋值保护，使用 const 定义的变量，该变量不能重新赋值。但如果 const 赋值的是对象，那么对象对应的地址不能改变，但里面的东西是可以改的。
- 而 readonly 是属性保护，不能给属性重新赋值。

### 12. computed、watch 函数

#### computed

该函数用来创造计算属性，和过去一样，它返回的值是一个 ref 对象。里面可以传方法，或者一个对象，对象中包含 set()、get()方法。

#### watch

watch 函数用来侦听特定的数据源，并在回调函数中执行副作用。默认情况是懒执行的，也就是说仅在侦听的源数据变更时才执行回调。

```javascript
// 监听单个 ref
const money = ref(100);
watch(money, (value, oldValue) => {
  console.log(value);
});

// 监听多个 ref
const money = ref(100);
const count = ref(0);
watch([money, count], (value) => {
  console.log(value);
});

// 监听 ref 复杂数据
const user = ref({
  name: "zs",
  age: 18,
});
watch(
  user,
  (value) => {
    console.log("user变化了", value);
  },
  {
    // 深度监听，当ref的值是一个复杂数据类型，需要深度监听
    deep: true,
    immediate: true,
  }
);

// 监听对象的某个属性的变化
const user = ref({
  name: "zs",
  age: 18,
});
watch(
  () => user.value.name,
  (value) => {
    console.log(value);
  }
);
```

### 13. watch 和 watchEffect 的区别

#### 区别：

- watch 作用是对传入的某个或多个值的变化进行监听；触发时会返回新值和老值；也就是说第一次不会执行，只有变化时才会重新执行。

- watchEffect 是传入一个函数，会立即执行，所以**默认第一次也会执行一次**；不需要传入监听内容，会**自动收集函数内的数据源作为依赖**，在依赖变化的时候又会重新执行该函数，如果没有依赖就不会执行；而且不会返回变化前后的新值和老值。

#### 共同点：

- 停止监听：组件卸载时都会自动停止监听
- 清除副作用：onInvalidate 会作为回调的第三个参数传入
- 副作用刷新时机：响应式系统会缓存副作用函数，并异步刷新，避免同一个 tick 中多个状态改变导致的重复调用。
- 监听器调试：开发模式下可以用 onTrack 和 onTrigger 进行调试。

### 14. vue3 的生命周期

基本上就是在 vue2 生命周期钩子函数名基础上加了 `on`；

beforeDestory 和 destoryed 更名为 onBeforeUnmount 和 onUnmounted；

然后用 setup 代替两个钩子函数 beforeCreate 和 created；新增了两个开发环境用于调试的钩子。

![](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d8832a11723a4c9e9d495fcfa336a6c9~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp?)

### 15. setup 语法下怎么设置 name 属性

#### 1. 安装插件

`yarn add vite-plugin-vue-setup-extend -D`

#### 2. 配置 `vite.config.ts`

```javascript
import vueSetupExtend from "vite-plugin-vue-setup-extend";
export default defineConfig({
  plugins: [vue(), vueSetupExtend()],
});
```

#### 3. 在标签中使用

```js
<script setup name="MyCom">
  // 必须在script标签里面写一点内容，哪怕是注释，这个插件才会生效
</script>
```

### 16. vue3 怎么让全局组件有提示

vue3 中如果注册的是局部组件，那么 props 是有类型提示的，但是如果注册的是全局组件，props 就没有类型提示了

#### 解决办法

```javascript
// 在scr目录下新建一个文件 global.d.ts
import USER from '@/components/USER.vue'
// 参考：
declare module 'vue' {
    export interface GlobalComponents {
        USER: typeof USER
    }
}
export {}
```

### 17. Vite 和 Webpack 的区别

#### 1. 都是现代化打包工具

#### 2. 启动方式不一样

vite 在启动的时候不需要打包，所以不用分析模块与模块之间的依赖关系，不用进行编译。这种方式就类似于我们在使用某个 UI 框架的时候，可以对其进行按需加载。同样的，vite 也是这种机制，当浏览器请求某个模块时，再根据需要对模块内容进行编译。按需动态编译可以缩减编译时间，当项目越复杂，模块越多的情况下，vite 明显优于 webpack。

#### 3. 热更新方面，vite 效率更高

当改动了某个模块的时候，也只让浏览器重新请求该模块，不需要像 webpack 那样将模块以及模块依赖的模块全部编译一次。

#### 4. vite 相关生态没有 webpack 完善，vite 可以作为开发的辅助

### 18. pinia 的好处

- pinia 和 vuex4 一样，也是 vue 官方状态管理工具
- pinia 相比 vuex4，对于 vue3 的兼容性更好
- pinia 相比 vuex4，具备完善的类型推荐 => 对于 TS 支持很友好
- pinia 同样支持 vue 开发者工具
- pinia 的 API 设计非常接近 vuex5 的提案
- pinia 核心概念
  - state：状态
  - actions：修改状态，包括同步和异步
  - getters：计算属性
- vuex 只能有一个根级别的状态，pinia 直接就可以定义多个根级别状态

### 19. vue3 的 v-model 语法

1. 父组件给子组件传入一个 modelValue 的属性

2. 子组件通知父组件的 update:modelValue 事件，将修改后的值传给父组件

3. 父组件监听 update:modelValue，修改对应的值

   ```javascript
   // 原生写法
   <son :model-value="money" @update:modelValue="val => money = val" />
   // 语法糖写法
   <son v-model="money" v-model:house="house" />

   // 子组件
   <button @click="$emit('update:modelValue', modelValue + 100)">Click Me</button>
   ```

**好处是什么**

为了整合 .sync 和 v-model，在 vue2 中，v-model 只能绑定一个属性，如果需要绑定多个属性则需要借助 .sync 修饰符。

.sync 修饰符在 vue3 中已被移除，直接被 v-model 取代。

### 20. [vue3 diff 算法](https://juejin.cn/post/7190726242042118200#heading-18)

1. diff 算法的触发场景
   diff 算法 本质上是一个 对比的方法。其核心就是在：“旧 DOM 组”更新为“新 DOM 组”时，如何更新才能效率更高。
   注意： 这里我们说的是 “旧 DOM 组” 和 “新 DOM 组”。也就是说：想要触发 diff，那么一定是一组 dom 发生的变化。

2. v-for 循环时，key 属性的意义

   2.1 vue 通过 isSameVNodeType 判断两个“节点”是否相同
   2.2 isSameVNodeType 主要依赖 type 和 key 进行判断
   2.3 type 表示节点的类型
   2.4 key 表示节点的唯一标识
   2.5 isSameVNodeType 返回为 true 则不需要更新，返回为 false 则需要更新

3. sync from start 自前向后的对比

   3.1 **自前向后的 diff 比对**中，会 **依次获取相同下标的 `oldChild` 和 `newChild`**

   a. 如果 `oldChild` 和 `newChild` 为 **相同的 `VNode`**，则直接通过 `patch` 进行打补丁即可

   b. 如果 `oldChild` 和 `newChild` 为 **不相同的 `VNode`**，则会跳出循环

   3.2 每次处理成功，则会自增 `i` 标记，表示：**自前向后已处理过的节点数量**

   通过第一步，我们可以处理：**从前开始，相同的 vnode。 直到遇到不同的 vnode 为止。**

4. `sync from end`：自后向前的对比

   第二步的逻辑与第一步 **反过来** 。即：**两组 dom 的自后向前对比**。 其核心的目的是：**把两组 dom 自后开始，相同的 dom 节点（vnode）完成对比处理**

   唯一不同的是：**每次处理成功之后，会自减 `oldChildrenEnd` 和 `newChildrenEnd`** ，表示：**新、旧节点中已经处理完成节点（自后向前）**

5. `common sequence + mount`：新节点多于旧节点，需要挂载

   5.1 对于 **新节点多于旧节点** 的场景具体可以再细分为两种情况：

   - 多出的新节点位于 **尾部**
   - 多出的新节点位于 **头部**

     5.2 这两种情况下的区别在于：**插入的位置不同**

     5.3 明确好插入的位置之后，直接通过 `patch` 进行打补丁即可。

6. `common sequence + unmount`：旧节点多于新节点，需要卸载

   旧节点多于新节点时，整体的处理比较简单，只需要 **卸载旧节点即可**

7. `unknown sequence`：乱序

   7.1 乱序下的 `diff` 是 **最复杂** 的一块场景

   7.2 它的主要逻辑分为三大步：

   7.2.1 创建一个 `<key（新节点的 key）:index（新节点的位置）>` 的 `Map` 对象 `keyToNewIndexMap`。通过该对象可知：新的 `child`（根据 `key` 判断指定 `child`） 更新后的位置（根据对应的 `index` 判断）在哪里

   7.2.2 循环 `oldChildren` ，并尝试进行 `patch`（打补丁）或 `unmount`（删除）旧节点

   7.2.3 处理 移动和挂载
   [完]
