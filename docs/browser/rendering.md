# 浏览器渲染流水线

## 这是什么？

当你输入一个 URL，最终看到页面内容——这中间浏览器做了什么？这一整套从"源代码"到"像素"的过程，叫做**渲染流水线（Rendering Pipeline）**。

理解它，能帮你：
- 解释页面为什么会"卡"或"白屏"
- 知道如何优化动画性能
- 理解回流（Reflow）和重绘（Repaint）的本质

---

## 完整渲染流程总览

```
HTML/CSS/JS
     │
     ▼
┌─────────────┐
│  1. Parse   │  解析 HTML → DOM 树
│             │  解析 CSS → CSSOM 树
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  2. Style   │  DOM + CSSOM 合并 → Render Tree（渲染树）
│  (样式计算)  │  计算每个节点最终的 CSS 样式
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  3. Layout  │  确定每个元素的几何信息（位置、大小）
│  (布局/回流) │  也叫 Reflow
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  4. Paint   │  确定元素的绘制顺序，生成绘制指令列表
│  (绘制/重绘) │  也叫 Repaint
└──────┬──────┘
       │
       ▼
┌──────────────┐
│  5. Composite │  将各图层合成最终画面，交给 GPU 显示
│  (合成)       │
└──────────────┘
```

---

## 第一步：解析（Parse）

### 构建 DOM 树

浏览器的 HTML 解析器（HTML Parser）将 HTML 文本转换成 **DOM 树（Document Object Model Tree）**。

```
<html>              Document
 <body>      →         └── html
  <div>                     └── body
   <p>Hello</p>                  └── div
  </div>                              └── p
 </body>                                   └── "Hello" (Text)
</html>
```

**注意**：遇到 `<script>` 标签时，HTML 解析会**暂停**，等 JS 执行完再继续（除非有 `defer`/`async`）。

浏览器有**预加载扫描器（Preload Scanner）**，在主线程被 JS 阻塞时，它会在后台继续扫描 HTML，预先下载 `<img>`、`<link>` 等外部资源，减少等待时间。

### 构建 CSSOM 树

同时，CSS 解析器将 CSS（包括外部样式表、`<style>` 标签、内联样式）构建成 **CSSOM 树（CSS Object Model Tree）**。

CSSOM 树的结构类似 DOM 树，存储每个节点的样式信息，并处理 CSS 的**层叠和继承**规则。

**注意**：CSS 解析**不会阻塞** HTML 解析，但会阻塞 JS 执行（因为 JS 可以查询 CSS 样式）。

---

## 第二步：样式计算（Style / Recalculate Style）

将 DOM 树和 CSSOM 树合并，为每个**可见** DOM 节点计算出最终的样式，生成**渲染树（Render Tree）**。

```
DOM 树          CSSOM 树
   +              =          渲染树（只含可见元素）
```

关键点：
- `display: none` 的元素**不会**出现在渲染树中（不占位）。
- `visibility: hidden` 的元素**会**在渲染树中（占位，只是不可见）。
- `<head>`、`<script>` 等非视觉元素不会出现在渲染树中。

---

## 第三步：布局（Layout / Reflow）

**回流（Reflow）**就发生在这一步。

布局阶段负责计算渲染树中每个元素的**确切位置和大小**（几何信息），输出一个**盒模型（Box Model）**。

浏览器需要知道：这个 `div` 宽多少？在页面哪个坐标？这个 `p` 文字换了行，高度变了多少？

```
渲染树:
  div (width: 50%, margin: 10px)
    p (font-size: 16px)
      "Hello World"

布局输出:
  div: { x: 10, y: 10, width: 500, height: 40 }
  p:   { x: 10, y: 10, width: 500, height: 40 }
```

---

## 第四步：绘制（Paint / Repaint）

**重绘（Repaint）**就发生在这一步（或者说，Layout 变化一定触发 Paint，但 Paint 变化不一定触发 Layout）。

绘制阶段确定各元素的**视觉呈现顺序**，生成一系列绘制指令（Draw calls），例如：
- "先绘制背景色"
- "在这个位置绘制文字"
- "在这里绘制边框"

注意：这一步是生成**绘制指令列表**，并不是真正把像素画到屏幕上。

元素的绘制顺序很重要，比如 `z-index` 就影响这里，低 `z-index` 先绘制，高 `z-index` 后绘制（覆盖在上面）。

---

## 第五步：合成（Composite）

这一步由**合成线程**完成，不在主线程，因此不受 JS 阻塞。

合成分为两个小步骤：

### 5a. 分层（Layer）

浏览器会把页面分成多个**图层（Layer）**，类似 Photoshop 的图层。会单独提升为图层的情况：
- 有 `will-change: transform` 属性的元素
- 有 `transform: translateZ(0)` 的元素（常见 hack 方式）
- `<video>`、`<canvas>`、`<iframe>` 元素
- 有 `opacity` 动画的元素

### 5b. 栅格化（Rasterize）+ 合成上屏

栅格化线程将每个图层的绘制指令转成位图（像素），然后合成线程将所有图层合并成最终画面，通过 IPC 发给 GPU 进程，最终显示在屏幕上。

---

## 回流（Reflow）vs 重绘（Repaint）vs 合成（Composite）

这是面试**最高频**的问题，需要精确理解三者的代价。

| 操作 | 触发阶段 | 代价 | 常见场景 |
|------|---------|------|---------|
| **回流** | Layout → Paint → Composite | 最大 | 改变宽高、位置、字体大小、添加/删除 DOM |
| **重绘** | Paint → Composite | 中等 | 改变颜色、背景、阴影（不影响几何信息）|
| **合成** | Composite only | 最小 | 只用 `transform`、`opacity` 做动画 |

