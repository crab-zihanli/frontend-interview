# 手写题参考答案

## 1. 手写深拷贝 (Deep Clone)

**核心要点**：递归、数组/对象区分、循环引用处理。

```javascript
function deepClone(obj, map = new WeakMap()) {
    // 1. 处理基本类型和 null
    if (typeof obj !== 'object' || obj === null) return obj;
    
    // 2. 处理循环引用
    if (map.has(obj)) return map.get(obj);
    
    // 3. 初始化结果 (支持数组和对象)
    const result = Array.isArray(obj) ? [] : {};
    map.set(obj, result);
    
    // 4. 递归拷贝
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            result[key] = deepClone(obj[key], map);
        }
    }
    
    return result;
}
```

## 2. 手写 Promise.all

**核心要点**：返回 Promise、计数器、结果数组顺序。

```javascript
function myAll(promises) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(promises)) {
            return reject(new TypeError('Argument must be an array'));
        }
        
        const results = [];
        let count = 0;
        const len = promises.length;
        
        if (len === 0) return resolve(results);
        
        promises.forEach((p, index) => {
            // Promise.resolve 包裹一下，防止 p 不是 Promise
            Promise.resolve(p).then(res => {
                results[index] = res; // 保证结果顺序
                count++;
                if (count === len) {
                    resolve(results);
                }
            }).catch(err => {
                reject(err); // 只要有一个失败就直接失败
            });
        });
    });
}
```

## 3. 手写 new 操作符

**核心要点**：创建对象、链接原型、绑定 this、返回对象。

```javascript
function myNew(Constructor, ...args) {
    // 1. 创建一个新对象，并将其 __proto__ 指向构造函数的 prototype
    const obj = Object.create(Constructor.prototype);
    
    // 2. 执行构造函数，将 this 绑定到新对象
    const result = Constructor.apply(obj, args);
    
    // 3. 如果构造函数返回了对象，则返回该对象；否则返回新对象
    return (result && typeof result === 'object') ? result : obj;
}
```

## 4. 手写防抖 (Debounce)

**核心要点**：定时器清零、闭包。
**场景**：搜索框输入、窗口 resize。

```javascript
function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}
```

## 5. 手写节流 (Throttle)

**核心要点**：时间戳或定时器锁。
**场景**：滚动加载、按钮防止重复点击。

```javascript
function throttle(fn, delay) {
    let timer = null;
    return function(...args) {
        if (timer) return; // 如果定时器存在，说明在等待中，直接返回
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = null; // 执行完毕后清空定时器
        }, delay);
    };
}
```

## 6. 手写 AJAX 请求

**核心要点**：XMLHttpRequest、状态监听、Promise 封装。

```javascript
function ajax(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error('Request failed'));
                }
            }
        };
        xhr.send();
    });
}
```

## 7. 手写事件委托 (Event Delegation)

**核心要点**：事件冒泡、matches 匹配、this 指向。

```javascript
function on(eventType, element, selector, handler) {
    element.addEventListener(eventType, (e) => {
        let target = e.target;
        // 向上查找匹配的元素
        while (target !== element) {
            if (target.matches(selector)) {
                handler.call(target, e, target);
                return;
            }
            target = target.parentNode;
        }
    });
}
```

## 8. 手写并发控制 (Scheduler)

**核心要点**：队列、递归/循环调用、Promise。

```javascript
class Scheduler {
    constructor(limit) {
        this.limit = limit;
        this.queue = [];
        this.runningCount = 0;
    }

    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.run();
        });
    }

    run() {
        while (this.runningCount < this.limit && this.queue.length > 0) {
            const { task, resolve, reject } = this.queue.shift();
            this.runningCount++;
            task().then(resolve).catch(reject).finally(() => {
                this.runningCount--;
                this.run();
            });
        }
    }
}

// 使用示例
const scheduler = new Scheduler(2);
const timeout = (time) => new Promise(resolve => setTimeout(resolve, time));
const addTask = (time, order) => {
    scheduler.add(() => timeout(time)).then(() => console.log(order));
};
```

## 9. 手写 instanceof

**核心要点**：原型链查找。

