# React 基础与核心概念

## 为什么要学 React？

React 是目前国内前端岗位招聘频率最高的框架之一。它的核心思想是 **UI = f(state)**——界面是状态的函数，状态变了界面自动更新。理解这一点，再去理解 React 的所有设计都会水到渠成。

---

## 一、JSX 是什么？

### 本质

JSX 是 JavaScript 的语法扩展，让你可以在 JS 文件里写"类 HTML"的代码。它**不是**字符串，也**不是** HTML，而是语法糖。

```jsx
// 你写的 JSX
const element = <h1 className="title">Hello, React</h1>;

// Babel 编译后（React 17 之前）
const element = React.createElement('h1', { className: 'title' }, 'Hello, React');

// React 17+ 新的 JSX Transform（不需要手动 import React）
import { jsx as _jsx } from 'react/jsx-runtime';
const element = _jsx('h1', { className: 'title', children: 'Hello, React' });
```

### React.createElement 做了什么？

它返回一个普通 JS 对象（虚拟 DOM 节点）：

```js
{
  type: 'h1',
  props: {
    className: 'title',
    children: 'Hello, React'
  },
  key: null,
  ref: null
}
```

这个对象就是**虚拟 DOM（Virtual DOM）**，React 用它来描述"屏幕上应该有什么"。

---

## 二、虚拟 DOM（Virtual DOM）

### 为什么需要虚拟 DOM？

直接操作真实 DOM 有两个问题：
1. **DOM 操作昂贵**：真实 DOM 节点是浏览器内核里的 C++ 对象，读写属性会触发跨语言调用，性能差。
2. **难以批量优化**：手动 DOM 操作散落各处，很难做到"批量合并更新"。

虚拟 DOM 是轻量的 JS 对象，操作成本极低。React 在内存中先计算出"新的虚拟 DOM 树"，再与"旧的虚拟 DOM 树"做 **Diff（差量比较）**，最后把最小的变更集应用到真实 DOM。

### 虚拟 DOM 不一定更快

> "虚拟 DOM 比直接操作 DOM 快"——这句话是**误导性的**。

- 虚拟 DOM 本身有 Diff 计算的开销。
- 如果你手动精确地操作 DOM（比如只改一个文本节点），直接操作比虚拟 DOM 快。
- 虚拟 DOM 的优势是：**开发体验好 + 大多数场景下性能足够好**，让你不用手动优化 DOM 操作。

---

## 三、组件：函数组件 vs 类组件

### 函数组件（Function Component）

```jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

// 箭头函数写法（常见）
const Welcome = ({ name }) => <h1>Hello, {name}</h1>;
```

### 类组件（Class Component）

```jsx
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

### 两者的核心区别

| 维度 | 函数组件 | 类组件 |
|------|----------|--------|
| **状态** | `useState` Hook | `this.state` |
| **生命周期** | `useEffect` Hook | `componentDidMount` 等 |
| **`this`** | 无 `this` 问题 | 需要 bind 或箭头函数 |
| **性能** | 更轻量（只是函数调用）| 实例化有额外开销 |
| **代码复用** | 自定义 Hook | HOC / Render Props |
| **官方推荐** | ✅ 推荐 | 不推荐新代码使用 |

**React 16.8（2019年）引入 Hooks 后，函数组件可以完全替代类组件**，官方明确推荐使用函数组件。

---

## 四、Props 与 State

### Props（属性）

- 从父组件传入，**只读**，子组件不能修改。
- 类比：函数的参数。

```jsx
// 父组件传入 props
<UserCard name="Alice" age={25} />

// 子组件接收
function UserCard({ name, age }) {
  return <div>{name} - {age}</div>;
}
```

### State（状态）

- 组件内部的可变数据，由组件自己管理。
- **State 变化会触发组件重新渲染**。

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0); // 初始值为 0

  return (
    <button onClick={() => setCount(count + 1)}>
      点击了 {count} 次
    </button>
  );
}
```

### 关键原则：State 是不可变的

```jsx
// ❌ 错误：直接修改 state
this.state.count = 1;
state.list.push(item);

// ✅ 正确：用新值替换
setCount(1);
setList([...list, item]); // 创建新数组
```

为什么要不可变？React 通过**比较引用（===）**来判断状态是否变化。直接修改对象/数组的内容，引用没变，React 认为数据没变，不会重新渲染。

---

## 五、类组件生命周期

虽然新代码推荐函数组件，但面试仍会考类组件生命周期（理解原理用）。

```
挂载阶段（Mounting）
  constructor()
       ↓
  render()
       ↓
  componentDidMount()   ← 常用：发请求、订阅

更新阶段（Updating）—— props 或 state 变化触发
  render()
       ↓
  componentDidUpdate(prevProps, prevState)  ← 常用：响应变化

卸载阶段（Unmounting）
  componentWillUnmount()  ← 常用：清理定时器、取消订阅
```

### 函数组件的对应关系

```jsx
useEffect(() => {
  // 对应 componentDidMount（依赖数组为空时）
  fetchData();

  return () => {
    // 对应 componentWillUnmount
    cleanup();
  };
}, []); // 空数组 = 只在挂载/卸载时执行

useEffect(() => {
  // 对应 componentDidUpdate（依赖变化时执行）
  doSomething();
}, [dependency]); // dependency 变化时执行
```

---

## 六、受控组件 vs 非受控组件

### 受控组件（Controlled Component）

表单元素的值**由 React State 控制**。用户输入 → 触发事件 → 更新 State → React 重渲染 → 输入框显示新值。

