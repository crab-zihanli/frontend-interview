# HTML 高频面试题清单

口语化整理，涵盖 HTML5、标签语义、脚本加载与 DOM 操作。

## 一、HTML5 新特性与语义化

### 1. HTML5 有哪些新特性？

HTML5 不只是新增标签，而是一整套 Web 标准的升级，核心包括：

- 语义化标签：`header`、`footer`、`nav`、`article`、`section` 等，结构更清晰。
- 增强型表单：`input` 新增 `date`、`email`、`url` 等类型，以及 `placeholder`、`required` 等属性。
- 媒体支持：原生支持 `video` 和 `audio`，不再依赖 Flash。
- 绘图能力：提供 Canvas（位图）与 SVG（矢量图）支持。
- 存储机制：提供 `localStorage`、`sessionStorage`。
- 新 API：WebSocket、Web Workers、Geolocation 等。

### 2. HTML5 语义化的优点是什么？

主要有 3 点：

1. 利于 SEO：搜索引擎更容易理解页面结构和关键内容。
2. 提升可访问性：屏幕阅读器可识别“导航”“正文”等区域。
3. 提高可维护性：即使无样式，结构也清晰，协作成本更低。

### 3. 实际项目中，如何权衡语义化和无意义的 div？

建议原则：

- 主体结构优先语义化：头部、导航、主体、侧栏、页脚等使用语义标签。
- 布局或视觉包裹层使用 `div`：例如 Flex wrapper、背景层、装饰层。
- 不要为了“语义化而语义化”，以可读性和一致性为第一优先级。

## 二、标签与属性细节

### 4. DOCTYPE 的作用？标准模式和怪异模式的区别？

- DOCTYPE：告诉浏览器按哪个 HTML 规范解析文档。
- 不写 DOCTYPE 可能触发怪异模式（Quirks Mode）。

区别：

- 标准模式：按 W3C 标准渲染页面。
- 怪异模式：兼容旧浏览器行为，最典型差异是盒模型计算规则。

### 5. 行内元素、块级元素、空元素有哪些？

- 块级元素（Block）：独占一行，如 `div`、`p`、`h1-h6`、`ul`、`li`、`header`。
- 行内元素（Inline）：不独占一行，如 `span`、`a`；`img`、`input` 属于行内替换元素，可设置宽高。
- 空元素（Void）：没有闭合标签，如 `br`、`hr`、`img`、`input`、`link`、`meta`。

### 6. a 标签可以包块级元素吗？

- HTML4 时代限制较多。
- HTML5 中允许 `a` 包裹块级结构。

原因：现代网页常见“整卡可点击”交互，`a` 包 `div/section` 可扩大点击热区，交互体验更好。

### 7. href 和 src 的区别？为什么 CSS 用 href，JS 用 src？

本质是“引用关系”与“资源引入替换”：

- `src`（Source）：引入资源并作为当前内容的一部分处理，例如 `script src`、`img src`。
- `href`（Hypertext Reference）：建立引用关系，例如 `link href` 引用样式资源。

常见现象：

- JS 默认会影响解析和执行时机（可通过 `defer/async` 调整）。
- CSS 文件通常并行下载，用于后续渲染计算。

### 8. img 标签的 title 和 alt 有什么区别？

- `alt`：图片加载失败时的替代文本，也是无障碍阅读的重要信息源，对 SEO 也关键。
- `title`：鼠标悬停时显示的提示信息，属于补充说明。

## 三、脚本加载与性能

### 9. script 标签放在 head 和 body 底部的区别？

- 放在 `head`：若无 `defer/async`，会阻塞 HTML 解析，可能增加首屏等待。
- 放在 `body` 底部：通常先渲染页面内容，再加载执行脚本，首屏体感更好。

### 10. defer 和 async 的区别？

两者都可让脚本异步下载，核心区别是执行时机：

- `async`：下载完成后立即执行，多个脚本执行顺序不可控。
- `defer`：下载后不立即执行，等 HTML 解析完成后按声明顺序执行（在 `DOMContentLoaded` 之前）。

记忆口诀：

- async：乱序立即执行。
- defer：顺序延迟执行。

### 11. DOMContentLoaded 会受 defer 和 async 影响吗？

- 对 `defer`：会受影响，事件会等待 defer 脚本执行完成。
- 对 `async`：通常不等待，async 何时执行取决于下载完成时机。

## 四、DOM 操作与高级特性

### 12. DOM 操作对性能有影响吗？为什么要用 DocumentFragment？

有影响。频繁 DOM 读写可能触发回流（Reflow）和重绘（Repaint），开销较高。

`DocumentFragment` 是内存中的轻量容器：

- 先在 Fragment 中批量构建节点（不直接影响页面）。
- 最后一次性插入真实 DOM，减少回流次数。

### 13. Canvas 和 SVG 的区别？

| 特性 | Canvas | SVG |
| --- | --- | --- |
| 本质 | 位图（像素） | 矢量图（XML/DOM） |
| 事件处理 | 监听画布后自行命中计算 | 图形节点可直接绑定事件 |
| 适用场景 | 游戏、粒子效果、大量动态绘制 | 图标、地图、可缩放图表 |

### 14. WebSocket 是什么？

WebSocket 是在单个 TCP 连接上进行全双工通信的协议。

特点：

- 通过 HTTP 握手升级协议建立连接。
- 建连后服务端可主动推送消息。
- 适用于聊天室、实时行情、协同编辑等实时场景。

### 15. iframe 的优缺点？如何实现跨域通信？

优点：

- 可嵌入第三方页面（如地图、广告）。
- 与主页面隔离，具备一定沙箱特性。

缺点：

- 可能影响主页面加载时机。
- SEO 不友好。
- 交互和样式管理复杂度高。

跨域通信：

- 推荐 `window.postMessage()`。
- 发送方：`iframe.contentWindow.postMessage(data, targetOrigin)`
- 接收方：`window.addEventListener('message', handler)`
