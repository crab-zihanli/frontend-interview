# 数据类型与堆栈

一切的基础，考察对内存的理解。

## 知识点体系

### 1. 类型分类
更详细的知识内容理解参考[MDN 数据类型](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Data_structures)
JavaScript 的数据类型分为两大类：

*   **基本数据类型 (Primitive Types)**：
    *   `String`（注意是不可变的，每次修改都会生成一个新的字符串）
    *   `Number`(包括 NaN 和 Infinity,双精度浮点数)
    *   `Boolean`
    *   `Null`（理解为对象的缺失，所以`typeof null` 会返回 `'object'`）
    *   `Undefined`（理解为值的缺失，例如变量未赋值）
    *   `Symbol` (ES6，唯一且不可变，适用于对象属性的标识)
    *   `BigInt` (ES2020，表示任意精度整数)
*   **引用数据类型 (Reference Types)**：
    *   `Object` (包括 Array, Function, Date, RegExp 等)
    *   除了 `null` 和 `undefined` 之外的其它基本数据类型都有对应的包装对象（如 `String` 对应 `new String()`）。当在基本类型上调用方法时，JS 会临时将其转换为对应的包装对象。

### 2. 存储差异
*   **栈内存 (Stack)**：存储基本数据类型的值。空间小，访问速度快，大小固定。
*   **堆内存 (Heap)**：存储引用数据类型。空间大，访问速度相对慢，大小不固定。引用类型的变量在栈中存储的是一个**指针**（内存地址），指向堆中的实体。

### 3. 类型判断
*   **`typeof`**：适合判断基本类型（除了 `null` 会返回 `'object'`），判断函数返回 `'function'`。如果想判断`null`，可以用`a === null`判断。
*   **`instanceof`**：判断对象的原型链上是否存在构造函数的 `prototype`。适合判断引用类型。

### 4. 类型转换
*   **显式转换**：`Number()`, `String()`, `Boolean()` 等。
*   **隐式转换**：
    *   `+` 操作符（字符串拼接 vs 数字相加）
    *   `==` 宽松相等（会进行类型转换）

### 5. 深浅拷贝
* **值的复制**：
    *   **基本类型**：直接复制值，互不影响。
    *   **引用类型**：复制的是地址，多个变量指向同一内存地址，修改其中一个会影响另一个。
*   **浅拷贝**：只拷贝一层，引用类型拷贝的是地址。(`Object.assign`, 展开运算符 `...`)
举个例子：
```javascript
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { ...obj1 }; // 浅拷贝
obj2.b.c = 3;
console.log(obj1.b.c); // 输出 3
```
*   **深拷贝**：递归拷贝所有层级，新旧对象互不影响。(`JSON.parse(JSON.stringify())`, 手写递归)

---

## 面试官怎么问

### Q1: <mark>JS 有哪些数据类型？</mark> Symbol 一般用来做什么？
**参考回答：**
JS 有 8 种数据类型，包括 7 种基本类型 (String, Number, Boolean, Null, Undefined, Symbol, BigInt) 和 1 种引用类型 (Object)。
Symbol 是 ES6 引入的，表示独一无二的值。主要用途：
1.  作为对象属性名，防止属性名冲突。
2.  模拟私有属性。
3.  定义常量枚举。
4.  实现 Symbol.iterator 等内置 Hook。

### Q2: `0.1 + 0.2 !== 0.3` 为什么？怎么解决？
**参考回答：**
这是因为 JavaScript 使用 IEEE 754 双精度浮点数标准。在二进制表示中，0.1 和 0.2 都是无限循环小数，相加时会发生精度丢失，导致结果略大于 0.3 (0.30000000000000004)。
**解决方法：**
1.  使用 `toFixed()` 格式化：`(0.1 + 0.2).toFixed(1) === '0.3'`
2.  乘以整数倍计算：`(0.1 * 10 + 0.2 * 10) / 10 === 0.3`
3.  使用第三方库：`decimal.js` 或 `bignumber.js`。
4.  ES6 `Number.EPSILON` 误差检查。

### Q3: 手写一个深拷贝 (Deep Clone)
**参考回答：**
面试时建议采用**递进式**的回答策略，展示你的思考过程，而不是直接默写最终代码。

