# React Hooks 深入

## 为什么需要 Hooks？

React 16.8（2019年）之前，函数组件是"无状态组件"，有状态的逻辑只能写在类组件里。类组件有几个痛点：

1. **逻辑难以复用**：相关逻辑散落在 `componentDidMount`、`componentDidUpdate`、`componentWillUnmount` 等不同生命周期中，想复用只能用 HOC（高阶组件）或 Render Props，代码嵌套层级深（"Wrapper Hell"）。
2. **`this` 指向问题**：类组件中 `this` 需要手动 bind，容易出 bug。
3. **大组件难拆分**：同一个功能（比如订阅数据）的逻辑必须分散在多个生命周期里。

Hooks 让函数组件拥有了状态和副作用能力，同时通过**自定义 Hook** 让逻辑复用变得简单。

---

## Hooks 的两条规则

> React 对 Hooks 的调用顺序有严格要求，这来自其内部实现机制。

**规则一：只在函数组件的顶层调用 Hook**

```jsx
// ❌ 错误：在条件/循环里调用
if (condition) {
  const [state, setState] = useState(0); // 违规
}

// ✅ 正确：始终在顶层
const [state, setState] = useState(0);
if (condition) {
  // 使用 state
}
```

**规则二：只在 React 函数组件或自定义 Hook 里调用 Hook**

不能在普通 JS 函数、类组件、或 React 的事件回调外部调用。

**为什么有这两条规则？**

React 在每个组件实例内部维护一个**链表（Hook 链表）**，每次渲染按调用顺序依次对应链表节点。如果 Hook 在条件分支里调用，顺序可能变化，导致当次渲染读到错误的 Hook 节点数据。

---

## 一、useState

### 基本用法

```jsx
const [state, setState] = useState(initialValue);
```

- `state`：当前状态值。
- `setState`：更新函数，调用后触发组件重新渲染。
- `initialValue`：初始值（只在第一次渲染时使用）。

### 函数式更新

当新 state 依赖旧 state 时，用函数式更新避免闭包陷阱：

```jsx
// ❌ 可能有闭包问题（count 是旧值）
setCount(count + 1);

// ✅ 用函数式更新，prev 是最新值
setCount(prev => prev + 1);
```

### 惰性初始化

初始值如果需要复杂计算，传函数而非值，避免每次渲染都执行：

```jsx
// ❌ 每次渲染都执行 expensiveCalc()
const [state, setState] = useState(expensiveCalc());

// ✅ 只在第一次渲染执行
const [state, setState] = useState(() => expensiveCalc());
```

### 内部原理

React 在组件对应的 Fiber 节点上维护一个 Hook 链表：

```
Fiber Node
  └── memoizedState (Hook 链表头)
        ├── useState Hook { memoizedState: 0, queue: {...}, next: → }
        ├── useState Hook { memoizedState: '', queue: {...}, next: → }
        └── useEffect Hook { ... }
```

每次调用 `setState`，React 把更新任务放入该 Hook 的更新队列，然后调度一次重新渲染。

---

## 二、useEffect

### 基本用法

```jsx
useEffect(() => {
  // 副作用逻辑（发请求、订阅、操作 DOM）

  return () => {
    // 清理函数（可选）：组件卸载或下次 effect 运行前执行
  };
}, [dependencies]); // 依赖数组
```

### 三种执行时机

```jsx
// 1. 每次渲染后都执行（无依赖数组）
useEffect(() => { doSomething(); });

// 2. 只在挂载时执行一次（空依赖数组）
useEffect(() => { fetchData(); }, []);

// 3. 依赖变化时执行
useEffect(() => { refetch(userId); }, [userId]);
```

### 执行时序

```
渲染（render）→ 浏览器绘制 → useEffect 执行
```

`useEffect` 是**异步**的，在浏览器完成绘制后才执行，不阻塞页面渲染。

### useLayoutEffect 的区别

```
渲染（render）→ useLayoutEffect 执行 → 浏览器绘制
```

`useLayoutEffect` 在 DOM 更新后、浏览器绘制前**同步**执行，适合需要读取 DOM 布局信息（比如元素尺寸）的场景。滥用会阻塞渲染，应优先用 `useEffect`。

### 依赖数组常见错误

```jsx
// ❌ 缺少依赖，userId 变了也不会重新 fetch
useEffect(() => {
  fetchUser(userId);
}, []); // userId 没加进依赖

// ✅ 正确
useEffect(() => {
  fetchUser(userId);
}, [userId]);
```

### 清理函数的重要性

```jsx
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);

  // ✅ 必须清理，否则组件卸载后 timer 还在跑，内存泄漏
  return () => clearInterval(timer);
}, []);
```

---

## 三、useRef

### 两个用途

**用途 1：访问 DOM 元素**

