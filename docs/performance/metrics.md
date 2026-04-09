# 性能指标与度量

> 优化性能的第一步是学会衡量性能。你得知道"快"和"慢"的标准是什么，才能有的放矢地去优化。

---

## 一、用户视角的"快"到底指什么？

用户感知到的"快"不是一个单一事件，而是一个过程。从输入 URL 到页面完全可交互，中间有多个关键节点：

```
用户输入 URL / 点击链接
      ↓
白屏阶段（用户等待，什么也看不到）
      ↓
首次内容出现（FCP）：用户看到第一个文字/图片
      ↓
最大内容出现（LCP）：主要内容渲染完成，用户觉得"页面加载好了"
      ↓
可交互（TTI）：用户可以点击按钮、输入文字，页面不卡
      ↓
页面完全稳定（CLS）：布局不再跳动
```

每个阶段都对应具体的性能指标。

---

## 二、核心性能指标（Core Web Vitals）

Google 定义了 **Core Web Vitals**（核心 Web 指标），是衡量用户体验的三大核心指标，也是面试必知的：

### 2.1 LCP — Largest Contentful Paint（最大内容绘制）

**衡量的是：页面主要内容什么时候渲染完成。**

LCP 关注的是视口内最大的可见元素（通常是 hero 图片、大标题、视频封面）的渲染时间。

| 评级 | 时间 |
|------|------|
| 好 | ≤ 2.5s |
| 需要改进 | 2.5s – 4.0s |
| 差 | > 4.0s |

**常见的 LCP 元素**：
- `<img>` 图片
- `<video>` 的封面图
- 通过 `background-image` 加载的 CSS 背景图
- 包含大量文本的块级元素

**影响 LCP 的因素**：
- 服务器响应慢（TTFB 高）
- 阻塞渲染的 CSS/JS
- 资源加载慢（图片太大）
- 客户端渲染（CSR）导致内容需要 JS 执行后才显示

### 2.2 FID / INP — 交互响应性

**FID（First Input Delay，首次输入延迟）**：用户第一次交互（点击按钮、输入文字）到浏览器实际开始处理的延迟时间。

**INP（Interaction to Next Paint）**：2024 年 3 月 Google 用 INP 替代了 FID。INP 衡量的是整个页面生命周期内所有交互的响应速度，取其中延迟最高的那次（去掉极端值）。

| 评级 | INP |
|------|-----|
| 好 | ≤ 200ms |
| 需要改进 | 200ms – 500ms |
| 差 | > 500ms |

**影响因素**：
- 主线程被长任务阻塞（大量 JS 执行）
- 事件处理函数执行时间过长
- 频繁的重排/重绘

### 2.3 CLS — Cumulative Layout Shift（累计布局偏移）

**衡量的是：页面内容有没有意外"跳动"。**

比如你在读文章，突然上面一张图加载完了，整个页面往下跳，你刚想点的按钮变成了另一个——这就是布局偏移。

| 评级 | CLS 分数 |
|------|---------|
| 好 | ≤ 0.1 |
| 需要改进 | 0.1 – 0.25 |
| 差 | > 0.25 |

**常见原因**：
- 图片/视频没有预设宽高
- 动态插入的内容（广告、弹窗）
- Web 字体加载导致文字大小变化（FOIT/FOUT）
- 动态注入的 DOM 元素推挤已有内容

**解决方法**：
```html
<!-- ✅ 给图片设置明确的宽高，浏览器可以提前预留空间 -->
<img src="photo.jpg" width="800" height="600" alt="photo">

<!-- ✅ 或者用 CSS aspect-ratio -->
<img src="photo.jpg" style="aspect-ratio: 4/3; width: 100%;" alt="photo">
```

---

## 三、其他重要指标

### 3.1 FCP — First Contentful Paint（首次内容绘制）

浏览器渲染出**第一个 DOM 内容**（文字、图片、SVG）的时间。和 LCP 的区别是 FCP 只关心"有没有内容"，LCP 关心"主要内容有没有出来"。

```
白屏 ──→ FCP（第一个内容出现）──→ LCP（主要内容出现）
```

好的标准：FCP ≤ 1.8s

### 3.2 TTFB — Time to First Byte（首字节时间）

从浏览器发起请求到收到服务器响应第一个字节的时间。它衡量的是**服务器响应速度 + 网络延迟**。

```
TTFB = DNS 查询 + TCP 连接 + TLS 握手 + 服务器处理 + 网络传输
```

好的标准：TTFB ≤ 800ms

### 3.3 TTI — Time to Interactive（可交互时间）

页面变得**完全可交互**的时间点——主线程空闲，事件处理程序已注册，用户操作能在 50ms 内响应。

### 3.4 Speed Index（速度指数）

衡量页面内容的**视觉填充速度**——内容从空白到完全可见的过程中，越早填充越好。

---

## 四、所有指标汇总

