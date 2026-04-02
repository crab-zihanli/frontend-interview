# React Fiber 架构与调度

## 为什么需要 Fiber？

React 15 及之前使用**递归（Stack Reconciler）**遍历整棵虚拟 DOM 树做 Diff。递归的特点是：
- 一旦开始就无法中途暂停
- 对于节点很多的大型页面，一次 Diff 可能要几十毫秒甚至上百毫秒
- 这期间主线程被完全占用，用户的输入和动画无法响应（超过 16ms 就会掉帧）

```
Stack Reconciler（旧）：
A
├── B
│   ├── D
│   └── E   ← 递归到这里，不能停，必须跑完整棵树
└── C
    └── F
```

**Fiber 的解决方案**：把递归遍历改造成**可中断的迭代遍历**，将渲染工作切成一个个小任务（Fiber 单元），可以在任务之间暂停、恢复、丢弃，甚至给不同任务分配优先级。

---

## 一、Fiber 节点的数据结构

每个组件/DOM 元素对应一个 Fiber 节点，它是一个普通 JavaScript 对象：

```js
const fiber = {
  // ─── 组件信息 ───────────────────────────────
  tag: FunctionComponent,     // 组件类型（函数组件/类组件/Host节点等）
  type: MyComponent,          // 组件函数或 DOM 标签字符串
  key: null,                  // Diff 用的 key

  // ─── 树形指针 ───────────────────────────────
  return: parentFiber,        // 父节点
  child: firstChildFiber,     // 第一个子节点
  sibling: nextSiblingFiber,  // 下一个兄弟节点

  // ─── 状态与副作用 ────────────────────────────
  memoizedState: hookList,    // 函数组件的 Hook 链表 / 类组件的 state
  memoizedProps: {},          // 上次渲染的 props
  pendingProps: {},           // 本次渲染的 props
  flags: Update,              // 标记：需要插入/更新/删除

  // ─── 双缓冲 ─────────────────────────────────
  alternate: currentFiber,    // 指向对应的另一棵树的节点（见双缓冲）

  // ─── 调度 ───────────────────────────────────
  lanes: NoLanes,             // 优先级信息（Lane 模型）
  updateQueue: null,          // 待处理的更新队列
};
```

### Fiber 树的链表结构

Fiber 用**父节点 + 第一个子节点 + 兄弟节点**三个指针构成树，但遍历方式是**链表迭代**而非递归：

```
        A
       / \
      B   C
     / \
    D   E

Fiber 指针：
A.child → B
B.return → A,  B.child → D,  B.sibling → C
D.return → B,  D.sibling → E
C.return → A
E.return → B

遍历顺序（深度优先）：A → B → D → E → C
```

---

## 二、双缓冲技术（Double Buffering）

React 同时维护两棵 Fiber 树：

```
          current tree（当前展示的树）
               ↕  alternate 指针互指
     work-in-progress tree（正在构建的新树）
```

- **current tree**：代表当前屏幕上展示的内容。
- **work-in-progress tree**：正在后台构建的新树，基于 current tree + 新的更新计算出来。

当 work-in-progress 树构建完成并提交后，两棵树互换角色：原来的 current 树变成下次更新的 work-in-progress 树（复用节点对象，减少内存分配）。

```
初始状态：current → [A v1]

setState 触发更新：
  work-in-progress → [A v2]（基于旧 current 构建）
  current → [A v1]（暂时还在展示）

Commit 完成：
  current → [A v2]（新树变成 current，展示到屏幕）
  （旧 current [A v1] 变成下次的 wip 模板）
```

**类比**：图形编程里的双缓冲：在内存里渲染好整帧画面，再一次性切换到屏幕，避免画面撕裂（闪烁）。

---

## 三、工作循环（Work Loop）

Fiber 架构的核心是**工作循环**，它在 Scheduler（调度器）分配的时间片内执行 Fiber 工作单元：