```jsx
function TextInput() {
  const inputRef = useRef(null);

  const focus = () => {
    inputRef.current.focus(); // 直接操作 DOM
  };

  return (
    <>
      <input ref={inputRef} />
      <button onClick={focus}>聚焦</button>
    </>
  );
}
```

**用途 2：保存跨渲染的可变值**

`useRef` 返回一个**可变的容器对象** `{ current: value }`，修改 `current` **不会触发重渲染**。

```jsx
function Timer() {
  const timerRef = useRef(null);
  const [count, setCount] = useState(0);

  const start = () => {
    timerRef.current = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
  };

  const stop = () => {
    clearInterval(timerRef.current);
  };

  return (
    <>
      <p>{count}</p>
      <button onClick={start}>开始</button>
      <button onClick={stop}>停止</button>
    </>
  );
}
```

### useState vs useRef

| | useState | useRef |
|--|----------|--------|
| 变化时重渲染 | ✅ 是 | ❌ 否 |
| 适合 | UI 相关数据 | 不需要展示的可变数据、DOM 引用 |

---

## 四、useMemo 与 useCallback

### useMemo：缓存计算结果

```jsx
const expensiveValue = useMemo(() => {
  return heavyCalculation(a, b); // 只在 a 或 b 变化时重新计算
}, [a, b]);
```

### useCallback：缓存函数引用

```jsx
const handleClick = useCallback(() => {
  doSomething(userId);
}, [userId]); // 只在 userId 变化时创建新函数
```

### 为什么需要缓存函数引用？

```jsx
// 每次 Parent 渲染，handleClick 都是新函数（引用不同）
// 即使 Child 用了 React.memo，也会因为 onClick 变化而重渲染
function Parent() {
  const handleClick = () => console.log('click'); // ← 新引用
  return <Child onClick={handleClick} />;
}

// ✅ useCallback 保证引用稳定
function Parent() {
  const handleClick = useCallback(() => console.log('click'), []);
  return <Child onClick={handleClick} />;
}
```

### 使用原则

**不要滥用**。`useMemo`/`useCallback` 本身有开销（存储缓存、比较依赖）。只在以下情况使用：
- 计算逻辑确实耗时
- 需要保持引用稳定（配合 `React.memo` 或作为其他 Hook 的依赖）

---

## 五、useContext

### 基本用法

用于跨层级传递数据，避免 "Props Drilling"（层层传递 props）。

```jsx
// 1. 创建 Context
const ThemeContext = createContext('light');

// 2. Provider 提供值
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Header />   {/* Header 里的深层组件可以直接拿到值 */}
    </ThemeContext.Provider>
  );
}

// 3. 任意子孙组件消费
function Button() {
  const theme = useContext(ThemeContext); // 'dark'
  return <button className={theme}>按钮</button>;
}
```

### 注意：Context 变化会重渲染所有消费者

```jsx
// ❌ 把大对象放进 Context，任何字段变化都会让所有消费者重渲染
<UserContext.Provider value={{ name, email, avatar, settings }}>

// ✅ 按需拆分 Context
<UserNameContext.Provider value={name}>
  <UserSettingsContext.Provider value={settings}>
```

---

## 六、useReducer

当 state 逻辑复杂、状态之间有关联时，`useReducer` 比多个 `useState` 更合适。

```jsx
// reducer 是纯函数：(state, action) => newState
function counterReducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'reset':
      return { count: 0 };
    default:
      throw new Error('Unknown action');
  }
}

function Counter() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });

  return (
    <>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </>
  );
}
```

`useReducer` + `useContext` 可以组合成轻量的全局状态管理方案，是 Redux 的简化版。

---

## 七、自定义 Hook

自定义 Hook 是**以 `use` 开头的普通函数**，可以调用其他 Hook。它是 React 逻辑复用的核心机制。

### 示例：封装请求逻辑

```jsx
// useFetch.js —— 自定义 Hook
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return { data, loading, error };
}

// 在任意组件中复用
function UserProfile({ userId }) {
  const { data, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <Spinner />;
  if (error) return <Error />;
  return <div>{data.name}</div>;
}
```

### 自定义 Hook 的本质

自定义 Hook **不共享状态**，每次调用都是独立的状态实例。它只是抽取了逻辑，让多个组件"使用相同的逻辑，但各自有独立的 state"。

---

## 八、Jotai：原子化状态管理

### 为什么需要状态管理库？

`useState` 管理局部状态，`useContext` 解决跨层级共享，但 Context 有性能问题（全量更新）。对于中大型应用的全局状态，需要专门的状态管理方案。

Jotai 是一个**轻量原子化（Atomic）状态管理库**，灵感来自 Recoil，比 Redux 轻量得多。

### 核心概念：Atom（原子）