**核心原则：回流必然触发重绘，重绘不一定触发回流。**

```
改变 width (几何信息变了) → Layout → Paint → Composite  ✗ 代价大
改变 color (只是视觉变了) → Paint → Composite           ✓ 好一些
改变 transform (图层整体移动) → Composite              ✓✓ 最优
```

### 会触发回流的操作

```javascript
// 以下操作会触发回流：
el.style.width = '100px'        // 改变几何属性
el.style.margin = '10px'
el.style.fontSize = '20px'
el.style.display = 'block'      // 改变 display
el.classList.add('big')         // 如果 class 里有几何属性

// 读取以下属性时，浏览器需要"强制同步布局"，也会触发回流：
el.offsetWidth / el.offsetHeight
el.getBoundingClientRect()
el.scrollTop / el.scrollLeft
window.getComputedStyle(el)
```

### 只触发重绘的操作（不触发回流）

```javascript
el.style.color = 'red'
el.style.backgroundColor = '#fff'
el.style.boxShadow = '...'
el.style.outline = '...'
el.style.visibility = 'hidden'  // 注意：display:none 会触发回流
```

### 只触发合成的操作（最优）

```javascript
el.style.transform = 'translateX(100px)'  // 替代 left
el.style.transform = 'scale(1.5)'         // 替代 width/height
el.style.opacity = '0.5'
```

---

## 性能优化：如何减少回流

### 1. 批量修改样式

```javascript
// ❌ 差：三次独立修改，可能触发三次回流
el.style.width = '100px'
el.style.height = '100px'
el.style.margin = '10px'

// ✓ 好：一次性修改 class，只触发一次回流
el.classList.add('new-size')

// ✓ 好：使用 cssText 批量写
el.style.cssText = 'width: 100px; height: 100px; margin: 10px'
```

### 2. 避免"读-写"交替

```javascript
// ❌ 差：强制浏览器同步布局（每次读都需要先完成前面的写）
for (let i = 0; i < elements.length; i++) {
  elements[i].style.width = elements[i].offsetWidth + 10 + 'px'
}

// ✓ 好：先批量读，再批量写
const widths = elements.map(el => el.offsetWidth)
elements.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px'
})
```

### 3. 使用 will-change 提前提升图层

```css
/* 告诉浏览器这个元素即将变化，提前给它独立图层 */
.animated-element {
  will-change: transform;
}
```

注意：不要滥用 `will-change`，每个独立图层都占用内存。

### 4. 使用 DocumentFragment 批量操作 DOM

```javascript
// ❌ 差：每次 appendChild 可能触发回流
for (let i = 0; i < 100; i++) {
  document.body.appendChild(createItem(i))
}

// ✓ 好：先在离线片段操作，最后一次性插入
const fragment = document.createDocumentFragment()
for (let i = 0; i < 100; i++) {
  fragment.appendChild(createItem(i))
}
document.body.appendChild(fragment) // 只触发一次回流
```

### 5. 使用 requestAnimationFrame

```javascript
// ✓ 让动画相关的 DOM 修改在下一帧渲染前执行，避免中间状态
function animate() {
  requestAnimationFrame(() => {
    el.style.transform = `translateX(${pos++}px)`
    animate()
  })
}
```

---

## 面试官怎么问

### Q1: 什么是回流（Reflow）？什么是重绘（Repaint）？

**参考回答：**

- **回流**：当 DOM 的几何信息变化（位置、大小）时，浏览器需要重新计算布局（Layout 阶段），这个过程叫回流，又叫重排。回流之后一定会触发重绘。
- **重绘**：当元素的外观样式（颜色、背景等）变化但几何信息不变时，浏览器跳过 Layout 直接进入 Paint 阶段，这叫重绘。

回流的代价远大于重绘，因为回流可能导致页面大量元素的布局信息需要重新计算（比如一个父元素的大小变了，其所有子元素都要重新布局）。

### Q2: 如何用 CSS 做出性能最好的动画？

**参考回答：**

优先使用 `transform` 和 `opacity`，因为这两个属性的变化只触发合成（Composite）阶段，完全在合成线程中完成，不占用主线程，不会被 JS 阻塞，可以保持 60fps 的流畅度。

```css
/* ✓ 高性能动画 */
.slide-in {
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}

/* ❌ 低性能动画（会触发回流） */
.slide-in-bad {
  animation: slideInBad 0.3s ease;
}
@keyframes slideInBad {
  from { left: -100%; }   /* 改变 left 触发 Layout */
  to   { left: 0; }
}
```

### Q3: 为什么 `transform` 不会触发回流？

**参考回答：**

因为 `transform` 操作的是图层的整体变换矩阵，它不改变元素在文档流中的实际位置和大小，其他元素不会因此重新布局。浏览器会把有 `transform` 动画的元素提升为独立的合成图层，动画时只需要在合成线程中移动这个图层，不需要经过 Layout 和 Paint 阶段。

### Q4: 解释一下 `DOMContentLoaded` 和 `load` 事件的区别。

**参考回答：**

- `DOMContentLoaded`：HTML 文档被完全解析，DOM 树构建完成后触发。此时外部资源（图片、样式表、iframe）可能还没加载完。
- `load`：页面的所有资源（包括图片、样式表、脚本、iframe 等）都加载完成后触发。

从渲染流水线来看：
- DOM 构建完成 → `DOMContentLoaded` 触发
- 所有资源加载完 → `load` 触发

实际开发中：
- 大多数情况用 `DOMContentLoaded`（或 jQuery 的 `$(document).ready()`），因为只需要 DOM 可用即可。
- 需要等图片尺寸之类的场景才用 `load`。
