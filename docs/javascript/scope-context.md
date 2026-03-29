# 作用域、闭包与执行上下文

核心逻辑：代码是怎么跑起来的？

## 知识点体系

### 1. 变量声明 (var vs let vs const)
*   **var**：函数作用域，存在变量提升 (Hoisting)，可以重复声明，挂载到 window (全局下)。
*   **let**：块级作用域，不存在变量提升（暂时性死区 TDZ），不可重复声明。
*   **const**：块级作用域，声明必须初始化，值（内存地址）不可变。

### 2. 作用域与作用域链
*   **词法作用域 (Lexical Scope)**：也叫静态作用域。函数的作用域在函数**定义**的时候就决定了，而不是调用的时候。
*   **作用域链**：查找变量时，先在当前作用域找；找不到就去父级作用域找，直到全局作用域。
```javascript
//示例词法作用域
var value = 1;

function foo() {
    // foo 出生在这里，它的上级是全局作用域
    console.log(value);
}

function bar() {
    var value = 2;
    // foo 虽然在这里被调用（工作地点），但它不属于这里
    foo(); 
}

bar(); // 输出 1，而不是 2
```

### 3. 闭包 (Closure)
*   **定义**：函数与其词法环境的组合。即使函数在其词法环境之外执行，也能访问该环境中的变量。
*   **核心特点**：
    1.  函数嵌套。
    2.  内部函数引用外部变量。
    3.  变量常驻内存，不被销毁。
*   **应用场景**：
    *   **数据私有化**：模拟私有变量，只暴露 API。
    *   **函数工厂**：柯里化 (Currying)，偏函数。
    *   **性能优化**：防抖 (Debounce) 和节流 (Throttle)。
    *   **模块化**：IIFE 模式。
*   **缺点**：变量常驻内存，滥用可能导致内存泄漏。

### 4. this 指向
`this` 的指向在**函数调用时**决定。
*   **默认绑定**：独立函数调用，指向全局对象 (window/global)，严格模式下为 `undefined`。
*   **隐式绑定**：`obj.method()`，指向调用者 `obj`。
*   **显式绑定**：`call`, `apply`, `bind`，指向指定的对象。
*   **new 绑定**：指向新创建的实例对象。
*   **箭头函数**：没有自己的 `this`，继承自外层作用域的 `this`。

---

## 面试官怎么问

### Q1: 什么是闭包？闭包有哪些应用场景？
**参考回答：**
**定义**：
闭包是函数与其词法环境的组合。简单来说，即使函数在其词法环境之外执行，也能访问该环境中的变量。

**特点**：
1.  **函数嵌套**：外部函数内部定义了内部函数。
2.  **访问外部变量**：内部函数引用了外部函数的变量。
3.  **变量常驻内存**：外部函数执行完毕后，其变量对象不会被销毁，因为被内部函数引用着。

**应用场景与示例**：

1.  **私有变量 (数据封装)**
    通过闭包隐藏数据，只暴露操作数据的方法。
    ```javascript
    function createCounter() {
        let count = 0; // 私有变量
        return {
            increment: () => ++count,
            get: () => count
        };
    }
    const counter = createCounter();
    console.log(counter.get()); // 0
    console.log(counter.increment()); // 1
    // console.log(count); // 报错，无法直接访问
    ```

2.  **函数工厂 (柯里化)**
    根据传入的参数生成不同的函数。
    ```javascript
    function makeAdder(x) {
        return function(y) {
            return x + y;
        };
    }
    const add5 = makeAdder(5);
    console.log(add5(2)); // 7
    ```

3.  **模块模式 (Module Pattern)**
    早期的模块化实现（IIFE），用于隔离作用域。
    ```javascript
    const myModule = (function() {
        let privateVar = 'I am private';
        return {
            publicMethod: function() {
                console.log(privateVar);
            }
        };
    })();
    ```

4.  **记忆化 (Memoization)**
    缓存函数的计算结果，避免重复计算。
    ```javascript
    function memoize(fn) {
        const cache = {};
        return function(...args) {
            const key = JSON.stringify(args);
            if (!cache[key]) {
                cache[key] = fn.apply(this, args);
            }
            return cache[key];
        };
    }
    ```

5.  **防抖与节流**
    利用闭包保存定时器状态（见 Q5/Q6）。

### Q2: 箭头函数和普通函数有什么区别？
**参考回答：**
1.  **this 指向不同**：普通函数的 `this` 取决于调用方式；箭头函数的 `this` 取决于定义时的上下文（词法作用域），它没有自己的 `this`。
2.  **不可作为构造函数**：箭头函数不能使用 `new`，因为它没有 `prototype`，也没有 `[[Construct]]` 方法。
3.  **arguments**：箭头函数没有 `arguments` 对象，可以使用剩余参数 `...args` 代替。
4.  **无法改变 this**：`call`, `apply`, `bind` 无法改变箭头函数的 `this` 指向。