```
时间线视角：
──────────────────────────────────────────────────→ 时间
│         │              │                │
TTFB      FCP            LCP              TTI
收到首字节  第一个内容     主要内容         完全可交互
          出现           出现
                                   视觉稳定性：CLS（全程累计）
                                   交互响应：INP（全程交互延迟）
```

| 指标 | 衡量什么 | 好的标准 | 优化方向 |
|------|---------|---------|---------|
| **TTFB** | 服务器响应快不快 | ≤ 800ms | CDN、服务端缓存、边缘计算 |
| **FCP** | 多快看到第一个内容 | ≤ 1.8s | 减少阻塞资源、SSR |
| **LCP** | 多快看到主要内容 | ≤ 2.5s | 图片优化、预加载、SSR |
| **INP** | 交互响应快不快 | ≤ 200ms | 减少长任务、优化事件处理 |
| **CLS** | 页面稳不稳定 | ≤ 0.1 | 预设尺寸、字体优化 |
| **TTI** | 多快能操作 | ≤ 3.8s | 代码分割、延迟非关键 JS |

---

## 五、如何测量性能

### 5.1 实验室工具（Lab Tools）

在开发环境中测量，结果可复现：

**Chrome DevTools — Performance 面板**
- 录制页面加载或用户操作
- 查看火焰图（哪些函数耗时长）
- 查看 FCP、LCP、CLS 等指标
- 分析主线程阻塞情况

**Lighthouse**（Chrome DevTools 内置 / CLI）
- 一键跑出性能评分（0-100 分）
- 给出具体的优化建议
- 可在 CI 中自动跑

```bash
# CLI 使用
npx lighthouse https://example.com --output html --output-path report.html
```

### 5.2 实际用户数据（Field Data）

在真实用户环境中测量，反映实际体验：

**Performance API**（浏览器原生 API）

```js
// 获取页面加载各阶段的时间
const timing = performance.getEntriesByType('navigation')[0]
console.log('TTFB:', timing.responseStart - timing.requestStart)
console.log('DOM 加载完成:', timing.domContentLoadedEventEnd - timing.startTime)
console.log('页面完全加载:', timing.loadEventEnd - timing.startTime)
```

```js
// 获取 LCP
new PerformanceObserver((list) => {
  const entries = list.getEntries()
  const lastEntry = entries[entries.length - 1]
  console.log('LCP:', lastEntry.startTime)
}).observe({ type: 'largest-contentful-paint', buffered: true })

// 获取 CLS
let clsScore = 0
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {  // 排除用户主动操作引起的偏移
      clsScore += entry.value
    }
  }
  console.log('CLS:', clsScore)
}).observe({ type: 'layout-shift', buffered: true })
```

**web-vitals 库**（Google 官方，推荐使用）

```js
import { onLCP, onINP, onCLS } from 'web-vitals'

onLCP(console.log)   // { name: 'LCP', value: 2100, rating: 'good' }
onINP(console.log)   // { name: 'INP', value: 150, rating: 'good' }
onCLS(console.log)   // { name: 'CLS', value: 0.05, rating: 'good' }
```

### 5.3 线上性能监控平台

- **Google Search Console**：查看你网站的 Core Web Vitals 报告
- **Sentry Performance**：前端错误监控 + 性能监控
- **自建监控**：用 `web-vitals` 采集数据 → 上报到后端 → 数据看板展示

---

## 面试官怎么问

### Q1：说说你知道的前端性能指标

**参考回答：**

核心指标是 Google 的 Core Web Vitals 三件套：

- **LCP（最大内容绘制）**：主要内容渲染完成的时间，目标 ≤ 2.5s，衡量加载速度
- **INP（交互到下次绘制）**：用户交互到页面响应的延迟，目标 ≤ 200ms，衡量交互响应性（替代了旧的 FID）
- **CLS（累计布局偏移）**：页面布局的视觉稳定性，目标 ≤ 0.1

此外还有 FCP（首次内容出现，≤ 1.8s）、TTFB（服务器首字节响应，≤ 800ms）、TTI（可交互时间）等。

---

### Q2：怎么测量这些指标？

**参考回答：**

两个维度：

开发阶段用 Lighthouse 跑评分、Chrome DevTools Performance 面板录制分析。

线上用 `web-vitals` 库或 PerformanceObserver API 在真实用户端采集数据，上报到监控平台。Google Search Console 也能看到线上的 Core Web Vitals 数据。

---

### Q3：CLS 高怎么排查和解决？

**参考回答：**

CLS 高说明页面布局有明显跳动。常见原因和解决：

1. 图片没有预设宽高 → 给 `<img>` 设置 `width/height` 或用 CSS `aspect-ratio`
2. 动态内容（广告位、懒加载内容）插入推挤 → 提前预留空间（骨架屏/占位元素）
3. Web 字体加载引起文字闪烁 → 用 `font-display: swap` 或预加载字体
4. 动态注入的 DOM 在已有内容上方 → 调整插入位置或使用 CSS `transform` 动画代替布局变化