```js
// 伪代码，简化版
function workLoop(deadline) {
  while (nextFiber !== null && deadline.timeRemaining() > 0) {
    // 处理一个 Fiber 单元，返回下一个要处理的 Fiber
    nextFiber = performUnitOfWork(nextFiber);
  }

  if (nextFiber !== null) {
    // 时间片用完但还没处理完，让出主线程，等下一个时间片
    requestIdleCallback(workLoop);
  } else {
    // 全部处理完了，进入 Commit 阶段
    commitRoot();
  }
}
```

> React 实际使用的是自己实现的 Scheduler，用 `MessageChannel` 模拟 `requestIdleCallback`（因为 `requestIdleCallback` 兼容性差且精度不足）。

### performUnitOfWork：处理单个 Fiber

```
入口：beginWork(fiber)
  ↓
  对比新旧 props，决定是否渲染子组件
  调用组件函数（函数组件）或 render 方法（类组件）
  创建子 Fiber 节点（Diff 发生在这里）
  ↓
如果有子节点 → 返回子节点（继续深入）
如果没有子节点 → completeWork(fiber)
  ↓
  处理 DOM 节点、收集副作用标记
  ↓
如果有兄弟节点 → 返回兄弟节点
如果没有 → 返回父节点（向上回溯），触发父节点的 completeWork
```

---

## 四、渲染的两个阶段

### Render Phase（可中断）

从根节点开始，深度优先遍历整棵树，对每个 Fiber 节点执行 `beginWork` 和 `completeWork`，完成：
- 调用组件函数
- Diff 新旧 Fiber 树
- 收集副作用标记（flags）

这个阶段**可以被中断**，被打断后可以从中间某个 Fiber 节点恢复，也可以直接从头重新开始（对于低优先级任务）。

> 这也是为什么函数组件必须是纯函数（无副作用）：Render Phase 可能被执行多次！

### Commit Phase（不可中断）

分三个子阶段，**同步**执行，不可中断：

```
Before Mutation Phase
  执行 getSnapshotBeforeUpdate（类组件）
  调度 useEffect 的清理函数

Mutation Phase
  实际操作 DOM：插入/更新/删除节点
  更新 ref

Layout Phase
  执行 useLayoutEffect（同步）
  更新 current 树指针（双缓冲切换）

            ↓ （异步，在浏览器绘制之后）

Passive Effects
  执行 useEffect 的清理函数
  执行 useEffect 回调
```

---

## 五、优先级与 Lane 模型

### 为什么需要优先级？

不同的更新对用户的紧迫程度不同：
- 用户输入（typing）：必须立即响应，延迟超过 100ms 就有卡顿感
- 动画：要在下一帧前完成（16ms）
- 数据请求后的 UI 更新：可以稍等
- 屏幕外的预渲染：最低优先级

### Lane 模型

React 18 用 **Lane（车道）** 来表示优先级，本质是一个 31 位的二进制数，每个"车道"代表一类优先级：

```
SyncLane            = 0b0000000000000000000000000000001  ← 最高优先级（同步）
InputContinuousLane = 0b0000000000000000000000000000100  ← 用户连续输入
DefaultLane         = 0b0000000000000000000000000010000  ← 默认
TransitionLane      = 0b0000000000000000000001000000000  ← useTransition 标记的更新
IdleLane            = 0b0100000000000000000000000000000  ← 空闲
```

用位运算可以高效地合并、比较多个优先级：

```js
// 检查是否有某个 lane
const hasLane = (lanes & lane) !== NoLanes;

// 合并 lanes
const mergedLanes = lanes1 | lanes2;
```

### 优先级调度流程

```
setState 触发更新
      ↓
根据触发来源分配 Lane（用户输入 → InputContinuousLane，普通更新 → DefaultLane）
      ↓
Scheduler 根据 Lane 决定任务优先级
      ↓
高优先级任务可以中断正在进行的低优先级渲染
      ↓
低优先级任务等待，在高优先级任务完成后恢复
```

---

## 六、时间切片（Time Slicing）

