# ES6+ 新特性与数据处理

核心逻辑：现代开发工具箱。

## 知识点体系

### 1. 基础语法增强 (Syntactic Sugar)
让代码更简洁、易读。
*   **变量声明**：`let` / `const` (块级作用域，无变量提升)。
*   **解构赋值**：快速提取数据。`const [a, b] = arr`; `const { name } = obj`。
*   **模板字符串**：多行字符串与变量插值 `` `Hi ${name}` ``。
*   **函数增强**：
    *   **箭头函数**：`() => {}`，词法作用域 `this`。
    *   **默认参数**：`function(a = 1) {}`。
    *   **剩余参数**：`function(...args) {}`。
*   **展开运算符**：`...arr`，用于数组合并、对象浅拷贝。

### 2. 数据处理能力 (Data Processing)
提供了更强大的数据操作工具。
*   **新数据结构**：
    *   **Set**：唯一值集合 (数组去重)。
    *   **Map**：键值对集合 (键可以是任意类型)。
    *   **WeakMap/WeakSet**：弱引用 (防止内存泄漏)。
*   **数组新方法**：
    *   **查找**：`includes()` (包含), `find()` (找元素), `findIndex()` (找索引)。
    *   **转换**：`flat()` (扁平化), `Array.from()` (类数组转数组)。
*   **对象新方法**：
    *   `Object.assign()` (合并/浅拷贝)。
    *   `Object.entries()` / `Object.fromEntries()` (键值对转换)。
    *   `Object.keys()` / `Object.values()`。

### 3. 工程化与模块化 (Engineering)
现代前端工程的基石。
*   **Module (模块化)**：`import` / `export`。静态分析，支持 Tree Shaking。
*   **Class (类)**：面向对象的语法糖，支持 `extends` 继承和 `super` 关键字。
*   **Promise (异步)**：解决回调地狱，统一异步编程规范。

### 4. 元编程 (Metaprogramming)
修改语言底层的默认行为，Vue3 响应式的核心。
*   **Proxy**：代理对象，拦截并自定义基本操作 (get, set, delete 等)。
*   **Reflect**：提供了一套统一的操作对象的 API，通常与 Proxy 配合使用。


---

## 面试官怎么问

### Q1: forEach, map, filter 有什么区别？
**参考回答：**
*   `forEach`：单纯遍历，没有返回值（返回 undefined），不能中断（break/return 无效）。
*   `map`：遍历并返回一个新数组，新数组元素是回调函数的返回值。
*   `filter`：遍历并返回一个新数组，包含所有回调函数返回 true 的元素。

### Q2: Object.defineProperty (Vue2) vs Proxy (Vue3)
**参考回答：**
1.  **拦截范围**：
    *   `defineProperty` 只能拦截属性的 `get` 和 `set`。
    *   `Proxy` 可以拦截 13 种操作，包括属性读取、赋值、删除、函数调用等。
2.  **数组支持**：
    *   `defineProperty` 无法监听到数组下标的变化（Vue2 需要重写数组方法 hack）。
    *   `Proxy` 可以完美支持数组的监听。
3.  **对象新增属性**：
    *   `defineProperty` 只能劫持初始化时存在的属性，新增属性需要 `Vue.set`。
    *   `Proxy` 是代理整个对象，新增属性也能被拦截。
4.  **性能**：
    *   `defineProperty` 需要递归遍历对象所有属性，性能较差。
    *   `Proxy` 是懒代理，只有访问时才拦截。

### Q3: 数组去重有哪些方法？（说两个就可以）
**参考回答：**
1.  **ES6 Set (最推荐)**：`[...new Set(arr)]` 或 `Array.from(new Set(arr))`。
2.  **filter + indexOf**：`arr.filter((item, index) => arr.indexOf(item) === index)`。
3.  **Map**：利用 Map 的 key 唯一性。
4.  **reduce + includes**：
    ```javascript
    arr.reduce((prev, cur) => prev.includes(cur) ? prev : [...prev, cur], [])
    ```

### Q4: 介绍一下 Map 和 WeakMap 的区别？
**参考回答：**
1.  **键的类型**：Map 的键可以是任意类型；WeakMap 的键只能是对象（null 除外）。
2.  **垃圾回收**：WeakMap 的键是弱引用。如果键对象在其他地方没有被引用，垃圾回收机制会自动回收该对象，WeakMap 中的对应项也会自动消失。防止内存泄漏。
3.  **遍历**：WeakMap 不可遍历 (没有 `keys()`, `values()`, `entries()`, `size`)，因为成员随时可能被回收。

### Q5: 手写一个数组扁平化函数
**参考回答：**
```javascript
const flat = (arr, depth = 1) => {
  let res = [] // 必须是 let
  for(let i = 0; i < arr.length; i++) {
    if(Array.isArray(arr[i]) && depth) {
      res = res.concat(flat(arr[i], depth - 1)) // 返回新数组
    } else {
      res.push(arr[i])
    }
  }
  return res
}
// 示例
console.log(flat([1, [2, [3, [4]]]], 2)); // [1, 2, 3, [4]]
```

### Q6: 手写数组转树
**参考回答：**

