# 事件循环（Event Loop）

## 为什么需要事件循环？

JavaScript 是**单线程**语言，同一时刻只能执行一段代码。但页面需要同时处理用户点击、网络请求、定时器……这些任务不可能"排队等主线程空闲"，不然页面就会完全卡死。

事件循环（Event Loop）就是 JS 引擎用来**调度任务执行顺序**的机制，让单线程的 JS 也能"看起来"并发处理多件事。

---

## 执行栈（Call Stack）

JS 代码执行时，会有一个**执行栈**（后进先出的栈结构）：

```javascript
function a() {
  b()
  console.log('a')
}
function b() {
  console.log('b')
}
a()
```

执行过程：
```
① 调用 a()    → 栈: [a]
② a 里调用 b() → 栈: [a, b]
③ b 执行完毕   → 栈: [a]，输出 'b'
④ a 执行完毕   → 栈: []，输出 'a'
```

当执行栈为空时，事件循环就会从任务队列中取下一个任务来执行。

---

## 宏任务 vs 微任务

事件循环将异步任务分成两类队列：

### 宏任务（MacroTask / Task）

每次只取出**一个**执行，执行完后检查微任务队列。

| 来源 | 例子 |
| --- | --- |
| 定时器 | `setTimeout`、`setInterval` |
| I/O 回调 | 文件读取、网络请求完成的回调 |
| UI 渲染 | 浏览器重新渲染页面（在宏任务之间执行） |
| 用户交互 | 点击、键盘事件的回调 |
| `setImmediate` | Node.js 专有 |
| `MessageChannel` | 优先级比 setTimeout 稍高 |

### 微任务（MicroTask）

每次宏任务执行完毕后，**把当前所有微任务全部清空**，才会进入下一个宏任务。

| 来源 | 例子 |
| --- | --- |
| Promise | `.then()` / `.catch()` / `.finally()` |
| `queueMicrotask()` | 手动入队微任务 |
| `MutationObserver` | 监听 DOM 变化 |
| `async/await` | `await` 后面的代码本质是 `.then()` 回调 |
| `process.nextTick` | Node.js 专有，比普通微任务优先级更高 |

---

## 事件循环完整流程

```
┌─────────────────────────────────────────────────────┐
│                   Event Loop 循环                    │
│                                                     │
│  1. 执行一个宏任务（Script 整体代码算第一个宏任务）    │
│            │                                        │
│            ▼                                        │
│  2. 执行栈清空后，检查微任务队列                      │
│     → 清空所有微任务（包括微任务里新产生的微任务）     │
│            │                                        │
│            ▼                                        │
│  3. 浏览器判断是否需要渲染（约每 16.6ms 一次）         │
│     → 如需要，执行 requestAnimationFrame 回调        │
│     → 然后渲染页面                                   │
│            │                                        │
│            ▼                                        │
│  4. 取下一个宏任务，重复以上步骤                      │
└─────────────────────────────────────────────────────┘
```

**关键口诀：一个宏任务 → 清空所有微任务 → 渲染 → 下一个宏任务**

---

## 经典执行顺序题

### 例1：基础版

```javascript
console.log('1')                          // 同步

setTimeout(() => {
  console.log('2')                        // 宏任务
}, 0)

Promise.resolve().then(() => {
  console.log('3')                        // 微任务
})

console.log('4')                          // 同步

// 输出顺序：1 → 4 → 3 → 2
```

分析：
1. 执行同步代码：输出 `1`
2. 遇到 `setTimeout`，把回调注册到宏任务队列（不执行）
3. 遇到 `Promise.then`，把回调注册到微任务队列（不执行）
4. 执行同步代码：输出 `4`
5. 同步执行完，清空微任务队列：输出 `3`
6. 取下一个宏任务（setTimeout 回调）：输出 `2`

### 例2：async/await 版（面试常考）

```javascript
console.log('script start')

async function async1() {
  console.log('async1 start')   // 同步，async 函数体开始时立即执行
  await async2()                // await 相当于 .then()，之后的代码变成微任务
  console.log('async1 end')    // 微任务
}

async function async2() {
  console.log('async2')         // 同步，async2 函数体立即执行
}

setTimeout(() => {
  console.log('setTimeout')    // 宏任务
}, 0)

async1()

new Promise((resolve) => {
  console.log('promise executor') // Promise 构造函数是同步的
  resolve()
}).then(() => {
  console.log('promise then')    // 微任务
})

console.log('script end')

// 输出顺序：
// script start
// async1 start
// async2
// promise executor
// script end
// async1 end
// promise then
// setTimeout
```