```jsx
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

// 定义原子（可以在任何 .js 文件里，不需要 Provider）
const countAtom = atom(0); // 初始值为 0
const nameAtom = atom('Alice');
```

Atom 是最小的状态单元，类似于 useState，但是**全局共享**的——任何组件读取同一个 atom，都能拿到同一份数据。

### 使用原子

```jsx
function Counter() {
  // useAtom 同时返回值和 setter（类似 useState）
  const [count, setCount] = useAtom(countAtom);

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

function Display() {
  // useAtomValue：只读，不需要 setter 时用这个（性能更好）
  const count = useAtomValue(countAtom);
  return <span>当前值：{count}</span>;
}

function ResetButton() {
  // useSetAtom：只写，不订阅值变化（不会因为值变而重渲染）
  const setCount = useSetAtom(countAtom);
  return <button onClick={() => setCount(0)}>重置</button>;
}
```

### 派生 Atom（Derived Atom）

```jsx
const doubleCountAtom = atom((get) => get(countAtom) * 2);

// 可写的派生 Atom
const doubleCountAtom = atom(
  (get) => get(countAtom) * 2,        // getter
  (get, set, newValue) => set(countAtom, newValue / 2) // setter
);
```

### Jotai vs Redux vs Context

| | Jotai | Redux | useContext |
|--|-------|-------|------------|
| 学习曲线 | 低 | 高 | 无 |
| 样板代码 | 少 | 多 | 少 |
| 精细更新 | ✅ 原子级 | ✅（selector）| ❌ 全量 |
| DevTools | 基础支持 | 强大 | 无 |
| 适用场景 | 中小型应用 | 大型复杂应用 | 简单共享 |

### Jotai 的工作原理

Jotai 内部用 `WeakMap` 存储每个 atom 的值和订阅者列表。当 atom 更新时，只通知订阅了该 atom 的组件重渲染，避免了 Context 的"全量广播"问题。不需要 `Provider`（也可以选择加 `Provider` 做作用域隔离）。

---

## 面试官怎么问

### Q1: useEffect 和 useLayoutEffect 的区别？

**参考回答：**

两者都是在渲染后执行副作用，区别在于时机：
- `useEffect` 在浏览器**完成绘制后**异步执行，不阻塞渲染，适合大多数副作用（数据请求、订阅等）。
- `useLayoutEffect` 在 DOM 更新后、浏览器**绘制前**同步执行，适合需要读取 DOM 布局信息（元素尺寸、滚动位置）的场景。

应优先用 `useEffect`，`useLayoutEffect` 滥用会导致渲染阻塞。

### Q2: useMemo 和 useCallback 的区别？什么时候用？

**参考回答：**

`useMemo` 缓存**计算结果**，`useCallback` 缓存**函数引用**，本质上 `useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`。

使用时机：
- 计算逻辑耗时，需要避免重复计算 → `useMemo`
- 将函数作为 props 传给被 `React.memo` 包裹的子组件，或作为其他 Hook 的依赖 → `useCallback`

不要为了"性能优化"无脑加这两个 Hook，它们本身有存储和比较的开销，滥用反而可能更慢。

### Q3: 如何避免 useEffect 里的闭包陷阱？

**参考回答：**

闭包陷阱指的是 effect 里的函数捕获了旧的 state/props 值。解决方案：

1. **把依赖加入依赖数组**：这是最直接的方式。
2. **用函数式更新**：`setState(prev => prev + 1)` 不依赖闭包里的 state。
3. **用 `useRef` 保存最新值**：

```jsx
const latestCountRef = useRef(count);
useEffect(() => { latestCountRef.current = count; }); // 每次渲染同步最新值

useEffect(() => {
  const timer = setInterval(() => {
    // 通过 ref 读取最新值，而非闭包里的旧值
    console.log(latestCountRef.current);
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### Q4: 为什么 Hooks 不能在条件语句里调用？

**参考回答：**

React 在组件的 Fiber 节点上以**链表形式**按顺序存储每个 Hook 的状态。每次渲染，React 按照调用顺序依次匹配链表节点。如果 Hook 在条件分支里调用，某次渲染跳过了某个 Hook，后续所有 Hook 的顺序就错了，会读到错误的状态，导致 bug。

### Q5: 自定义 Hook 是什么？它和普通函数有什么区别？

**参考回答：**

自定义 Hook 是以 `use` 开头的函数，内部可以调用其他 Hook。普通函数不能调用 Hook（只有在 React 函数组件或 Hook 里才能调用 Hook）。

自定义 Hook 的核心价值是**逻辑复用**——把"有状态的逻辑"抽取出来，在多个组件间复用，而不共享 state（每次调用都有独立的状态实例）。这比类组件时代的 HOC、Render Props 方案更简洁，没有额外的组件层级嵌套。