**方案一：非递归 Map 法 (性能最优 O(n)，面试推荐)**
核心思路：利用对象引用（指针）的特性。
1.  先把所有数据转成 `id -> 节点` 的映射（Map），并给每个节点初始化 `children: []`。
2.  再次遍历，根据 `parentId` 直接去 Map 里找爸爸，找到就把自己塞进去。
```javascript
function arrayToTree(items) {
    const result = [];   // 存放根节点
    const itemMap = {};  // 临时存储 id -> 节点的映射

    // 1. 先把所有节点转成对象映射，并初始化 children
    for (const item of items) {
        itemMap[item.id] = { ...item, children: [] };
    }

    // 2. 再次遍历，挂载到父节点下
    for (const item of items) {
        const id = item.id;
        const pid = item.parentId;
        const treeItem = itemMap[id]; // 获取当前节点（已包含 children）

        if (pid === null) {
            // 如果是根节点，直接放入结果数组
            result.push(treeItem);
        } else {
            // 如果有父节点，去 Map 里找到父节点，把自己塞进去
            if (itemMap[pid]) {
                itemMap[pid].children.push(treeItem);
            }
        }
    }
    return result;
}
```

**方案二：递归法 (逻辑简单，但性能较差)**
适合数据量小的情况。
```javascript
function arrayToTree(items, parentId = null) {
    const result = [];
    for (const item of items) {
        // 找到当前 parentId 下的所有子节点
        if (item.parentId === parentId) {
            // 递归查找该节点的子节点
            const children = arrayToTree(items, item.id);
            if (children.length) {
                item.children = children;
            }
            result.push(item);
        }
    }
    return result;
}
```
```
// 示例数据
const data = [
    { id: 1, parentId: null, name: 'A' },
    { id: 2, parentId: 1, name: 'B' },
    { id: 3, parentId: 1, name: 'C' },
    { id: 4, parentId: 2, name: 'D' }
];
console.log(arrayToTree(data));
```


### Q7: 手写洗牌算法 (Fisher-Yates Shuffle)
**参考回答：**
```javascript
function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}
```

### Q8: 数组方法的实现
**参考回答：**
```javascript
// map filter reduce 的简易实现
Array.prototype.myMap = function(callback) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
        // 稀疏数组处理：判断索引是否存在
        if (i in this) {
            result[i] = callback(this[i], i, this);
        }
    }
    return result;
};

Array.prototype.myFilter = function(callback) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
        if (i in this) {
            if (callback(this[i], i, this)) {
                result.push(this[i]);
            }
        }
    }
    return result;
};

Array.prototype.myReduce = function(callback, initialValue) {
    let accumulator = initialValue;
    let startIndex = 0;

    // 如果没有提供初始值，则使用数组第一个元素作为初始值
    if (accumulator === undefined) {
        // 边界情况：空数组且无初始值，报错
        if (this.length === 0) {
            throw new TypeError('Reduce of empty array with no initial value');
        }
        accumulator = this[0];
        startIndex = 1;
    }

    for (let i = startIndex; i < this.length; i++) {
        if (i in this) {
            accumulator = callback(accumulator, this[i], i, this);
        }
    }
    return accumulator;
};
```

### Q9：常用数组方法总结
**参考回答：**
为了方便记忆，我们可以按照**功能**进行分类：

**1. 增删改 (全部改变原数组)**
*   `push()`: 尾部添加，返回新长度。
*   `pop()`: 尾部删除，返回被删元素。
*   `unshift()`: 头部添加，返回新长度。
*   `shift()`: 头部删除，返回被删元素。
*   `splice(start, deleteCount, ...items)`: 任意位置增删改，返回被删元素数组。
    *   **删除**：`arr.splice(1, 2)` (从索引 1 开始删 2 个)。
    *   **插入**：`arr.splice(1, 0, 'a', 'b')` (从索引 1 开始删 0 个，插入 'a', 'b')。
    *   **替换**：`arr.splice(1, 1, 'c')` (从索引 1 开始删 1 个，插入 'c')。
*   `reverse()`: 反转数组，返回反转后的数组。
*   `sort()`: 排序，返回排序后的数组。
*   `fill()`: 填充数组。

**2. 遍历与转换 (不改变原数组)**
*   `forEach()`: 遍历，无返回值 (undefined)。
*   `map()`: 映射，返回新数组。
*   `filter()`: 过滤，返回符合条件的新数组。
*   `reduce()`: 累加/聚合，返回计算结果。
*   `flat()`: 扁平化，返回新数组。
*   `concat()`: 合并，返回新数组。
*   `slice(start, end)`: 切片，返回新数组。

**3. 查找与检测 (不改变原数组)**
*   **找元素/索引**：
    *   `find()`: 返回第一个匹配的**元素**。
    *   `findIndex()`: 返回第一个匹配的**索引**。
    *   `indexOf()`: 查找值的位置，返回索引 (无法查 NaN)。
    *   `lastIndexOf()`: 从后往前找。
*   **布尔检测**：
    *   `includes()`: 是否包含某个值 (能查 NaN)。
    *   `some()`: 是否**至少有一个**满足条件。
    *   `every()`: 是否**所有**都满足条件。
---


