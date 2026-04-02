# React 渲染与调和

## 什么是渲染（Render）？

在 React 里，"渲染"有两层含义，必须区分清楚：

1. **React 渲染**（Render Phase）：React 调用你的组件函数，生成新的虚拟 DOM 树（Fiber 树）的过程。**这不是真正的 DOM 更新**，只是内存里的计算。
2. **提交**（Commit Phase）：React 把计算出的差量变更实际应用到真实 DOM 的过程。

```
触发渲染（setState / forceUpdate / Context 变化）
          ↓
    Render Phase（调和 / Reconciliation）
    React 重新调用组件函数
    对比新旧 Fiber 树（Diff）
    标记需要更新的节点
          ↓
    Commit Phase
    把变更应用到真实 DOM
    执行副作用（useEffect / useLayoutEffect）
```

---

## 一、触发渲染的条件

组件会在以下情况重新渲染：

1. **自身 state 变化**：`setState` 被调用
2. **父组件重新渲染**：默认情况下，父组件渲染时，所有子组件也会重新渲染（即使 props 没变）
3. **Context 变化**：消费了某个 Context 的组件，Context 值变化时重渲染
4. **forceUpdate**（类组件）

### 一个常见误区

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <Child />  {/* ← count 变化时，Child 也会重新渲染！即使 Child 没用到 count */}
    </>
  );
}
```

这是性能优化的切入点之一，详见后文的 `React.memo`。

---

## 二、调和（Reconciliation）与 Diff 算法

调和是 React 用来决定"哪些真实 DOM 需要更新"的过程。核心是对比新旧两棵虚拟 DOM 树，找出最小变更集。

### 为什么不做完整树对比？

完整的树形结构 Diff 算法复杂度是 O(n³)，对于一个有 1000 个节点的树需要十亿次操作，根本无法用于生产环境。

React 基于两个**启发式假设**把复杂度降到 O(n)：

### Diff 算法的三个策略

**策略一：同层比较（Tree Diff）**

React 只对比同一层级的节点，不跨层比较。如果节点位置从父层 A 移动到父层 B，React 不会识别为"移动"，而是删掉 A 下的节点，在 B 下新建。

```
旧树：A → [B, C]
新树：D → [B, C]    ← A 变成了 D

React 不会把 B、C 移动过去，而是删除旧的 B、C，在 D 下重新创建。
所以 DOM 结构频繁跨层移动会有性能损耗。
```

**策略二：类型相同才复用（Component Diff）**

对比同位置的组件时，如果类型（tag 名或组件函数）不同，直接销毁旧组件树，重建新组件树。

```jsx
// 旧：<Input />  →  新：<Select />
// React 不会尝试更新，而是卸载 Input，挂载 Select
```

**策略三：key 是列表节点的唯一标识（Element Diff）**

对比列表时，React 用 `key` 来匹配新旧节点：

```
旧列表：A(key=a)  B(key=b)  C(key=c)
新列表：C(key=c)  A(key=a)  B(key=b)  ← 顺序变化

不用 key：React 从左到右对比，位置 0 的 A→C、位置 1 的 B→A，全部更新
用 key：React 识别出只是顺序变了，复用已有节点，只做移动操作
```

这就是为什么列表渲染必须加 `key`，且 `key` 要唯一稳定。

---

## 三、React.memo 与性能优化

### React.memo

`React.memo` 是高阶组件，对函数组件做**浅比较（Shallow Comparison）**：如果 props 没变，跳过重渲染。

```jsx
const Child = React.memo(function Child({ name, count }) {
  console.log('Child 渲染');
  return <div>{name}: {count}</div>;
});

function Parent() {
  const [tick, setTick] = useState(0);
  return (
    <>
      <button onClick={() => setTick(t => t + 1)}>Tick: {tick}</button>
      {/* name 和 count 没变 → Child 不会重渲染 */}
      <Child name="Alice" count={0} />
    </>
  );
}
```

### 浅比较的局限

```jsx
// ❌ 每次 Parent 渲染，这个对象都是新引用，memo 失效
<Child config={{ theme: 'dark' }} />

// ✅ 用 useMemo 保持引用稳定
const config = useMemo(() => ({ theme: 'dark' }), []);
<Child config={config} />
```

### React.memo vs PureComponent

| | React.memo | PureComponent |
|--|------------|---------------|
| 适用 | 函数组件 | 类组件 |
| 比较方式 | props 浅比较 | props + state 浅比较 |
| 自定义比较 | 第二个参数传比较函数 | 重写 `shouldComponentUpdate` |

---

## 四、批量更新（Batching）

### 什么是批量更新？

多次 `setState` 调用会被合并成一次重渲染，而不是每次调用都触发一次渲染。

```jsx
function handleClick() {
  setCount(c => c + 1); // 不立即渲染
  setName('Alice');      // 不立即渲染
  // 函数执行完后，React 统一触发一次重渲染
}
```

### React 18 之前的批量更新限制

React 17 及之前，批量更新**只在 React 事件处理函数内有效**，在异步回调、原生事件、Promise 里不会批量处理：

```jsx
// React 17：这里不会批量，会触发两次渲染
setTimeout(() => {
  setCount(c => c + 1); // 触发一次渲染
  setName('Alice');      // 再触发一次渲染
}, 0);
```

### React 18 的自动批量更新（Automatic Batching）

React 18 默认对所有场景做批量更新：

```jsx
// React 18：setTimeout 里也会批量，只触发一次渲染
setTimeout(() => {
  setCount(c => c + 1);
  setName('Alice');
  // 只触发一次重渲染 ✅
}, 0);
```

如果你不想批量（比如你确实需要两次独立渲染），可以用 `flushSync`：

```jsx
import { flushSync } from 'react-dom';