```jsx
function Form() {
  const [value, setValue] = useState('');

  return (
    <input
      value={value}  // 值受 state 控制
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

### 非受控组件（Uncontrolled Component）

表单元素的值**由 DOM 自身管理**，React 通过 `ref` 在需要时读取值。

```jsx
function Form() {
  const inputRef = useRef(null);

  const handleSubmit = () => {
    console.log(inputRef.current.value); // 在需要时读取
  };

  return <input ref={inputRef} defaultValue="初始值" />;
}
```

| | 受控组件 | 非受控组件 |
|--|---------|---------|
| 数据来源 | React State | DOM |
| 实时验证 | 容易 | 难 |
| 与 React 集成 | 好 | 一般 |
| 简单场景 | 稍繁琐 | 简单 |

---

## 七、key 的作用

`key` 是 React 在列表渲染中用来**识别哪些元素发生了变化**的特殊属性。

```jsx
// ❌ 用 index 做 key（有问题）
{items.map((item, index) => (
  <Item key={index} data={item} />
))}

// ✅ 用稳定唯一 ID 做 key
{items.map((item) => (
  <Item key={item.id} data={item} />
))}
```

**为什么不能用 index 做 key？**

假设列表 `[A, B, C]`，用 index 作 key：`A(0), B(1), C(2)`。
如果在头部插入 `D`，列表变成 `[D, A, B, C]`，key 变为：`D(0), A(1), B(2), C(3)`。

React 看到 key=0 的组件从 A 变成了 D，认为 A 组件被"更新"了，会触发不必要的 DOM 操作，甚至导致**组件状态混乱**（比如输入框里的文字跟着输出框走）。

---

## 八、合成事件（Synthetic Event）

React 没有直接把事件监听器挂到每个 DOM 节点上，而是采用**事件委托**：

- React 17 之前：所有事件统一委托到 `document`。
- React 17 之后：改为委托到 React 挂载的根节点（`root`）。

```
用户点击按钮
      ↓
事件冒泡到 React 根节点
      ↓
React 拦截原生事件
      ↓
创建 SyntheticEvent（合成事件对象）
      ↓
按照 React 自己的事件系统分发给对应的 handler
```

**合成事件的优点：**
1. 跨浏览器兼容（屏蔽了浏览器差异）
2. 事件委托减少内存占用
3. 可以在 React 内部统一控制事件优先级（Concurrent Mode 需要）

**注意**：React 17 之后，合成事件不再复用（不再需要 `e.persist()`）。

---

## 九、单向数据流

React 的数据流是**单向的**：

```
父组件 State
      ↓  通过 props 传递
子组件
      ↓  子组件想改父组件数据，必须调用父组件传下来的回调函数
父组件 setState
```

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  return <Child count={count} onIncrement={() => setCount(c => c + 1)} />;
}

function Child({ count, onIncrement }) {
  return <button onClick={onIncrement}>{count}</button>;
}
```

单向数据流让数据变化可预测、易追踪。

---

## 面试官怎么问

### Q1: 虚拟 DOM 的原理是什么？它一定比直接操作 DOM 快吗？

**参考回答：**

虚拟 DOM 是用 JavaScript 对象来描述真实 DOM 结构的轻量副本。每次 state 更新，React 先在内存中构建新的虚拟 DOM 树，然后与旧树做 Diff 对比，找出最小变更集，最后批量更新真实 DOM。

虚拟 DOM 并不一定比直接操作 DOM 快。如果你手动、精确地操作 DOM（例如只改一个节点的文字），直接操作是最快的。虚拟 DOM 的优势在于：不需要手动管理 DOM 操作，开发体验好；在大多数场景下性能足够好，并且能做批量合并、跨平台渲染（React Native）等。

### Q2: 受控组件和非受控组件的区别？什么时候用哪个？

**参考回答：**

受控组件的值由 React State 驱动，每次输入都触发 setState，适合需要实时验证、联动、格式化输入的场景。非受控组件值存在 DOM 里，React 通过 ref 按需读取，适合简单表单、与第三方库集成、或文件上传等场景。

一般情况下优先用受控组件，因为与 React 的数据流更一致，调试方便。

### Q3: 为什么 setState 要传新对象而不能直接修改 state？

**参考回答：**

React 通过引用比较（`===`）来判断 state 是否变化，进而决定是否重新渲染。如果直接修改原对象（比如 `state.list.push(item)`），引用地址没变，React 认为 state 没有变化，不会触发重渲染，导致 UI 与数据不同步。

不可变数据还有一个好处：便于追踪历史状态（undo/redo 功能、时间旅行调试）。

### Q4: 为什么 key 不能用数组下标（index）？

**参考回答：**

key 是 React Diff 算法识别元素的唯一标识。用 index 做 key 时，如果列表顺序变化（比如头部插入、删除、排序），节点对应的 key 会错位，React 会做多余的 DOM 操作甚至搞错组件实例（带有内部状态的组件会状态混乱）。应该使用数据本身的稳定唯一 ID 作为 key。

### Q5: 函数组件和类组件的区别？

**参考回答：**

最本质的区别是：**函数组件每次渲染都是一次全新的函数调用**，它通过闭包捕获当次渲染的 props 和 state；而类组件的实例只有一个，通过 `this` 访问最新的 props 和 state，这会导致某些异步场景下 `this.props` 读到的是更新后的值（而非触发时的值），产生不直觉的 bug。

React 16.8 之后官方推荐函数组件 + Hooks，代码更简洁，逻辑复用更方便（自定义 Hook），没有 `this` 相关问题。