时间切片是 Concurrent Mode 的基础实现机制：把长任务切成 ≤5ms 的小片，在每片之间让出主线程。

```
没有时间切片（旧）：
|─────────────────────────渲染任务（50ms）──────────────────────────|
↑                                                                   ↑
帧开始                                                           帧结束（掉帧！）

有时间切片（新）：
|──5ms──|让出|──5ms──|让出|──5ms──|让出|──5ms──|让出|──5ms──|让出|...
         ↑            ↑            ↑
         浏览器可以在这里处理用户输入、执行动画等高优先级任务
```

---

## 七、Suspense 与并发特性

### Suspense

`Suspense` 允许组件"等待"异步数据，同时展示 fallback UI：

```jsx
<Suspense fallback={<Spinner />}>
  <LazyComponent />    {/* 动态加载的组件 */}
</Suspense>
```

底层机制：当子组件抛出一个 Promise（"挂起"），React 捕获这个 Promise，展示 fallback；Promise resolve 后，React 重新渲染该子组件。

### React.lazy（懒加载组件）

```jsx
const LazyPage = React.lazy(() => import('./Page'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyPage />
    </Suspense>
  );
}
```

`import()` 是动态导入语法，Webpack/Vite 会将 `Page` 组件打包成独立 chunk，按需加载，减小首包体积。

---

## 面试官怎么问

### Q1: 什么是 React Fiber？为什么要引入它？

**参考回答：**

React Fiber 是 React 16 重写的核心协调算法。引入原因是旧的 Stack Reconciler 用递归遍历虚拟 DOM 树，一旦开始就无法中断，长时间计算会阻塞主线程，导致页面卡顿。

Fiber 把每个组件单元抽象成一个 Fiber 节点（JS 对象），通过链表结构将树的遍历从递归改为可中断的迭代。Fiber 节点上记录了工作进度，可以在任何时机暂停，让出主线程处理用户交互，之后再恢复。这是 Concurrent Mode（并发模式）的基础。

### Q2: Fiber 的双缓冲机制是什么？

**参考回答：**

React 同时维护两棵 Fiber 树：current 树（当前屏幕展示的）和 work-in-progress 树（正在计算的新树）。两棵树的节点通过 `alternate` 指针互相引用。

当更新发生时，React 在 work-in-progress 树上进行 Diff 和状态计算，current 树保持不变（用户看到的画面稳定）。Commit 阶段完成后，将 work-in-progress 树切换为新的 current 树，对应的旧 current 树变成下次更新的 work-in-progress 模板（复用对象减少 GC 压力）。

这类似于图形编程中的双缓冲——在内存里准备好整帧，再一次性切换，避免画面闪烁。

### Q3: Render Phase 和 Commit Phase 各自做什么？为什么 Render Phase 可以中断但 Commit Phase 不行？

**参考回答：**

**Render Phase（调和阶段）**：调用组件函数/render 方法，构建 work-in-progress Fiber 树，做 Diff 比较，收集副作用标记。这个阶段是纯计算，不操作真实 DOM，所以可以中断、恢复、甚至丢弃重来，不会影响用户看到的页面。

**Commit Phase（提交阶段）**：根据 Render Phase 产出的副作用列表，同步操作真实 DOM（插入/更新/删除节点），执行 `useLayoutEffect`，切换双缓冲树。这个阶段必须一次性完成，因为中途 DOM 更新了一半，会导致用户看到不一致的界面（撕裂）。

### Q4: React 的优先级机制（Lane 模型）是什么？

**参考回答：**

React 18 使用 Lane 模型来管理更新优先级。Lane 是一个 31 位二进制数，不同的位代表不同优先级的"车道"，通过位运算可以高效地合并和比较多个任务的优先级。

用户输入对应 SyncLane（最高），`useTransition` 标记的更新对应 TransitionLane（较低），后台预渲染对应 IdleLane（最低）。Scheduler 根据 Lane 决定先执行哪些任务，高优先级任务可以中断正在执行的低优先级渲染任务。
