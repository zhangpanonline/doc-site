---
sidebar_position: 4
---

## 1. React 组件有几种写法？分别有什么区别？
React 组件主要有两种写法：

### 1. 函数式组件（Function Component）

​	使用函数定义组件，返回 JSX。

​	React 16.8 之后可以用 Hooks（比如 useState、useEffect）来管理状态和生命周期。

​	代码更简洁，推荐使用。

### 2. 组件（Class Component）

​	使用 class 关键字继承 React.Component。

​	通过 this.state 管理状态，生命周期函数如 componentDidMount。

​	以前是主要写法，现在逐渐被函数组件取代。

### 3. 补充

​	还可以区分 有状态组件（管理 state）和 无状态组件（纯展示 UI）。

​	React 官方推荐现在主要使用 函数式组件 + Hooks。

## 2.  **`useState` 和 `useEffect` 的作用是什么？能举一个实际使用的例子吗？**

### 1. useState

**作用**：`useState` 是 React 的一个 Hook，用来在函数组件中添加状态管理。它返回一个数组，第一项是当前的状态值，第二项是更新这个状态的函数。

```ts
const [count, setCount] = useState(0);
```

### 2. useEffect

**作用**：`useEffect` 是 React 的另一个 Hook，用来处理副作用，比如数据获取、订阅、手动更改 DOM 等。它会在组件渲染后执行，并且可以指定依赖项，当依赖项变化时才重新执行。

```ts
useEffect(() => {
  console.log('count has changed:', count);
}, [count]);
```



