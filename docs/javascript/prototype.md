# 原型、继承与 Class

核心逻辑：JavaScript 的面向对象机制。

## 知识点体系

### 1. 原型三角关系
*   **`prototype`**：构造函数独有的属性，指向原型对象。
*   **`__proto__`**：(隐式原型) 对象独有的属性，指向创建该对象的构造函数的原型对象。
*   **`constructor`**：原型对象上的属性，指回构造函数本身。
*   **关系**：`instance.__proto__ === Constructor.prototype`

### 2. 原型链
当访问一个对象的属性时，如果对象本身没有，就会沿着 `__proto__` 链向上查找，直到找到或者到达 `null`。这条链就是原型链。

### 3. 继承方式演变
*   **原型链继承**：`Child.prototype = new Parent()`。缺点：引用属性共享，无法传参。
*   **构造函数继承**：`Parent.call(this)`。缺点：无法继承原型上的方法。
*   **组合继承**：结合以上两者，`Child.prototype = new Parent()` + `Parent.call(this)`。缺点：调用了两次父类构造函数。
*   **寄生组合继承** (推荐)：`Object.create(Parent.prototype)`。ES6 `extends` 的底层原理。
```javascript
// 原型链继承
function Parent() {
    this.name = 'parent';
}
function Child1() {}
Child1.prototype = new Parent();
// 构造函数继承
function Child2() {
    this.age = 18;
    Parent.call(this);
}
// 寄生组合继承
function Child3() {
    this.age = 18;
    Parent.call(this);
}
Child3.prototype = Object.create(Parent.prototype);
Child3.prototype.constructor = Child3;
```

### 4. ES6 Class
*   **语法糖**：本质还是基于原型的继承。
*   **`extends`**：实现继承。
*   **`super`**：在构造函数中调用父类的构造函数，必须在 `this` 之前调用。
```javascript
class Parent {
    constructor(name) {
        this.name = name;
    }
    greet() {
        console.log(`Hello, I am ${this.name}`);
    }
}
class Child extends Parent {
    constructor(name, age) {
        super(name); // 调用父类构造函数
        this.age = age;
    }
    introduce() {
        console.log(`I am ${this.name}, ${this.age} years old.`);
    }
}
const child = new Child('Alice', 10);
child.greet();      // Hello, I am Alice
child.introduce(); // I am Alice, 10 years old.
```

---

## 面试官怎么问

### Q1: 能否手画一下原型链的关系图？
**参考回答：**
(口述思路)
1.  `f1` 是 `Foo` 的实例：`f1.__proto__ === Foo.prototype`。
2.  `Foo` 是函数，也是对象：`Foo.__proto__ === Function.prototype`。
3.  `Function.prototype` 也是对象：`Function.prototype.__proto__ === Object.prototype` (Function 是被自己创造的，`Function.__proto__ === Function.prototype`)。
4.  `Object.prototype.__proto__ === null` (链的顶端)。

### Q2: new 一个对象的过程发生了什么？
**参考回答：**
1.  **创建新对象**：创建一个空的 JavaScript 对象 `{}`。
2.  **链接原型**：将新对象的 `__proto__` 指向构造函数的 `prototype`。
3.  **绑定 this**：执行构造函数，将 `this` 绑定到新对象上。
4.  **返回对象**：如果构造函数返回了一个对象，则返回该对象；否则返回新创建的对象。

**手写简易版 new：**
```javascript
function myNew(Constructor, ...args) {
    const obj = Object.create(Constructor.prototype);
    const result = Constructor.apply(obj, args);
    return result instanceof Object ? result : obj;
}
```

### Q3: ES6 Class 的 extends 和 ES5 的继承有什么区别？
**参考回答：**
1.  **机制不同**：
    *   ES5 是先创建子类的实例对象 `this`，然后再将父类的方法添加到 `this` 上（`Parent.call(this)`）。
    *   ES6 是先将父类实例对象的属性和方法，加到 `this` 上面（所以必须先调用 `super()`），然后再用子类的构造函数修改 `this`。
2.  **原型链处理**：ES6 继承更加完善，子类的 `__proto__` 会指向父类（继承静态属性），而 ES5 默认不会。

### Q4: 什么是寄生组合式继承？
**参考回答：**
这是 ES5 中最理想的继承方式。
核心逻辑是：不直接调用父类构造函数来赋值给子类原型（避免了两次执行父类构造函数），而是创建一个父类原型的副本赋值给子类原型。
```javascript
function inheritPrototype(subType, superType) {
    var prototype = Object.create(superType.prototype); // 创建对象
    prototype.constructor = subType;                    // 增强对象
    subType.prototype = prototype;                      // 指定对象
}
```

### Q5: 手写instanceof
**参考回答：**
```javascript
function myInstanceof(left, right) {
    let proto = Object.getPrototypeOf(left); // 获取左侧对象的原型
    const prototype = right.prototype;       // 获取右侧构造函数的原型

    while (true) {
        if (proto === null) return false;    // 到达原型链顶端，返回 false
        if (proto === prototype) return true; // 找到匹配的原型，返回 true
        proto = Object.getPrototypeOf(proto); // 沿着原型链向上查找
    }
}
```

### Q6: 手写 new 操作
**参考回答：**
```javascript
function myNew(Constructor, ...args) {
    // 1. 创建一个新对象，原型指向构造函数的 prototype
    const obj = Object.create(Constructor.prototype);
    
    // 2. 绑定 this 并执行构造函数
    const result = Constructor.apply(obj, args);
    
    // 3. 返回对象
    return result instanceof Object ? result : obj;
}
```