flushSync(() => setCount(c => c + 1)); // 立即渲染
flushSync(() => setName('Alice'));      // 再立即渲染
```

---

## 五、Concurrent Mode 与可中断渲染

### 传统同步渲染的问题

React 18 之前，一旦开始渲染，就必须一口气跑完——主线程被 React 占用，用户交互无法响应，会感觉到卡顿（帧率下降）。

```
同步渲染（旧）：
[渲染开始.................................渲染结束]
                                             ↑ 用户输入在这里才能被处理（延迟感知）

并发渲染（Concurrent）：
[渲染开始][让出主线程][渲染继续][让出主线程][渲染继续]
              ↑ 用户输入在这里可以插入，立即响应
```

### Concurrent Mode

React 18 默认启用并发模式（使用 `createRoot` 而非 `render`）。并发模式的核心能力：

- **可中断渲染**：长任务可以被拆成小片，在每片之间检查是否有更高优先级的任务（如用户输入）。
- **优先级调度**：用户交互（高优先级）可以打断数据更新（低优先级）。

### useTransition

```jsx
const [isPending, startTransition] = useTransition();

// 把"不紧急"的状态更新标记为低优先级
startTransition(() => {
  setSearchResults(computeExpensiveResults(input));
});

// 高优先级更新（用户输入）不受影响
setInputValue(input);
```

### useDeferredValue

```jsx
const deferredValue = useDeferredValue(heavyValue);
// deferredValue 会延迟更新，等空闲时才同步，优先保证 UI 响应性
```

---

## 六、StrictMode

`<React.StrictMode>` 是开发环境工具，不影响生产环境。它会：

1. **故意调用组件函数两次**，帮助发现副作用（注意：只在开发模式下）
2. **故意执行 Effect 两次**（mount → unmount → mount），检测是否正确清理
3. 检测过时 API 的使用

```jsx
// index.js
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

如果你在 StrictMode 下看到请求发了两次，这是正常的开发行为，说明你的副作用需要正确清理。

---

## 七、错误边界（Error Boundary）

React 应用中某个组件抛出错误，默认会导致**整个组件树卸载**（白屏）。错误边界可以捕获子树中的错误，展示降级 UI。

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logErrorToService(error, info); // 上报错误
  }

  render() {
    if (this.state.hasError) {
      return <h2>出错了，请刷新重试。</h2>;
    }
    return this.props.children;
  }
}

// 使用
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

> 注意：错误边界目前**只能是类组件**（还没有 Hook 版本），但你可以把类组件封装好直接用。

---

## 面试官怎么问

### Q1: React 的渲染机制是什么？setState 之后发生了什么？

**参考回答：**

调用 `setState` 后：
1. React 把这次更新放入更新队列，调度一次重新渲染（React 18 默认并发模式下会按优先级调度）。
2. **Render Phase（调和阶段）**：React 调用组件函数，生成新的 Fiber 树，与旧 Fiber 树做 Diff，标记出需要增删改的节点（Effect List）。这个阶段可以被中断。
3. **Commit Phase（提交阶段）**：React 遍历 Effect List，将变更同步应用到真实 DOM，然后执行 `useLayoutEffect`，最后异步执行 `useEffect`。这个阶段不可中断。

### Q2: React 的 Diff 算法是如何工作的？复杂度是多少？

**参考回答：**

React 的 Diff 基于三个启发式策略，将 O(n³) 降至 O(n)：
1. **同层比较**：只对比同一层级的节点，不跨层。
2. **类型不同则销毁重建**：组件类型变了就不复用，直接重建。
3. **key 标识列表节点**：用 key 在列表中复用节点，避免全量更新。

### Q3: React 18 的 Concurrent Mode 解决了什么问题？

**参考回答：**

旧版 React 的渲染是同步不可中断的，长时间渲染任务会阻塞主线程，导致用户交互（输入、点击）无法及时响应，页面卡顿。

Concurrent Mode 让渲染过程可以被中断和恢复，引入了优先级调度：用户交互（高优先级）可以打断后台数据更新（低优先级），等空闲时再继续被打断的渲染。通过 `useTransition` 和 `useDeferredValue` 可以显式标记低优先级更新。

### Q4: 什么情况下组件会重新渲染？如何避免不必要的渲染？

**参考回答：**

触发重渲染的条件：自身 state/context 变化；父组件重渲染（默认会带着子组件一起渲染，即使 props 没变）。

避免不必要渲染的手段：
- `React.memo`：包裹函数组件，props 浅比较相同时跳过渲染
- `useMemo`：缓存计算结果，避免重复计算
- `useCallback`：缓存函数引用，配合 `React.memo` 防止子组件无谓重渲染
- 合理拆分 Context，避免大 Context 导致大范围重渲染
- `useTransition` / `useDeferredValue`：把低优先级更新推迟，保证高优先级交互流畅
