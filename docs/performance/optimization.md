# 性能优化实战

> 知道了指标，下一步是怎么优化。本章按照"优化链路"的顺序展开：
> **网络层** → **资源层** → **首屏/渲染层** → **运行时**
> 每一层都有独立的优化空间，面试时可以按这条线来答。

---

## 优化全景图

```
用户访问页面的完整路径：

1. 网络层       DNS → TCP → TLS → 服务器响应 → 内容传输
                    ↑ 在这里快，TTFB 就低

2. 资源层       HTML 解析 → CSS/JS/图片/字体 下载
                    ↑ 在这里快，FCP/LCP 就低

3. 渲染层       构建 DOM + CSSOM → Layout → Paint → Composite
                    ↑ 在这里快，页面呈现就快，CLS 就低

4. 运行时       JS 执行 → 用户交互 → 动画
                    ↑ 在这里快，INP 就低，页面不卡
```

---

## 一、网络层优化

### 1.1 减少 DNS 查询时间

每次访问新域名都要 DNS 解析（通常 20-120ms）。

```html
<!-- DNS 预解析：提前解析用到的第三方域名，不等到用的时候才解析 -->
<link rel="dns-prefetch" href="//cdn.example.com">
<link rel="dns-prefetch" href="//fonts.googleapis.com">
```

### 1.2 HTTP/2 多路复用

HTTP/1.1 时代：同一个域名最多 6 个并发请求，请求多了要排队。

HTTP/2：**一个连接可以同时发送多个请求**，没有并发限制。现代网站应该确保服务器支持 HTTP/2。

```
HTTP/1.1：
  请求1 ─→ 等响应 ─→ 请求2 ─→ 等响应 ─→ 请求3...（串行/有限并行）

HTTP/2：
  请求1 ─┐
  请求2 ─┤─ 同一个连接同时发送 ─→ 响应1/2/3 并发返回
  请求3 ─┘
```

### 1.3 使用 CDN

CDN（Content Delivery Network，内容分发网络）在全球各地部署节点，用户访问时自动路由到最近的节点。

```
没有 CDN：                      有 CDN：
用户（上海）→ 服务器（北京）       用户（上海）→ CDN 节点（上海）
延迟：~20ms                      延迟：~2ms
```

静态资源（JS、CSS、图片、字体）都应该放 CDN。

### 1.4 资源缓存策略

**强缓存**（直接用本地缓存，不发请求）：

```nginx
# Nginx 配置
# 带 hash 的文件（内容变了 hash 就变）：永久缓存
location ~* \.(js|css)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    # immutable 告诉浏览器：这个文件永远不会变，不要发条件请求
}

# HTML 文件：不缓存（用户要及时拿到最新的入口）
location ~* \.html$ {
    add_header Cache-Control "no-cache";
}
```

**Webpack/Vite 的 contenthash**（文件内容不变，hash 不变；内容变了，hash 变）：

```js
// webpack.config.js
output: {
  filename: '[name].[contenthash].js'
  // 打出来的文件名如：main.a3f8c2d1.js
  // 文件内容没变 → 文件名没变 → 浏览器命中缓存
  // 文件内容变了 → 文件名变了 → 浏览器下载新文件
}
```

### 1.5 gzip / brotli 压缩传输

服务器在传输时压缩文本文件，浏览器收到后解压，传输体积减少 60-80%。

```nginx
# Nginx 开启 gzip
gzip on;
gzip_types text/plain text/css application/javascript application/json;
gzip_min_length 1024;  # 小于 1KB 不压缩（压缩开销不值得）
```

brotli 是比 gzip 压缩率更高的算法，现代浏览器都支持。

### 1.6 减少重定向

每次重定向都是一次额外的 RTT（往返延迟）。

```
http://example.com → https://example.com → https://www.example.com
（两次重定向，损耗两次 RTT）

优化：服务器直接将 http://example.com 重定向到 https://www.example.com
（一次 RTT）
```

---

## 二、资源层优化

### 2.1 减少和压缩 CSS/JS

构建时：
- JS：Terser 压缩（删除空格、注释、缩短变量名）
- CSS：CSSNano 压缩
- 生产环境删除 `console.log`（Terser 配置 `drop_console: true`）

