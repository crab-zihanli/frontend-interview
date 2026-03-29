# CSS 布局与定位

核心逻辑：如何把元素摆放到正确的位置，是 CSS 最核心的能力。

## 知识点体系

### 1. Flex 布局 (Flexbox)
*   **容器属性**：
    *   `flex-direction`: row | column (主轴方向)
    *   `justify-content`: flex-start | center | space-between (主轴对齐)
    *   `align-items`: stretch | center | flex-start (交叉轴对齐)
    *   `flex-wrap`: nowrap | wrap (换行)
*   **项目属性**：
    *   `flex-grow`: 放大比例 (默认为 0，即存在剩余空间也不放大)。
    *   `flex-shrink`: 缩小比例 (默认为 1，空间不足时会自动缩小)。
    *   `flex-basis`: 初始大小 (默认为 auto)。
    *   **简写 `flex`**：`flex: 1` 等同于 `flex: 1 1 0%` (最常用，自动填满剩余空间)。

### 2. 定位 (Position)
*   **`static`**：默认值，正常文档流。
*   **`relative`**：相对定位。**不脱离文档流**，相对于自身原始位置偏移。常作为 absolute 的父级参照物 ("子绝父相")。
*   **`absolute`**：绝对定位。**脱离文档流**，相对于最近的非 static 祖先元素定位。
*   **`fixed`**：固定定位。**脱离文档流**，相对于视口 (Viewport) 定位。
*   **`sticky`**：粘性定位。结合了 relative 和 fixed，在跨越阈值前是 relative，跨越后是 fixed。

### 3. 水平垂直居中方案
*   **方案一：Flex (最推荐)**
    ```css
    .parent {
        display: flex;
        justify-content: center;
        align-items: center;
    }
    ```
*   **方案二：绝对定位 + transform (未知宽高)**
    ```css
    .child {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }
    ```
*   **方案三：绝对定位 + margin: auto (已知宽高)**
    ```css
    .child {
        position: absolute;
        left: 0; right: 0; top: 0; bottom: 0;
        margin: auto;
    }
    ```

### 4. 响应式布局
*   **媒体查询 (@media)**：根据屏幕宽度应用不同样式。
*   **rem / em**：
    *   `em`: 相对于父元素字体大小。
    *   `rem`: 相对于根元素 (`html`) 字体大小。常配合 JS 动态设置 html fontSize 做移动端适配。
*   **vw / vh**：相对于视口宽高的百分比。

### 5. 常见布局模式
*   **多栏布局**：Flex 实现，或 Grid 实现。
*   **圣杯/双飞翼布局**：左右固定，中间自适应（现在直接用 Flex 搞定）。

---

## 面试官怎么问

### Q1: flex: 1 代表什么？
**参考回答：**
`flex: 1` 是 `flex-grow: 1`, `flex-shrink: 1`, `flex-basis: 0%` 的缩写。
这意味着该元素会：
1.  **瓜分剩余空间** (grow: 1)。
2.  **空间不足时缩小** (shrink: 1)。
3.  **不预留初始空间** (basis: 0%)，即完全根据剩余空间分配。

### Q2: position: absolute 是相对于谁定位的？
**参考回答：**
相对于最近的**非 static** (即 position 为 relative, absolute, fixed, sticky) 的祖先元素定位。如果找不到这样的祖先，则相对于初始包含块 (通常是 `<html>` 视口)。

### Q3: 怎么实现一个元素在屏幕正中间？
**参考回答：**
首选 Flex 布局：父元素 `display: flex; justify-content: center; align-items: center; height: 100vh;`。
如果是兼容老浏览器或特定场景，可以用绝对定位 + `transform: translate(-50%, -50%)`。

### Q4: 移动端适配方案有哪些？rem 和 vw 怎么选？
**参考回答：**
1.  **rem 方案**：通过 JS 监听 resize 事件动态修改 `html` 的 `font-size`，页面元素用 `rem` 单位。兼容性好。
2.  **vw 方案**：直接使用 `vw` 单位。现在浏览器支持度已经很好，是更推荐的纯 CSS 方案。
