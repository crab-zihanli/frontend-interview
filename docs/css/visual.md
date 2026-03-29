# CSS 视觉与动画

核心逻辑：让页面动起来，提升用户体验。

## 知识点体系

### 1. CSS3 新特性
*   **圆角** (`border-radius`)
*   **阴影** (`box-shadow`, `text-shadow`)
*   **渐变** (`linear-gradient`, `radial-gradient`)
*   **变换** (`transform`): translate, scale, rotate, skew。
*   **过渡** (`transition`)
*   **动画** (`animation`)

### 2. Transition vs Animation
*   **Transition (过渡)**：
    *   需要**触发条件** (如 :hover, class 变化)。
    *   只有**开始**和**结束**两个状态。
    *   是一次性的。
*   **Animation (动画)**：
    *   可以**自动运行**，无需外部触发。
    *   可以定义关键帧 (`@keyframes`)，控制**中间状态**。
    *   可以循环播放 (`infinite`)。

### 3. 动画属性详解
*   `animation-name`: 关键帧名称。
*   `animation-duration`: 持续时间。
*   `animation-timing-function`: 速度曲线 (linear, ease-in-out, steps)。
*   `animation-delay`: 延迟时间。
*   `animation-iteration-count`: 播放次数 (infinite)。
*   `animation-direction`: 播放方向 (normal, reverse, alternate)。
*   `animation-fill-mode`: 动画结束后的状态 (forwards 保留最后一帧, backwards)。

### 4. 画图形 (CSS Shapes)
*   **三角形原理**：利用 border。将 width/height 设为 0，设置 4 个方向的 border，其中 3 个设为 transparent，剩下的一个就是三角形。

---

## 面试官怎么问

### Q1: CSS 怎么画一个三角形？
**参考回答：**
```css
.triangle {
    width: 0;
    height: 0;
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-bottom: 100px solid red; /* 只有底部有颜色，形成向上的三角形 */
}
```
原理是：当宽高为 0 时，border 的交界处是斜切的。

### Q2: transition 和 animation 的区别？
**参考回答：**
1.  **触发方式**：transition 需要状态变化触发；animation 可以自动运行。
2.  **精细度**：transition 只有首尾两帧；animation 可以通过 `@keyframes` 定义任意多的中间帧。
3.  **循环**：transition 只能运行一次；animation 可以无限循环。

### Q3: 如何让一个动画停留在最后一帧？
**参考回答：**
设置 `animation-fill-mode: forwards;`。

### Q4: 什么是硬件加速 (GPU 加速)？怎么触发？
**参考回答：**
硬件加速是指利用 GPU 来渲染页面，提高渲染性能，特别是动画性能。
**触发方式**：
*   `transform: translateZ(0)` 或 `translate3d(0,0,0)`
*   `will-change: transform`
*   `opacity` 动画
使用这些属性时，浏览器会将元素提升到一个独立的**合成层** (Compositing Layer)，避免主线程的回流和重绘。