→ 具体见工程化章节的"打包体积优化"

### 2.2 消除渲染阻塞

浏览器解析 HTML 时，遇到 CSS 和 JS 会停下来——这叫**渲染阻塞**。

```html
<!-- ❌ 阻塞渲染的写法 -->
<head>
  <link rel="stylesheet" href="style.css">  <!-- 必须下载并解析完才继续 -->
  <script src="app.js"></script>            <!-- 必须下载并执行完才继续 -->
</head>

<!-- ✅ 非阻塞写法 -->
<head>
  <link rel="stylesheet" href="style.css">         <!-- CSS 放 head，必须 -->
  <script src="app.js" defer></script>              <!-- defer：下载不阻塞，等 DOM 解析完执行 -->
  <script src="analytics.js" async></script>        <!-- async：下载不阻塞，下载完立即执行 -->
</head>
```

**`defer` vs `async`**：

```
正常 script：  HTML 解析 ─停止─ 下载 JS ─执行─ 继续解析 HTML
async：        HTML 解析 ─并行─ 下载 JS ─执行（打断 HTML 解析）
defer：        HTML 解析 ─并行─ 下载 JS ──── 等 DOM 解析完再执行（顺序保证）

用 defer：适合大部分应用脚本
用 async：适合独立脚本（如统计分析，不依赖 DOM，不被依赖）
```

### 2.3 图片优化

图片通常是页面体积最大的部分。

**选对格式**：

| 格式 | 特点 | 适用场景 |
|------|------|---------|
| JPEG | 有损压缩，不支持透明 | 照片、渐变色图 |
| PNG | 无损，支持透明 | 需要透明背景的图标 |
| WebP | 比 JPEG/PNG 小 25-30%，支持透明 | 现代浏览器（推荐首选）|
| AVIF | 比 WebP 更小，支持更好的色彩 | 更现代的浏览器 |
| SVG | 矢量，无限缩放不失真 | 图标、Logo、简单插画 |

```html
<!-- 用 <picture> 实现格式回退 -->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="photo">  <!-- 最终回退 -->
</picture>
```

**压缩图片**：在不明显影响质量的前提下压缩体积。工具：Squoosh、TinyPNG、imagemin。

**响应式图片**：根据屏幕大小加载不同尺寸的图片。

```html
<!-- 不同屏幕宽度加载不同尺寸，节省移动端流量 -->
<img
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  src="image-800.jpg"
  alt="photo"
>
```

**给图片设置宽高**：避免 CLS。

### 2.4 字体优化

**字体加载问题**：Web 字体文件往往几百 KB，加载期间文字可能不显示（FOIT）或显示备用字体（FOUT）。

```css
/* font-display 控制字体加载行为 */
@font-face {
  font-family: 'MyFont';
  src: url('my-font.woff2') format('woff2');
  font-display: swap;
  /* swap：先用系统字体显示，字体加载完再替换 → 有 FOUT 但用户能看到内容 */
  /* optional：如果字体没在很短时间内加载完就放弃，直接用系统字体 → 无 FOUT */
}
```

**预加载字体**：

```html
<!-- 提前告诉浏览器这个字体要用，优先加载 -->
<link rel="preload" href="/fonts/my-font.woff2" as="font" type="font/woff2" crossorigin>
```

---

## 三、首屏加载优化

首屏优化的核心目标：**让用户尽快看到有意义的内容（LCP 快），而不是等所有资源加载完**。

### 3.1 代码分割与路由懒加载

不把所有 JS 打成一个大 bundle，而是按路由/功能分割，首屏只加载必要的代码。

```jsx
// React 路由懒加载
import React, { Suspense } from 'react'
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Profile = React.lazy(() => import('./pages/Profile'))

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  )
}
// 用户访问首页时，Dashboard 和 Profile 的代码根本不会下载
// 只有路由跳转到对应页面时才动态加载
```

```js
// Vue Router 懒加载
const routes = [
  { path: '/', component: () => import('./pages/Home.vue') },
  { path: '/about', component: () => import('./pages/About.vue') }
]
```

### 3.2 图片懒加载（Lazy Loading）

不在视口内的图片不加载，等滚动到视口附近时再加载。

**方式一：原生 `loading="lazy"`（推荐，最简单）**