```javascript
function myInstanceof(left, right) {
    let proto = Object.getPrototypeOf(left); // 获取对象的原型
    const prototype = right.prototype; // 获取构造函数的 prototype
    
    while (true) {
        if (!proto) return false; // 到了原型链顶端 null
        if (proto === prototype) return true; // 找到了
        proto = Object.getPrototypeOf(proto); // 继续向上找
    }
}
```

## 10. 手写 call / apply

**核心要点**：将函数设为对象的属性执行。

```javascript
Function.prototype.myCall = function(context, ...args) {
    // 1. 处理 context 为 null/undefined 的情况
    context = context || window;
    
    // 2. 将当前函数 (this) 设为 context 的属性
    // 使用 Symbol 防止属性名冲突
    const fnSymbol = Symbol();
    context[fnSymbol] = this;
    
    // 3. 执行函数
    const result = context[fnSymbol](...args);
    
    // 4. 删除属性
    delete context[fnSymbol];
    
    return result;
};
```

## 11. 手写函数柯里化 (Currying)

**核心要点**：参数收集、递归调用。
**作用**：参数复用、延迟执行。

```javascript
function curry(fn) {
    return function curried(...args) {
        // 如果传入的参数个数 >= 原函数需要的参数个数，直接执行
        if (args.length >= fn.length) {
            return fn.apply(this, args);
        } else {
            // 否则返回一个新函数，继续接收剩余参数
            return function(...args2) {
                return curried.apply(this, args.concat(args2));
            };
        }
    };
}

// 使用示例
function add(a, b, c) { return a + b + c; }
const curriedAdd = curry(add);
console.log(curriedAdd(1)(2)(3)); // 6
console.log(curriedAdd(1, 2)(3)); // 6
```

## 12. 手写数组转树 (Array to Tree)

**核心要点**：Map 映射、一次遍历。
**场景**：后端返回扁平的菜单列表，前端需要转成树形结构渲染。

```javascript
function arrayToTree(items) {
    const result = [];   // 存放结果集
    const itemMap = {};  // 
    
    // 1. 先把数据转成 Map 存储，方便查找
    for (const item of items) {
        itemMap[item.id] = { ...item, children: [] };
    }
    
    // 2. 再次遍历，将元素放入对应的父节点下
    for (const item of items) {
        const id = item.id;
        const pid = item.pid;
        const treeItem = itemMap[id];
        
        if (pid === 0) {
            // 根节点
            result.push(treeItem);
        } else {
            // 非根节点，找到父节点，加入其 children
            if (itemMap[pid]) {
                itemMap[pid].children.push(treeItem);
            }
        }
    }
    return result;
}
```

## 13. 手写数组扁平化 (Array Flatten)

**核心要点**：递归、reduce、ES6 flat。

```javascript
// 方案 1: 递归 (最通用)
function flatten(arr) {
    let result = [];
    for (let i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i])) {
            result = result.concat(flatten(arr[i]));
        } else {
            result.push(arr[i]);
        }
    }
    return result;
}

// 方案 2: reduce
function flattenReduce(arr) {
    return arr.reduce((prev, next) => {
        return prev.concat(Array.isArray(next) ? flattenReduce(next) : next);
    }, []);
}

// 方案 3: ES6 (指定深度)
// arr.flat(Infinity);
```

## 14. 手写发布订阅模式 (EventEmitter)

**核心要点**：事件中心、订阅(on)、发布(emit)、取消订阅(off)。

```javascript
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(type, handler) {
        if (!this.events[type]) {
            this.events[type] = [];
        }
        this.events[type].push(handler);
    }

    emit(type, ...args) {
        if (this.events[type]) {
            this.events[type].forEach(handler => handler.apply(this, args));
        }
    }

    off(type, handler) {
        if (this.events[type]) {
            this.events[type] = this.events[type].filter(h => h !== handler);
        }
    }

    once(type, handler) {
        const wrapper = (...args) => {
            handler.apply(this, args);
            this.off(type, wrapper);
        };
        this.on(type, wrapper);
    }
}
```

## 15. 手写 LRU 缓存算法

**核心要点**：Map 的有序性 (ES6 Map 按照插入顺序遍历)。
**原理**：最近最少使用。容量满时，删除最早访问的数据。

```javascript
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return -1;
        
        // 访问过，先删除再重新插入，使其变成"最新"
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    put(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // 删除最久未使用的 (Map 的第一个)
            // this.cache.keys().next().value 获取第一个键
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, value);
    }
}
```
