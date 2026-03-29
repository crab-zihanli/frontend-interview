# TypeScript 核心基础

核心逻辑：TypeScript 是 JavaScript 的超集，核心在于**静态类型检查**，在编译阶段发现错误。

## 知识点体系

### 1. 特殊类型详解
除了 JS 的基础类型 (`number`, `string`, `boolean` 等)，TS 引入了几个特殊的类型：

*   **`any`**: 任意类型。
    *   关闭了类型检查，相当于写普通 JS。
    *   **注意**：尽量少用，否则 TS 会变成 "AnyScript"。
*   **`unknown`**: 未知类型。
    *   **安全版的 `any`**。可以赋值任何值给 `unknown`，但不能直接调用 `unknown` 类型的方法或属性，必须先进行**类型断言**或**类型收窄** (Type Narrowing)。
*   **`void`**: 空类型。
    *   通常用于没有返回值的函数。
*   **`never`**: 永不存在的值的类型。
    *   场景：抛出异常的函数、无限循环的函数。
    *   作用：用于完整性检查 (Exhaustiveness checking)。

### 2. Interface (接口) vs Type (类型别名)
这是 TS 面试中**最高频**的问题。

*   **相同点**：
    *   都可以描述对象或函数。
    *   都允许扩展 (Interface 用 `extends`, Type 用 `&` 交叉类型)。
*   **不同点**：
    1.  **声明合并 (Declaration Merging)**: Interface 支持同名合并（自动合并属性），Type 不支持（会报错）。
    2.  **类型范围**: Type 更强大，可以定义基本类型别名、联合类型 (`|`)、元组等；Interface 只能定义对象结构。
    3.  **语义**: Interface 主要用于定义"形状"或"契约"（面向对象思维）；Type 只是给类型起个名字。

### 3. 泛型 (Generics)
**定义**：不预先指定具体的类型，而在使用的时候再指定类型的一种特性。
**作用**：提高代码复用性，同时保持类型安全。

```typescript
// 基础写法
function identity<T>(arg: T): T {
    return arg;
}

// 使用
const output = identity<string>("myString"); // T 自动推导为 string
```

**泛型约束 (`extends`)**:
```typescript
interface Lengthwise {
    length: number;
}

// T 必须包含 length 属性
function loggingIdentity<T extends Lengthwise>(arg: T): T {
    console.log(arg.length); 
    return arg;
}
```

### 4. 常用工具类型 (Utility Types)
TS 内置了很多工具类型，面试常问实现原理或用法。

*   **`Partial<T>`**: 将 T 中所有属性变为**可选** (`?`)。
*   **`Required<T>`**: 将 T 中所有属性变为**必选** (`-?`)。
*   **`Readonly<T>`**: 将 T 中所有属性变为**只读** (`readonly`)。
*   **`Pick<T, K>`**: 从 T 中**选取**一组属性 K。
*   **`Omit<T, K>`**: 从 T 中**剔除**一组属性 K。
*   **`Record<K, T>`**: 构造一个对象类型，属性名为 K，属性值为 T。

---

## 面试官怎么问

### Q1: `any` 和 `unknown` 有什么区别？
**参考回答：**
`any` 和 `unknown` 都可以接收任意类型的值。
区别在于**使用时**：
*   `any` 是不安全的，可以随意访问它的属性或方法，TS 不会报错。
*   `unknown` 是安全的，在没有进行类型断言或类型收窄之前，**不允许**访问它的属性或方法。
推荐优先使用 `unknown`。

### Q2: `interface` 和 `type` 选哪个？
**参考回答：**
*   **优先使用 `interface`**：当定义对象、组件 Props、API 响应结构时，因为 interface 语义更清晰，且支持合并（利于库的扩展）。
*   **使用 `type`**：当需要定义联合类型 (`A | B`)、交叉类型、元组、基本类型别名，或者提取复杂的工具类型时。

### Q3: 什么是泛型？为什么要用它？
**参考回答：**
泛型就像是类型的"变量"。
**为什么要用**：
1.  **复用性**：一个函数或类可以处理多种数据类型，而不需要写多份代码。
2.  **类型安全**：相比于使用 `any`，泛型可以捕获参数和返回值之间的类型关系（例如输入是 T，输出也是 T），从而在编译期发现错误。

### Q4: `const` 和 `readonly` 的区别？
**参考回答：**
*   `const` 用于**变量**：防止变量被重新赋值。
*   `readonly` 用于**属性**：防止对象的某个属性被修改。

### Q5: 讲一下 `keyof` 和 `typeof` 的作用？
**参考回答：**
*   **`typeof`**：在类型上下文中获取变量或对象的类型。例如 `type Person = typeof personObj`。
*   **`keyof`**：获取对象类型的所有键，返回一个联合类型。例如 `keyof {x:1, y:2}` 得到 `'x' | 'y'`。