```html
<!-- 视口外的图片不加载，滚动到附近时自动加载 -->
<img src="big-photo.jpg" loading="lazy" alt="photo">
```

**方式二：IntersectionObserver API（自定义控制）**

```js
// 更灵活，可以控制提前加载的时机
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target
      img.src = img.dataset.src  // 把 data-src 赋值给 src，触发加载
      observer.unobserve(img)    // 加载后取消观察
    }
  })
}, {
  rootMargin: '200px'  // 提前 200px 开始加载（在进入视口前就开始）
})

document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img))
```

```html
<!-- 配合 data-src 使用 -->
<img data-src="photo.jpg" src="placeholder.jpg" alt="photo">
```

### 3.3 组件懒加载（虚拟列表）

如果页面有一个超长列表（比如 10000 条数据），不可能把 10000 个 DOM 节点都渲染出来，只渲染视口内可见的那部分——这就是**虚拟列表（Virtual List）**。

```
真实渲染的 DOM 节点：只有视口内的 ~20 条
滚动时：销毁顶部不可见的，创建底部新进入视口的
用户感觉上：滚了 10000 条，其实 DOM 只有 20 条
```

库：`react-virtual`、`vue-virtual-scroller`、`react-window`

### 3.4 骨架屏（Skeleton Screen）

在内容加载时显示与真实内容布局相似的灰色占位骨架，比 loading spinner 更好：
- 用户知道内容大概会在哪里出现，感知上更快
- 预先占据空间，防止内容加载后产生 CLS

```jsx
// 简单骨架屏示例
function UserCard({ loading, user }) {
  if (loading) {
    return (
      <div className="skeleton">
        <div className="skeleton-avatar" />      {/* 灰色圆形占位 */}
        <div className="skeleton-name" />         {/* 灰色长条占位 */}
        <div className="skeleton-desc" />         {/* 灰色短条占位 */}
      </div>
    )
  }
  return <div>真实的用户信息</div>
}
```

### 3.5 SSR / SSG（服务端渲染）

**CSR（客户端渲染）的问题**：

```
1. 浏览器下载空的 HTML
2. 下载并执行 JS bundle
3. JS 请求接口拿数据
4. JS 渲染真实内容
→ 用户要等步骤 1-4 全部完成才能看到内容（FCP/LCP 都很晚）
```

**SSR（服务端渲染）**：

```
1. 服务器在响应时就把完整 HTML（含数据）发给浏览器
2. 浏览器直接渲染（FCP/LCP 很早）
3. 下载 JS，"注水"（Hydration）——让静态 HTML 变成可交互的
→ 用户很快看到内容，虽然 Hydration 完成前不能交互
```

SSR 框架：Next.js（React）、Nuxt.js（Vue）

**SSG（静态站点生成）**：在构建时就生成 HTML 文件，不需要服务器实时渲染。适合博客、文档等内容不频繁变化的场景。

### 3.6 资源预加载

```html
<!-- preload：当前页面肯定要用，提前加载，优先级高 -->
<link rel="preload" href="critical.css" as="style">
<link rel="preload" href="hero-image.jpg" as="image">
<link rel="preload" href="app.js" as="script">

<!-- prefetch：下一个页面可能要用，浏览器空闲时加载，优先级低 -->
<link rel="prefetch" href="/next-page.js">

<!-- preconnect：提前建立连接（DNS + TCP + TLS），但不加载资源 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
```

**preload vs prefetch**：

| | preload | prefetch |
|--|---------|----------|
| 时机 | 立即下载，高优先级 | 浏览器空闲时下载，低优先级 |
| 用途 | 当前页面的关键资源 | 下一个页面的资源 |
| 场景 | 字体、hero 图、关键 CSS | 路由预加载 |

---

## 四、渲染层优化

### 4.1 减少重排（Reflow）和重绘（Repaint）

**重排（Reflow）**：元素的尺寸、位置发生变化，浏览器要重新计算布局，开销大。

**重绘（Repaint）**：元素的外观变化（颜色、背景），但不影响布局，开销较小。

```
触发重排的操作（代价高）：
- 修改 width/height/padding/margin/border
- 修改 position/display/float
- 读取 offsetWidth/scrollHeight 等布局属性（强制同步布局）

触发重绘不触发重排（代价低）：
- 修改 color/background-color/visibility/box-shadow

不触发重排重绘（最好）：
- 修改 transform/opacity（走 GPU 合成层）
```