### Q3: 看代码说输出 (this 指向陷阱)
```javascript
var name = 'window';
const person = {
    name: 'person',
    say1: function() {
        console.log(this.name);
    },
    say2: () => {
        console.log(this.name);
    }
};
person.say1(); 
person.say2(); 
```
**参考回答：**
*   `person.say1()` 输出 `'person'`。原因：隐式绑定，`this` 指向调用者 `person`。
*   `person.say2()` 输出 `'window'` (非严格模式) 或 `undefined` (严格模式)。原因：箭头函数没有 `this`，往上找是全局作用域。

### Q4: 什么是暂时性死区 (TDZ)？
**参考回答：**
在代码块内，使用 `let` 或 `const` 命令声明变量之前，该变量都是不可用的。这在语法上称为“暂时性死区”。这主要是为了减少运行时错误，防止在变量声明前就使用它。

### Q5: 手写防抖 (Debounce)
**参考回答：**
**核心概念**：
防抖是指：在事件被触发后，等待一段时间再执行函数。如果在这段时间内事件又被触发，则重新计时。这样可以避免函数被频繁调用。
**应用场景**：搜索框输入联想、窗口 resize。

**第一层：基础实现 (能用就行)**
"最核心的逻辑是：每次触发前，先清除上一次的定时器。"
```javascript
function debounce(fn, delay) {
    let timer = null;
    return function() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn(); // 问题：this 指向和参数丢失
        }, delay);
    }
}
```

**第二层：解决 this 和参数 (面试合格)**
"上面的代码在实际使用中，`fn` 里的 `this` 会指向 window，且拿不到事件对象 `event`。我们需要修正它。"
```javascript
function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        // 保存当前的 this 和参数
        const context = this;
        
        if (timer) clearTimeout(timer);
        
        timer = setTimeout(() => {
            // 使用 apply 修正 this 指向，并传递参数
            fn.apply(context, args);
        }, delay);
    }
}
```

### Q6: 手写节流 (Throttle)
**参考回答：**
**核心概念**：
节流是指：在一定时间内，只允许函数执行一次。这样可以限制函数的调用频率，避免高频触发。
**应用场景**：滚动加载 (scroll)、按钮防止重复点击。

**第一层：时间戳版 (立即执行)**
"用当前时间减去上一次执行的时间，如果大于等待时间，就执行。"
```javascript
function throttle(fn, delay) {
    let prev = 0;
    return function(...args) {
        let now = Date.now();
        if (now - prev > delay) {
            fn.apply(this, args);
            prev = now;
        }
    }
}
```

**第二层：定时器版 (最后执行)**
"如果想要最后一次操作也能被执行（比如停止滚动后还要做一次检查），可以用定时器。"
```javascript
function throttle(fn, delay) {
    let timer = null;
    return function(...args) {
        if (!timer) {
            timer = setTimeout(() => {
                fn.apply(this, args);
                timer = null; // 执行完置空，代表 CD 结束
            }, delay);
        }
    }
}
```
*(面试时写出其中一种即可，通常写定时器版比较多，或者根据面试官要求写“首节流”或“尾节流”)*

### Q7: 手写apply call bind
**参考回答：**
```javascript
// 1. myCall 实现
Function.prototype.myCall = function(context, ...args) {
    // 区别点：call 接收参数列表 (...args)
    context = context || globalThis; 
    const fnSymbol = Symbol(); 
    context[fnSymbol] = this; 
    const result = context[fnSymbol](...args); // 立即执行
    delete context[fnSymbol]; 
    return result; 
};

// 2. myApply 实现
Function.prototype.myApply = function(context, args) {
    // 区别点：apply 接收单个数组参数 (args)
    context = context || globalThis;
    const fnSymbol = Symbol();
    context[fnSymbol] = this;
    // 需要判断 args 是否为数组
    const result = Array.isArray(args) ? context[fnSymbol](...args) : context[fnSymbol](); // 立即执行
    delete context[fnSymbol];
    return result;
};

// 3. myBind 实现
// bind 返回一个新函数，不立即执行。第二个参数是参数列表。
Function.prototype.myBind = function(context, ...args) {
    // 区别点：bind 不立即执行，而是返回一个新函数
    const fn = this;
    return function(...innerArgs) {
        return fn.apply(context, args.concat(innerArgs));
    }
};
``` 

### Q8: 函数柯里化
**参考回答：**
```javascript
function curry(fn) {
    const arity = fn.length; // 1. 获取原函数需要的参数个数
    
    // 2. 返回一个柯里化后的函数，名为 curried，方便内部递归调用
    return function curried(...args) {
        // 3. 判断当前收集到的参数个数是否足够
        if (args.length >= arity) {
            // 3.1 递归终止条件：如果参数够了，直接执行原函数
            return fn.apply(this, args); 
        } else {
            // 3.2 如果参数不够，返回一个新的函数来继续接收剩余参数
            return function(...args2) {
                // 4. 递归步骤：将之前的参数 args 和新参数 args2 合并
                // 再次调用 curried 函数，检查合并后的参数个数是否足够
                return curried.apply(this, args.concat(args2)); 
            }
        }
    }
}
// 示例
function add(a, b, c) {
    return a + b + c;
}
const curriedAdd = curry(add);
console.log(curriedAdd(1)(2)(3)); // 6
console.log(curriedAdd(1, 2)(3)); // 6
console.log(curriedAdd(1, 2, 3)); // 6
```