详细分析：
```
同步阶段（第一个宏任务）:
  → 'script start'
  → async1() 调用：输出 'async1 start'
  → async2() 调用：输出 'async2'
  → await async2() 执行完，async1 后续代码 ('async1 end') 进入微任务队列
  → new Promise 构造函数执行：输出 'promise executor'，resolve() 调用，.then 回调进入微任务队列
  → 输出 'script end'

微任务清空:
  → 'async1 end'（先入队）
  → 'promise then'（后入队）

下一个宏任务:
  → 'setTimeout'
```

### 例3：微任务里继续产生微任务

```javascript
Promise.resolve()
  .then(() => {
    console.log('then 1')
    // 在微任务里又产生了一个微任务
    return Promise.resolve('then 2')
  })
  .then((val) => {
    console.log(val)  // 'then 2'
  })

Promise.resolve()
  .then(() => {
    console.log('then 3')
  })

// 输出：then 1 → then 3 → then 2
```

解析：`return Promise.resolve()` 在规范中会额外多消耗两个微任务（PromiseResolveThenableJob），所以 `then 3` 会比 `then 2` 先输出。这是一个比较深的细节，了解即可。

---

## Node.js 的事件循环（与浏览器的区别）

Node.js 的事件循环基于 **libuv** 实现，比浏览器更复杂，分为多个阶段：

```
   ┌───────────────────────────┐
┌─>│           timers          │  ← 执行 setTimeout / setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  ← 上一轮延迟的 I/O 回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  ← 内部使用
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  ← 等待新的 I/O 事件
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  ← 执行 setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │
   └───────────────────────────┘
```

Node.js 特有的关键点：

- **`process.nextTick`**：优先级高于所有微任务，在每个阶段结束后、微任务执行前先执行。
- **`setImmediate`**：在 check 阶段执行，比 `setTimeout(fn, 0)` 的执行时机更可预测（在 I/O 回调内部调用时，`setImmediate` 总是先于 `setTimeout` 执行）。

---

## 面试官怎么问

### Q1: 什么是事件循环？

**参考回答：**

事件循环是 JavaScript 引擎处理异步任务的调度机制。由于 JS 是单线程的，所有代码在同一个线程上执行，无法真正并行。事件循环通过维护一个任务队列来解决这个问题：

1. 先执行当前的同步代码（宏任务）；
2. 同步代码执行完后，清空微任务队列（Promise.then 等）；
3. 浏览器判断是否需要重新渲染页面；
4. 取下一个宏任务（setTimeout 等），重复以上过程。

### Q2: 微任务和宏任务的区别？为什么微任务先于宏任务？

**参考回答：**

- **宏任务**（如 setTimeout、I/O）：每次循环只取一个执行，代表"下一轮"任务。
- **微任务**（如 Promise.then、MutationObserver）：在当前宏任务结束后立即全部执行完，代表"当前轮末尾"的补充工作。

微任务优先是设计上的考量：Promise 的 `.then` 回调通常是对当前异步操作结果的后续处理，语义上属于"当前任务的延续"，应该尽快执行，而不是等到下一轮。

### Q3: `setTimeout(fn, 0)` 的延迟真的是 0 吗？

**参考回答：**

不是精确的 0ms。原因有两个：

1. HTML 规范规定，`setTimeout` 最小延迟为 **4ms**（嵌套超过5层时强制至少4ms）。
2. 即使延迟设为 0，它也要等到当前宏任务和**所有微任务**全部执行完之后，才轮到它执行。所以 `setTimeout(fn, 0)` 只能保证"在当前同步代码之后执行"，不保证具体时间。

### Q4: `requestAnimationFrame` 和 `setTimeout` 有什么区别？

**参考回答：**

- `setTimeout(fn, 16)` 模拟 60fps 动画不可靠：系统繁忙时会丢帧，且即使页面不可见（后台 tab）也会执行，浪费资源。
- `requestAnimationFrame(fn)` 由浏览器控制，在**每次渲染前**调用一次（约 16.6ms），且页面不可见时自动暂停，性能更优、时机更准确，是做动画的标准方式。

在事件循环中，`rAF` 的执行时机在微任务之后、页面渲染之前。
