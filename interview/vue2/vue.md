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

## 1. v-show与v-if的区别

### 控制手段
`v-show` 通过 `css display: none` 来控制，实际上元素一直都在；`v-if` 通过将整个 `dom` 元素添加或删除。
### 编译过程
`v-if` 会重新编译销毁子孙组件，并触发子孙组件完整的生命周期函数，而 `v-show` 由于元素一直存在，所以不会触发生命周期函数。
### 性能消耗
在首次渲染时，如果条件为假，`v-if` 不会渲染，而 `v-show` 会渲染节点，只是看不到，因此这种情况下 `v-show` 更耗性能;
而 `v-if` 每次切换都会涉及到组件的销毁和重新编译，所以在频繁切换时他更消耗性能。

## 2. Vue实例挂载的过程 / `new Vue()`这个过程中究竟做了些什么?

* `new Vue()` 的时候会调用内部的 `_init` 方法
    * 定义 `$set`、`$get`、`$delete`、`$watch` 等方法
    * 定义 `$on`、`$off`、`$emit`、`$off` 等事件
    * 定义 `_update`、`$forceUpdate`、`$destroy` 生命周期
* 调用 `$mount` 进行页面挂载
* 挂载的时候主要通过 `mountComponent` 方法
* 定义 `updateComponent` 更新函数
* 执行 `render` 生成虚拟 `DOM`
* `_update` 将虚拟 `DOM` 生成真实 `DOM` 结构，并且渲染到页面中

