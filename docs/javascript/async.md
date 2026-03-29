# 异步编程

核心逻辑：JS 是单线程的，怎么处理耗时任务？

## 知识点体系

### 1. Event Loop (事件循环)
JavaScript 的执行机制，因为javascript 是单线程语言，所有任务都在一个线程上执行。为了处理异步任务，引入了事件循环机制 (Event Loop)。
*   **同步任务**：在主线程上执行，形成执行栈。
*   **异步任务**：
    *   **宏任务 (MacroTask)**：`setTimeout`, `setInterval`, `setImmediate` (Node), I/O, UI Rendering。
    *   **微任务 (MicroTask)**：`Promise.then/catch/finally`, `process.nextTick` (Node), `MutationObserver`。
*   **循环过程**：
    1.  执行完当前执行栈中的所有同步代码。
    2.  清空当前微任务队列（所有微任务依次执行）。
    3.  取出宏任务队列中的**一个**任务执行。
    4.  重复步骤 2-3。

### 2. Promise
*   **三种状态**：`Pending` (进行中), `Fulfilled` (已成功), `Rejected` (已失败)。状态一旦改变不可逆。
*   **API**：
    *   `Promise.all()`: 并发执行，**全部成功**才算成功，只要有一个失败就立即失败。
    *   `Promise.race()`: 赛跑模式，以**最快**改变状态（无论成功或失败）的那个为准。
    *   `Promise.allSettled()`: 等待**所有**任务结束（不管成功失败），返回所有结果的数组。
    *   `Promise.any()`: 只要有**一个成功**就成功，只有全部失败才算失败。

### 3. Async/Await
*   **本质**：Generator 函数 + 自动执行器的语法糖。
*   **特点**：让异步代码看起来像同步代码。
*   **错误处理**：使用 `try...catch` 捕获 `await` 后的 reject 异常。

---

## 面试官怎么问

### Q1: 输出题：Event Loop 执行顺序
```javascript
console.log('script start');
setTimeout(() => {
  console.log('setTimeout');
}, 0);
Promise.resolve().then(() => {
  console.log('promise1');
}).then(() => {
  console.log('promise2');
});
async function async1() {
  console.log('async1 start');
  await async2();
  console.log('async1 end');
}
async function async2() {
  console.log('async2');
}
async1();
console.log('script end');
// 输出结果？
/*答案：
script start
async1 start
async2
script end
promise1
async1 end
promise2
setTimeout
*/
```


### Q2: Async/Await 相比 Promise 好在哪里？有什么缺点？
**参考回答：**
**优点：**
1.  **代码清晰**：避免了 Promise 的链式调用（Callback Hell 的进化版），代码逻辑更像同步代码，可读性强。
2.  **错误处理**：可以直接用 `try...catch` 处理同步和异步错误。
3.  **调试方便**：断点调试比 Promise 链更容易。

**缺点：**
1.  **滥用导致串行**：如果多个 await 之间没有依赖关系，直接写会导致不必要的等待（串行执行）。应该用 `Promise.all` 并行。
2.  **编译体积**：Babel 转译后的代码体积相对较大（包含 Generator polyfill）。

### Q3: 如果我要同时请求 10 个接口，但最多只能并发 3 个，怎么实现？
**参考回答：**
这是经典的**并发控制**题。
思路：
1.  创建一个数组存放正在执行的 Promise。
2.  遍历 URL 列表，创建一个个请求任务。
3.  如果当前执行队列小于限制（3个），直接执行并推入队列。
4.  如果达到限制，利用 `Promise.race` 等待队列中最快完成的那个任务，移除它，然后加入新任务。
5.  最后 `Promise.all` 等待剩余任务完成。

### Q4: 手写 Promise.all
**参考回答：**
```javascript
function myAll(promises) {
  return new Promise((resolve, reject) => {
    let results = [];
    let count = 0;
    if (promises.length === 0) resolve(results);
    
    promises.forEach((p, index) => {
      // 确保 p 是 Promise
      Promise.resolve(p).then(res => {
        results[index] = res; // 保证顺序
        count++;
        if (count === promises.length) {
          resolve(results);
        }
      }).catch(err => {
        reject(err); // 有一个失败就直接失败
      });
    });
  });
}
```