**优化技巧**：

```js
// ❌ 多次读写 DOM，触发多次强制同步布局（Layout Thrashing）
for (let i = 0; i < 100; i++) {
  const width = element.offsetWidth  // 读（强制 reflow）
  element.style.width = width + 1 + 'px'  // 写（标记 reflow）
}

// ✅ 批量读，批量写
const width = element.offsetWidth  // 读一次
for (let i = 0; i < 100; i++) {
  element.style.width = width + 1 + 'px'  // 只写，不触发同步 reflow
}
```

```js
// ✅ 用 DocumentFragment 批量操作 DOM
const fragment = document.createDocumentFragment()
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li')
  li.textContent = `Item ${i}`
  fragment.appendChild(li)  // 操作的是内存中的 fragment，不触发 reflow
}
list.appendChild(fragment)  // 只触发一次 reflow
```

### 4.2 用 CSS 动画代替 JS 动画

```css
/* ❌ JS 操作 top/left：触发重排，卡顿 */
/* element.style.left = x + 'px' */

/* ✅ CSS transform：走 GPU 合成层，不触发重排重绘，流畅 */
.element {
  transition: transform 0.3s ease;
}
.element.moved {
  transform: translateX(100px);
}

/* ✅ will-change：提示浏览器提前创建合成层（谨慎使用，内存换性能） */
.animated-element {
  will-change: transform;
}
```

**为什么 transform 不触发重排**：`transform` 和 `opacity` 的变化在**合成线程**（Compositor Thread）上处理，完全绕过了主线程的 Layout 和 Paint 阶段，不阻塞主线程。

---

## 五、运行时优化

### 5.1 防抖（Debounce）与节流（Throttle）

高频事件（`scroll`、`resize`、`input`）如果直接绑定复杂处理函数，会导致主线程过载，页面卡顿。

**防抖（Debounce）**：事件停止触发后等 n 毫秒才执行。适合"最终结果"场景。

```js
// 搜索框输入：用户停止输入 300ms 后才发请求，避免每次击键都发请求
function debounce(fn, delay) {
  let timer = null
  return function(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

input.addEventListener('input', debounce(search, 300))
```

**节流（Throttle）**：每隔 n 毫秒最多执行一次。适合"持续执行"场景。

```js
// 滚动事件：每 16ms（约 60fps）最多执行一次，避免每次滚动都触发
function throttle(fn, interval) {
  let lastTime = 0
  return function(...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

window.addEventListener('scroll', throttle(handleScroll, 16))
```

| | 防抖 | 节流 |
|--|------|------|
| 行为 | 最后一次触发后执行 | 固定频率执行 |
| 适合 | 搜索框、表单提交、窗口 resize | 滚动事件、鼠标移动、拖拽 |

### 5.2 Web Worker：把耗时计算移出主线程

JS 是单线程的，复杂计算会阻塞主线程，导致页面卡顿。Web Worker 允许在后台线程执行 JS，不阻塞 UI。

```js
// main.js（主线程）
const worker = new Worker('worker.js')
worker.postMessage({ data: hugeArray })        // 发送数据
worker.onmessage = (e) => {
  console.log('计算结果:', e.data.result)       // 接收结果
}

// worker.js（后台线程，没有 DOM 访问权限）
self.onmessage = (e) => {
  const result = heavyCalculation(e.data.data)  // 耗时计算，不阻塞主线程
  self.postMessage({ result })
}
```

适合场景：数据处理、图像处理、加密计算、大数据排序。

### 5.3 requestAnimationFrame

在动画中，用 `requestAnimationFrame` 代替 `setTimeout`/`setInterval`：

```js
// ❌ setTimeout：时机不准，可能在两帧之间执行，造成视觉卡顿
setInterval(() => { element.style.left = x++ + 'px' }, 16)

// ✅ requestAnimationFrame：在浏览器每次重绘前执行，与帧率同步，更流畅
function animate() {
  x++
  element.style.left = x + 'px'
  requestAnimationFrame(animate)  // 注册下一帧的回调
}
requestAnimationFrame(animate)
```

