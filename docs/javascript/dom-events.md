# DOM 事件机制与委托

核心逻辑：理解浏览器如何处理点击、键盘等交互，以及如何利用这个机制优化性能。

## 知识点体系

### 1. 事件流三阶段 (W3C 标准)
当一个事件发生时，会在元素节点之间按照特定的顺序传播，这个过程分为三个阶段：
1.  **捕获阶段 (Capturing Phase)**：事件从 `window` 对象自上而下向目标节点传播。
2.  **目标阶段 (Target Phase)**：事件到达实际触发事件的目标元素。
3.  **冒泡阶段 (Bubbling Phase)**：事件从目标元素自下而上向 `window` 对象传播。

### 2. 事件监听 API
*   **`addEventListener(type, listener, options/useCapture)`**
    *   `type`: 事件类型 (如 'click')。
    *   `listener`: 事件处理函数。
    *   `options` (可选):
        *   `capture`: `true` 表示在捕获阶段触发，`false` (默认) 表示在冒泡阶段触发。
        *   `once`: `true` 表示只触发一次。
        *   `passive`: `true` 表示永远不会调用 `preventDefault()` (用于优化滚动性能)。
*   **`removeEventListener` 的坑**：如果绑定的是匿名函数，将无法被移除。必须使用命名函数。

### 3. 事件对象 (Event Object)
*   **`event.target`**：**实际触发**事件的元素（点击的那个最内层元素）。
*   **`event.currentTarget`**：**绑定监听器**的元素（`this` 指向的元素）。
*   **阻止行为**：
    *   `event.stopPropagation()`：阻止事件继续传播（冒泡或捕获）。
    *   `event.stopImmediatePropagation()`：阻止事件传播，并阻止当前元素上后续绑定的同类事件监听器执行。
    *   `event.preventDefault()`：阻止默认行为（如链接跳转、表单提交）。

### 4. 事件委托 (Event Delegation)
*   **原理**：利用事件冒泡机制，将子元素的事件统一绑定到父元素上处理。
*   **优势**：
    *   **减少内存占用**：不需要给每个子元素（如列表项）都绑定事件，只需给父元素绑一个。
    *   **动态响应**：后续动态新增的子元素也能自动响应事件，无需重新绑定。

---

## 面试官怎么问

### Q1: 请描述一下 DOM 的事件流。addEventListener 的第三个参数是做什么的？
**参考回答：**
DOM 事件流分为三个阶段：捕获阶段（从 window 到目标）、目标阶段（到达目标元素）、冒泡阶段（从目标回传到 window）。
`addEventListener` 的第三个参数可以是布尔值或对象。
*   如果是布尔值：`true` 代表在捕获阶段触发，`false` (默认) 代表在冒泡阶段触发。
*   如果是对象：可以配置 `capture` (捕获), `once` (只触发一次), `passive` (不阻止默认行为) 等属性。

### Q2: target 和 currentTarget 有什么区别？在事件委托中分别指向谁？
**参考回答：**
*   `target` 是**实际触发事件**的元素（例如用户点击的那个 `li` 或 `span`）。
*   `currentTarget` 是**绑定事件监听器**的元素（例如列表容器 `ul`）。
*   在事件委托中，我们通常在 `currentTarget` (父容器) 上监听事件，然后通过检查 `target` (子元素) 来判断具体是哪个子元素被点击了。

### Q3: 手写一个通用的事件委托函数
**参考回答：**
```javascript
function on(eventType, element, selector, handler) {
    element.addEventListener(eventType, (e) => {
        // 获取实际点击的元素
        let target = e.target;
        
        // 向上查找，直到找到匹配 selector 的元素 或 到达绑定元素 element 为止
        while (target !== element) {
            if (target.matches(selector)) {
                // 找到匹配元素，执行回调，并将 this 指向该元素
                handler.call(target, e, target);
                return;
            }
            target = target.parentNode;
        }
    });
}

// 使用示例
const list = document.querySelector('#list');
on('click', list, 'li', function(e) {
    console.log('点击了 li:', this.innerText);
});
```