**第一层：最简单的方案 (JSON)**
"如果对象比较简单，没有函数、undefined、循环引用等，可以直接用 JSON 序列化。"
```javascript
const newObj = JSON.parse(JSON.stringify(obj));
```
*   **缺点**：无法处理函数、`undefined`、`Symbol`（会被忽略），无法处理 `Date`（变字符串）、`RegExp`（变空对象），遇到循环引用会报错。

**第二层：基础递归版本**
"为了解决 JSON 的问题，我们可以写一个递归函数。但要考虑数组和对象的区别。"
```javascript
function deepClone(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    // 初始化结果，保持数组或对象
    let result = Array.isArray(obj) ? [] : {};
    
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            result[key] = deepClone(obj[key]);
        }
    }
    return result;
}
```
*   **缺点**：无法解决**循环引用**的问题（即对象属性指向对象本身，会导致栈溢出）。

**第三层：解决循环引用 (面试合格版本)**
"为了解决循环引用，我们需要一个 Map 来记录已经拷贝过的对象。如果再次遇到，直接返回记录的值，不再递归。"
```javascript
function deepClone(obj, map = new WeakMap()) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    // 1. 检查循环引用
    if (map.has(obj)) return map.get(obj);
    
    // 2. 初始化
    let result = Array.isArray(obj) ? [] : {};
    map.set(obj, result); // 先存入 Map
    
    // 3. 递归
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            result[key] = deepClone(obj[key], map);
        }
    }
    return result;
}
```

**第四层：完善特殊类型 (加分项)**
"如果还需要处理 Date, RegExp 等特殊类型，可以在开头进行判断。"
```javascript
// 在函数开头添加：
if (obj instanceof Date) return new Date(obj);
if (obj instanceof RegExp) return new RegExp(obj);
```

### Q4： 手写一个浅拷贝 (Shallow Clone)
**参考回答：**
```javascript
function shallowClone(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    let result = Array.isArray(obj) ? [] : {};
    
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            result[key] = obj[key];
        }
    }
    return result;
}
```

### Q5： 手写一个对象相等比较 (Shallow Equal)
**参考回答：**
```javascript
/**
 * @param {Object} obj1
 * @param {Object} obj2
 * @returns {boolean}
 */
function shallowEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== 'object' || obj1 === null ||
        typeof obj2 !== 'object' || obj2 === null) {
        return false;
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (let key of keys1) {
        if (obj1[key] !== obj2[key]) return false;
    }
    return true;
}
```

### Q6： 手写一个类型判断函数
**参考回答：**
```javascript
/**
 * @param {*} value
 * @returns {string}
 */
function typeOf(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}
```

### Q7： 手写一个大数相加函数
**参考回答：**
```javascript
/**
 * @param {string} num1
 * @param {string} num2
 * @returns {string}
 */
function addBigNumbers(num1, num2) {
    // 鲁棒性处理：确保输入是字符串
    // 虽然大数通常已经是字符串，但防止传入普通数字导致 .length 报错
    num1 = num1.toString();
    num2 = num2.toString();

    let carry = 0; // 进位
    let result = '';
    let i = num1.length - 1; // num1 的指针，指向最后一位
    let j = num2.length - 1; // num2 的指针，指向最后一位
    
    // 从个位开始逐位相加，只要还有数字没处理完，或者还有进位，就继续循环
    while (i >= 0 || j >= 0 || carry) {
        // 获取当前位的数字，如果指针越界（比如一个数字比另一个短），则补 0
        const digit1 = i >= 0 ? parseInt(num1[i--], 10) : 0;
        const digit2 = j >= 0 ? parseInt(num2[j--], 10) : 0;
        
        // 当前位求和：数字1 + 数字2 + 进位
        const sum = digit1 + digit2 + carry;
        
        // 计算当前位的结果（个位数）并拼接到结果字符串的最前面
        result = (sum % 10) + result;
        
        // 计算新的进位（十位数）
        carry = Math.floor(sum / 10);
    }
    
    return result;
}

// 示例
console.log(addBigNumbers('12345678901234567890', '98765432109876543210')); 
// 输出: "111111111011111111100"
```

### Q8： 将数字每千分位用逗号隔开
**参考回答：**
```javascript
/**
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
    let str = num.toString();
    let result = '';
    let count = 0;
    for (let i = str.length - 1; i >= 0; i--) {
        result = str[i] + result;
        count++;
        if (count % 3 === 0 && i !== 0) {
            result = ',' + result;
        }
    }
}
```