### 5.4 长任务拆分（Time Slicing）

超过 50ms 的 JS 任务叫**长任务（Long Task）**，会导致页面无响应（因为这段时间浏览器无法响应用户输入）。

```js
// ❌ 一次性处理 10000 条数据，阻塞主线程
function processAll(items) {
  items.forEach(item => processItem(item))
}

// ✅ 分批处理，每批处理完让出主线程，浏览器有机会处理用户输入
async function processInChunks(items, chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    chunk.forEach(item => processItem(item))
    // 让出主线程，相当于说"你先处理一下用户事件，我等一下再继续"
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

// 更优雅：用 scheduler.yield()（现代浏览器）
async function processWithYield(items) {
  for (const item of items) {
    processItem(item)
    if (/* 每隔一段时间 */ shouldYield()) {
      await scheduler.yield()  // 让出给更高优先级的任务
    }
  }
}
```

---

## 面试官怎么问

### Q1：说说前端性能优化的思路

**参考回答：**

我会从四个层面来考虑：

**网络层**：CDN 加速静态资源、开启 gzip/brotli 压缩、合理的缓存策略（强缓存 + contenthash）、HTTP/2 多路复用、DNS 预解析。

**资源层**：JS/CSS 压缩和 Tree Shaking；代码分割让首屏少加载 JS；图片选对格式（WebP）、懒加载、响应式图片；消除 `<script>` 的渲染阻塞（用 `defer`）；字体用 `font-display: swap`。

**首屏层**：路由和组件懒加载；骨架屏减少感知等待；SSR/SSG 让服务器直接返回带内容的 HTML（LCP 大幅提升）；关键资源 `preload` 预加载。

**运行时**：高频事件加防抖/节流；动画用 CSS `transform/opacity`（走 GPU 合成层，不触发重排）；耗时计算用 Web Worker；长任务分片避免阻塞主线程；长列表用虚拟滚动。

---

### Q2：图片懒加载怎么实现？

**参考回答：**

两种方式：

最简单的是原生 `loading="lazy"` 属性，浏览器原生支持，一个属性搞定，现代浏览器全支持。

更灵活的是 `IntersectionObserver`：把真实图片地址放在 `data-src`，`src` 用占位图；用 `IntersectionObserver` 监听图片是否进入视口，进入时把 `data-src` 赋给 `src` 触发加载，然后取消观察。可以通过 `rootMargin` 控制提前多少开始加载，比如 `200px` 提前两百像素就开始。

---

### Q3：什么是防抖和节流？分别适合什么场景？

**参考回答：**

防抖：事件停止触发后等 n 毫秒才执行，如果这期间又触发就重新计时。适合"最终结果"场景：搜索框输入（用户停止输入再发请求）、表单验证、窗口 resize（停止调整后才重新布局）。

节流：不管触发多频繁，每隔 n 毫秒最多执行一次。适合"持续反馈"场景：滚动事件（实时更新进度条）、鼠标移动、拖拽。

---

### Q4：为什么 CSS transform 做动画比修改 top/left 流畅？

**参考回答：**

修改 `top/left` 会触发重排（Layout）——浏览器要重新计算所有元素的位置，然后重绘，开销很大，而且在主线程执行，容易阻塞交互。

`transform` 和 `opacity` 的变化不影响布局，浏览器会把对应元素提升到合成层（Compositing Layer），由合成线程（GPU）处理，完全跳过了 Layout 和 Paint 阶段，不占用主线程，所以流畅。

---

### Q5：首屏加载慢怎么排查和优化？

**参考回答：**

先用 Lighthouse 或 Chrome DevTools Network 面板找瓶颈。通常从几个方向着手：

1. **LCP 元素是什么**：如果是大图片，压缩图片、转 WebP、`preload` 预加载、`loading="eager"`（不懒加载关键图片）
2. **JS bundle 太大**：做代码分割，路由懒加载，去掉未用的大库
3. **服务器响应慢（TTFB 高）**：上 CDN 或 SSR 缓存
4. **阻塞渲染的资源**：非关键 JS 加 `defer`，内联关键 CSS
5. **纯 CSR 项目**：考虑用 SSR（Next.js/Nuxt.js），让服务端直接返回带内容的 HTML