[参考链接](https://www.yuque.com/xiumubai/doc/uer0bhw2ri51vzd3#4d9b702b)

## 3. Vue中如何给对象添加新属性?

### `Vue.set()`
    ```js
    Vue.set( target, propertyName/index, value )
    ```
    `Vue` 内部通过 `defineReactive` 方法实现新增属性的响应式，这个方法内部还是通过 `Object.defineProperty` 实现属性拦截。

### `Object.assign()`
    直接使用Object.assign()添加到对象的新属性不会触发更新，应创建一个新的对象，合并原对象和混入对象的属性：
    ```js
    this.someObject = Object.assign({},this.someObject,{newProperty1:1,newProperty2:2 ...})
    ```

### `$forceUpdate`
    `$forceUpdate` 迫使 `Vue` 实例重新渲染，仅仅影响实例本身和插入插槽内容的子组件，而不是所有子组件。

## 4. Vue中为什么data属性是一个函数而不是一个对象？

● 根实例对象data可以是对象也可以是函数（根实例是单例），不会产生数据污染情况  
● 组件实例对象data必须为函数，目的是为了防止多个组件实例对象之间共用一个data，产生数据污染。采用函数的形式，`initData` 时会将其作为工厂函数返回全新data对象

## 5. Vue组件之间的通信方式都有哪些？
> 有8种常规通信方式

### 父子组件之间的通信
* `props` 父向子传递数据
* `$emit` 父监听子组件派发的事件和数据
* `ref` 父组件通过给子组件设置 `ref` 属性来操作子组件的数据
### 兄弟组件之间的通信
* `EventBus`
    ```js
    // 创建一个中央时间总线类  
    class Bus {  
    constructor() {  
        this.callbacks = {};   // 存放事件的名字  
    }  
    $on(name, fn) {  
        this.callbacks[name] = this.callbacks[name] || [];  
        this.callbacks[name].push(fn);  
    }  
    $emit(name, args) {  
        if (this.callbacks[name]) {  
        this.callbacks[name].forEach((cb) => cb(args));  
        }  
    }  
    }  
    
    // main.js  
    Vue.prototype.$bus = new Bus() // 将$bus挂载到vue实例的原型上  
    // Children1.vue
    this.$bus.$emit('foo')
    // Children2.vue
    this.$bus.$on('foo', this.handle)
    ```
* `$parent` 或 `$root`  
    通过共同祖辈 `$parent` 或者 `$root` 搭建通信桥连
    ```js
    this.$parent.on('add',this.add)
    this.$parent.emit('add')
    ```
### 祖孙与后代组件之间的通信
* `$attrs` 与 `$listeners`
* `provide` 与 `inject`
### 非关系组件间之间的通信
* `vuex`
    * `State` 设置默认的初始状态 
    * `Getter` 允许组件从 Store 中获取数据 
    * `Mutation` 是唯一更改 store 中状态的方法，且必须是同步函数
    * `Action` 用于提交 mutation，而不是直接变更状态，可以异步操作
    * `Module`：允许将单一的 Store 拆分为多个 store 且同时保存在单一的状态树中

## 6. Vue双向绑定的原理是什么？

Vue2 的双向绑定主要是通过 **数据劫持和发布订阅模式** 来实现的，核心是实现监听器、解析器、订阅者和订阅器（依赖收集）

* 实现一个监听器 `Observer`  
    对数据对象进行遍历，包括子属性对象的属性，利用 `Object.defineProperty()` 对属性都加上 `setter` 和 `getter`。这样的话，给这个对象的某个值赋值，就会触发 `setter`，那么就能监听到了数据变化。
* 实现一个解析器 `Compile`  
    解析 Vue 模板指令，将模板中的变量都替换成数据，然后初始化渲染页面视图，并将每个指令对应的节点绑定更新函数，添加监听数据的订阅者`Watcher`，一旦数据有变动，收到通知，调用更新函数进行数据更新。
* 实现一个订阅者 `Watcher`  
    `Watcher` 订阅者是 `Observer` 和 `Compile` 之间通信的桥梁 ，主要的任务是订阅监听器 `Observer` 中的属性值变化的消息，当收到属性值变化的消息时，触发解析器 `Compile` 中对应的更新函数。
* 实现一个订阅器/依赖收集 `Dep`  
    订阅器采用 **发布-订阅** 设计模式，用来收集订阅者 `Watcher`，对监听器 `Observer` 和 订阅者 `Watcher` 进行统一管理

## 7. vue2中NextTick是什么？什么场景使用？原理是什么？为什么 Vue 要异步更新 DOM？
`nextTick` 在 Vue2 里是一个异步执行回调函数的方法，它的作用是：**在下一次 DOM 更新循环结束之后执行回调**。

因为在 Vue 中，数据变化不会立刻反映到 DOM 上，Vue 会对数据更新做**异步队列合并**，把同一事件循环内的多次数据修改合并成一次 DOM 更新。  

所以有时候我们改完数据，立刻去访问 DOM，会拿到旧的内容。  
这时候就需要把操作放到 `nextTick` 里，等 DOM 更新完成后再执行。

举个常见的例子，比如我们在修改数据之后，需要马上获取更新后的元素高度，就需要在 `this.$nextTick` 里获取。

Vue2 的 `nextTick` 底层是通过微任务优先（Promise、MutationObserver）,
如果环境不支持再降级到**宏任务**(setTimeout)，确保在 DOM 更新完成后再调用回调。

Vue 异步更新 DOM 可以避免重复渲染，提升性能。  
如果每次数据变动都更新 DOM，会造成性能浪费。  
Vue 通过异步队列把多次修改合并成一次批量更新。

## 8. Vue2 中 key 的原理
在 Vue2 里，key 的作用是 **给虚拟 DOM 的每个节点做唯一标识**，它的核心原理是：在**虚拟 DOM diff 过程中**，通过比较新旧节点的 key 来判断节点是否相同。

如果两个节点的 key 相同，**Vue 会复用旧节点**，只更新必要的内容；
如果 key 不同，就会认为是**全新的节点**，销毁旧的、创建新的，从而触发完整的渲染。

这样做的好处是提高 DOM 更新效率，减少不必要的**重绘**和**重排**。

比如在 `v-for` 循环中必须加 `key`，否则 Vue 会默认按顺序复用旧节点，导致组件状态混乱或动画异常。

另外，`key` 最好使用具有业务唯一性的值，比如 `id`，不建议用 `index`，因为当列表顺序变化时，index 会变化，导致 DOM 复用错误或重新渲染。

总结来说，`key` 是虚拟 DOM `diff` 的优化标识，通过唯一标识来让 Vue 更精准地复用节点，提高性能并保持状态正确。

## 9. Vue2 中的自定义指令

### 自定义指令中的钩子函数

* bind：只调用一次，指令第一次绑定到元素时调用。在这里可以进行一次性的初始化设置。
* inserted：被绑定元素插入父节点时调用 (仅保证父节点存在，但不一定已被插入文档中) 。
* update：所在组件的 `VNode` 更新时调用，但是可能发生在其子 `VNode` 更新之前。指令的值可能发生了改变，也可能没有。但是你可以通过比较更新前后的值来忽略不必要的模板更新。
* componentUpdated：指令所在组件的 `VNode` 及其子 `VNode` 全部更新后调用
* unbind：只调用一次，指令与元素解绑时调用

    所有的钩子函数的参数都有以下：
    * el：指令所绑定的元素，可以用来直接操作 DOM
    * binding：一个对象，包含以下属性：
        * name：指令名，不包括 `v-` 前缀。
        * value：指令的绑定值，例如：`v-my-directive="1 + 1"` 中，绑定值为 2
        * oldValue：指令绑定的前一个值，仅在 `update` 和 `componentUpdated` 钩子中可用。无论值是否改变都可用。
        * expression：字符串形式的指令表达式。例如 `v-my-directive="1 + 1"` 中，表达式为 `"1 + 1"`
        * arg：传给指令的参数，可选。例如 `v-my-directive:foo` 中，参数为 `"foo"`
        * modifiers：一个包含修饰符的对象。例如：`v-my-directive.foo.bar` 中，修饰符对象为 `{ foo: true, bar: true }`
    * vnode：Vue 编译生成的虚拟节点
    * oldVnode：上一个虚拟节点，仅在 update 和 componentUpdated 钩子中可用
### 使用场景 - 一键复制
```js
const vCopy = { //
  /*
    bind 钩子函数，第一次绑定时调用，可以在这里做初始化设置
    el: 作用的 dom 对象
    value: 传给指令的值，也就是我们要 copy 的值
  */
  bind(el, { value }) {
    el.$value = value; // 用一个全局属性来存传进来的值，因为这个值在别的钩子函数里还会用到
    el.handler = () => {
      // 动态创建 textarea 标签
      const textarea = document.createElement('textarea');
      // 将要 copy 的值赋给 textarea 标签的 value 属性
      textarea.value = el.$value;
      // 将 textarea 插入到 body 中
      document.body.appendChild(textarea);
      // 选中值并复制
      textarea.select();
      // textarea.setSelectionRange(0, textarea.value.length);
      const result = document.execCommand('Copy');
      document.body.removeChild(textarea);
    };
    // 绑定点击事件，就是所谓的一键 copy 啦
    el.addEventListener('click', el.handler);
  },
  // 当传进来的值更新的时候触发
  componentUpdated(el, { value }) {
    el.$value = value;
  },
  // 指令与元素解绑的时候，移除事件绑定
  unbind(el) {
    el.removeEventListener('click', el.handler);
  },
};

export default vCopy;
```

## 10. vue2中什么是虚拟DOM？为什么需要虚拟DOM？如何实现虚拟DOM？虚拟DOM的优缺点？
### 什么是虚拟DOM
在 Vue2 里，虚拟 DOM（Virtual DOM） 其实就是用 JavaScript 对象 来描述真实 DOM 结构的一种抽象表示。  

Vue 会在内存中根据组件的模板生成一棵虚拟 DOM 树，每个节点都是一个普通的 JS 对象，
比如包含标签名、属性、子节点等信息。

### 为什么需要
我们之所以需要虚拟 DOM，是因为 **直接操作真实 DOM 的性能开销很大**，DOM 是浏览器提供的接口，每次修改都会引起重绘和回流。

而 Vue 通过虚拟 DOM，可以在内存中先做**批量的 diff 对比**，找出真正变化的部分，再有选择地更新到页面上，这样能显著提升性能、同时让跨平台渲染更灵活（比如可以渲染到小程序或 Native）。

### 如何实现
至于实现原理，大致分三步：
1. 把模板编译成 render 函数；
2. 执行 render 生成虚拟 DOM（VNode）；
3. 当数据变化时，用 `diff` 算法 比较新旧虚拟 DOM，只更新变化的节点到真实 DOM。

简单来说，虚拟 DOM 就是“用 JS 模拟 DOM，用 diff 算法找不同，再高效更新”，它不是比真实 DOM 快，而是让 DOM 更新变得“更聪明、更可控”。

### 优缺点
#### 优点
* 保证性能下限  
    框架的虚拟 DOM 需要适配任何上层 API 可能产生的操作，它的一些 DOM 操作的实现必须是普遍适应的，所以它的性能并不是最优的；但是比起粗暴的 DOM 操作性能要好很多，因此框架的虚拟 DOM 至少可以保证在你不需要手动优化的情况下，依然可以提供还不错的性能，即保证性能的下限

* 无需手动操作 DOM  
    我们不再需要手动去操作 DOM，只需要写好 View-Model 的代码逻辑，框架会根据虚拟 DOM 和 数据双向绑定，帮我们以可预期的方式更新视图，极大提高我们的开发效率

* 跨平台  
    虚拟 DOM 本质上是 JavaScript 对象,而 DOM 与平台强相关，相比之下虚拟 DOM 可以进行更方便地跨平台操作，例如服务器渲染、weex 开发等等

#### 缺点
* 无法进行极致优化  
    虽然虚拟 DOM + 合理的优化，足以应对绝大部分应用的性能需求，但在一些性能要求极高的应用中虚拟 DOM 无法进行针对性的极致优化

## 11. Vue 的 diff 算法具体怎么比较虚拟 DOM？
Vue 的 diff 算法主要是在**虚拟 DOM 更新阶段**用来比较新旧两棵虚拟 DOM 树，目的是**找出最小的差异，然后只更新必要的部分**。

Vue2 的 diff 算法采用的是一种 **同层比较、深度优先、双端对比** 的策略。

它不会把整棵树重新对比，而是：
1. 从根节点开始，只比较同一层级的节点；
2. 如果节点类型（比如标签名）不同，直接替换整个节点；
3. 如果节点类型相同，就复用旧节点，只比较属性和子节点；
4. 在子节点比较时，使用**双端指针法**——同时从头尾两边往中间对比，通过 key 快速定位、移动或复用节点，从而提高性能。

最终，diff 算法会生成一系列最小化的 DOM 操作补丁（patch），再由 patch 函数把这些改动一次性应用到真实 DOM 上。

总结来说，Vue 的 diff 算法不是暴力全量比较，而是**在保持正确性的前提下尽可能减少操作量**，
用 `key` 辅助节点复用，最大化性能。

## 12. computed 和 watch 的区别和运用的场景？

### 区别
* computed: 是计算属性，依赖多个响应式数据计算出一个新值，并且 computed 的值有缓存，只有当依赖的数据发生变化时才会重新计算，否则会直接返回缓存的结果，性能更高。
* watch：则用于**观察某个数据的变化并执行副作用逻辑**，比如发送请求、操作 DOM、手动更新其他数据等。它更像一个监听回调函数。

### 场景
* computed：据用户输入动态计算显示结果
* watch: 在数据变化时调用接口或写入本地存储

## 13. 父组件可以监听到子组件的生命周期吗？
### 子组件使用 `$emit`
### 父组件使用 `@hook` 监听
```js
//  Parent.vue
<Child @hook:mounted="doSomething" ></Child>

doSomething() {
   console.log('父组件监听到 mounted 钩子函数 ...');
},
    
//  Child.vue
mounted(){
   console.log('子组件触发 mounted 钩子函数 ...');
},    
    
// 以上输出顺序为：
// 子组件触发 mounted 钩子函数 ...
// 父组件监听到 mounted 钩子函数 ...     
```

## 14. 谈谈你对 keep-alive 的了解
`keep-alive` 是 Vue 内置的一个组件，可以使被包含的组件保留状态，避免重新渲染 ，有以下特性：
* 一般结合路由和动态组件一起使用，用于缓存组件
* 提供 `include` 和 `exclude` 属性，两者都支持字符串或正则表达式， `include` 表示只有名称匹配的组件会被缓存，`exclude` 表示任何名称匹配的组件都不会被缓存 ，其中 `exclude` 的优先级比 `include` 高
* 对应两个钩子函数 `activated` 和 `deactivated` ，当组件被激活时，触发钩子函数 `activated`，当组件被移除时，触发钩子函数 `deactivated`