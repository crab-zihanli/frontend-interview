# CSS 基础与原理

核心逻辑：掌握 CSS 的底层渲染规则，是解决样式问题的关键。

## 知识点体系

### 1. 盒模型 (Box Model)
*   **标准盒模型 (`content-box`)**：
    *   `width` = content
    *   总宽度 = width + padding + border + margin
*   **怪异盒模型 (`border-box`)** (推荐)：
    *   `width` = content + padding + border
    *   总宽度 = width + margin
    *   优势：修改 padding/border 不会撑破布局。

### 2. 块级格式化上下文 (BFC)
*   **定义**：BFC 是一个独立的渲染区域，内部元素的渲染不会影响边界以外的元素。
*   **触发条件**：
    *   `float` 不为 none
    *   `position` 为 absolute 或 fixed
    *   `overflow` 不为 visible (常用 `hidden` / `auto`)
    *   `display` 为 inline-block, flex, grid 等
*   **应用场景**：
    *   **清除浮动**：父元素高度塌陷问题。
    *   **防止 Margin 重叠**：属于同一个 BFC 的两个相邻 Box 的 margin 会发生重叠。
    *   **自适应两栏布局**：左浮动，右 BFC (overflow: hidden)。

### 3. 选择器优先级 (Specificity)
*   **权重计算**：
    *   `!important`: 无穷大
    *   行内样式 (`style="..."`): 1000
    *   ID 选择器 (`#id`): 100
    *   类/伪类/属性选择器 (`.class`, `:hover`, `[type]`): 10
    *   标签/伪元素选择器 (`div`, `::before`): 1
    *   通配符 (`*`): 0
*   **规则**：权重值逐级比较，无法进位（11个 class 比如 1个 id 小）。

### 4. 伪类与伪元素
*   **伪类 (`:`)**：描述元素的状态。如 `:hover`, `:nth-child`, `:focus`。
*   **伪元素 (`::`)**：创建文档树中不存在的元素。如 `::before`, `::after` (常用于清除浮动、装饰图标)。

### 5. 重绘与回流 (Repaint & Reflow)
*   **回流 (Reflow/Layout)**：布局引擎计算元素的位置和大小。
    *   触发：添加/删除 DOM、改变尺寸/位置、内容改变、浏览器窗口 resize。
    *   **代价高**。
*   **重绘 (Repaint)**：元素外观改变但不影响布局。
    *   触发：color, background-color, visibility。
    *   **代价低**。
*   **优化**：
    *   使用 `transform` 和 `opacity` 做动画（合成层，不触发回流重绘）。
    *   批量修改 DOM (DocumentFragment)。
    *   避免频繁读取布局属性 (如 `offsetTop` 会强制刷新渲染队列)。

### 6. Sass 预处理器
*   **变量** (`$color`)
*   **嵌套** (`&` 父选择器)
*   **Mixin** (`@mixin`, `@include`)
*   **继承** (`@extend`)

---

## 面试官怎么问

### Q1: 什么是 BFC？它有什么用？
**参考回答：**
BFC (Block Formatting Context) 是块级格式化上下文，是一个独立的渲染区域。
**作用**：
1.  **清除浮动**：父元素设置 `overflow: hidden` 触发 BFC，可以包裹住浮动的子元素，解决高度塌陷。
2.  **防止 Margin 重叠**：将两个 p 标签分别放在不同的 BFC 容器中，可以避免垂直方向的 margin 合并。
3.  **自适应布局**：左边浮动，右边设置 `overflow: hidden`，右边会自动避开浮动区域，形成两栏布局。

### Q2: 讲一下 CSS 选择器的优先级机制？
**参考回答：**
优先级由高到低：`!important` > 行内样式 > ID > 类/属性/伪类 > 标签/伪元素 > 通配符。
计算规则是 (ID, 类, 标签) 的三元组比较。例如 `#nav .list` 权重是 (1, 1, 0)。
注意：继承的样式优先级最低。

### Q3: 为什么说 transform 动画性能更好？
**参考回答：**
因为 `transform` 和 `opacity` 属性的变化可以在**合成线程** (Compositor Thread) 中完成，不需要主线程参与布局 (Reflow) 和绘制 (Repaint)，直接由 GPU 加速合成。而改变 `left` / `top` 等属性会触发回流，消耗 CPU。

### Q4: 伪类和伪元素有什么区别？
**参考回答：**
*   **伪类** (单冒号 `:`) 用于选择处于特定状态的元素（如 `:hover`），它操作的是已存在的元素。
*   **伪元素** (双冒号 `::`) 用于创建一些不在文档树中的元素（如 `::before`），它实际上添加了新的内容。
