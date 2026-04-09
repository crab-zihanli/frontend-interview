# 构建工具：Webpack 与 Vite

> 工程化的核心是"把源码变成浏览器能运行的代码"。这一章讲的是这个过程的核心角色——构建工具，以及它们背后的原理。

---

## 一、先搞清楚：Bundle/Chunk/Module 是什么

在学 Webpack 之前，先把这三个基本概念理解清楚。

### Module（模块）

**模块就是每一个文件。**

你写的每一个 `.js`、`.css`、`.png`、`.vue` 文件，在 Webpack 眼里都是一个模块。它们之间通过 `import` / `require` 连接起来，形成一张**依赖图（Dependency Graph）**。

```js
// a.js
import { add } from './math.js'   // math.js 是 a.js 的依赖模块
console.log(add(1, 2))
```

### Chunk（代码块）

**Chunk 是 Webpack 在构建过程中产生的"中间产物"，是一组模块的集合。**

Webpack 在打包时，不是把所有模块直接输出，而是先把它们组合成若干个 Chunk。Chunk 的产生有三种方式：

1. **入口 Chunk**：`entry` 配置里的每个入口，都会产生一个 Chunk
2. **异步 Chunk**：通过 `import()` 动态导入的代码，会被单独切割成一个 Chunk（代码分割）
3. **提取 Chunk**：通过 `SplitChunksPlugin` 把公共模块提取出来，形成新的 Chunk

```js
// 动态导入 → 产生一个新的异步 Chunk
const Modal = import('./Modal.js')
```

### Bundle（包/产物）

**Bundle 是最终输出的文件，通常一个 Chunk 对应一个 Bundle 文件。**

打包完成后你在 `dist/` 目录下看到的 `.js` 文件，就是 Bundle。

```
三者关系总结：
Module（源文件）→ 组合 → Chunk（中间组） → 输出 → Bundle（最终文件）

一个 Bundle = 一个 Chunk 的最终输出
一个 Chunk = 多个 Module 的集合
一个 Module = 一个源文件
```

---

## 二、Webpack 核心原理

### 2.1 Webpack 是什么

Webpack 是一个**静态模块打包工具**。它以一个或多个文件为入口，递归地找出所有依赖，然后把它们打包成一个（或多个）浏览器可以直接运行的文件。

它解决的核心问题：
- 浏览器不支持 CommonJS / ES Module（老版本）
- 图片、CSS、字体等非 JS 资源无法直接被 JS `import`
- 文件太多，HTTP 请求过多，需要合并

### 2.2 Webpack 构建流程（面试高频）

整个流程可以分为五个阶段：

```
①初始化
  读取 webpack.config.js，合并配置，创建 Compiler 对象
        ↓
②确定入口
  从 entry 出发，找到第一个要处理的模块
        ↓
③编译模块（核心循环）
  对每个模块：
    用匹配的 Loader 进行转换（如 babel-loader 把 ES6→ES5）
    解析转换后代码中的 import/require，找出依赖
    把依赖加入队列，递归处理
    → 最终得到：所有模块的转换结果 + 完整依赖关系图
        ↓
④组装 Chunk
  根据依赖关系图 + 代码分割配置，把模块组装成一个个 Chunk
        ↓
⑤输出文件（Seal + Emit）
  把每个 Chunk 渲染成最终的 Bundle 文件，写入磁盘（dist/）
```

**关键对象**：
- `Compiler`：代表整个 Webpack 编译器实例，贯穿整个生命周期
- `Compilation`：代表一次具体的编译过程，每次重新编译都是一个新的 Compilation

### 2.3 Loader（加载器）

**Loader 的本质：是一个函数，接收源文件内容，返回转换后的内容。**

Webpack 本身只认识 JS 和 JSON，其他文件类型（CSS、图片、TypeScript 等）都需要通过 Loader 转换成 JS 能理解的形式。

```js
// webpack.config.js 中配置 Loader
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,         // 匹配 .ts 或 .tsx 文件
        use: 'ts-loader',        // 用 ts-loader 处理
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        // 注意：多个 Loader 从右到左执行！
        // 先 css-loader（处理 @import 和 url()）
        // 再 style-loader（把 CSS 注入 DOM）
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|gif)$/,
        type: 'asset/resource'    // Webpack 5 内置，替代 file-loader
      }
    ]
  }
}
```

**常见 Loader**：

| Loader | 作用 |
|--------|------|
| `babel-loader` | ES6+ → ES5 |
| `ts-loader` / `esbuild-loader` | TypeScript → JS |
| `css-loader` | 处理 CSS 中的 `@import` 和 `url()` |
| `style-loader` | 将 CSS 以 `<style>` 标签注入页面 |
| `sass-loader` | Sass/SCSS → CSS |
| `file-loader` | 处理文件资源，输出到 dist |
| `url-loader` | 小文件转 Base64，大文件走 file-loader |

**Loader 执行顺序**：多个 Loader 时，**从右到左**（或从下到上）依次执行。

```js
use: ['style-loader', 'css-loader', 'sass-loader']
// 实际执行顺序：sass-loader → css-loader → style-loader
```

### 2.4 Plugin（插件）

**Plugin 的本质：监听 Webpack 构建过程中的各种"钩子"，在特定时机执行额外的操作。**

Loader 只能处理单个文件的转换，Plugin 则能参与整个构建流程，做更复杂的事。

```js
// webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  plugins: [
    // 自动生成 HTML 并注入 bundle
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    // 把 CSS 提取成独立文件（而不是注入 style 标签）
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    })
  ]
}
```

**常见 Plugin**：

| Plugin | 作用 |
|--------|------|
| `HtmlWebpackPlugin` | 生成 HTML 并自动引入 bundle |
| `MiniCssExtractPlugin` | 提取 CSS 为独立文件 |
| `DefinePlugin` | 定义全局常量（如注入环境变量） |
| `CopyWebpackPlugin` | 复制静态资源到 dist |
| `BundleAnalyzerPlugin` | 可视化分析打包结果 |
| `CleanWebpackPlugin` | 每次打包前清空 dist 目录 |

### 2.5 Loader vs Plugin 核心区别

```
Loader                          Plugin
------                          ------
处理单个文件的转换               参与整个构建流程
在 module.rules 中配置           在 plugins 数组中实例化
是个函数，有输入输出             是个类，通过钩子注入逻辑
能做：文件格式转换               能做：生成文件、优化输出、注入变量……
例：把 TS 编译成 JS              例：生成 HTML 文件
```

---

## 三、热更新（HMR）原理

### 3.1 什么是 HMR

HMR（Hot Module Replacement，热模块替换）让你在开发时修改代码后，**只更新改动的那个模块，不刷新整个页面**，从而保留应用的当前状态。

没有 HMR：改一行 CSS → 整页刷新 → 表单填写的内容全没了

有了 HMR：改一行 CSS → 只更新这个 CSS 模块 → 页面样式变了，但状态保留

### 3.2 HMR 工作流程

```
开发者修改文件
      ↓
Webpack 监听到文件变化（watch 模式）
      ↓
只重新编译改变的模块（增量编译）
      ↓
生成两个文件：
  - [hash].hot-update.json  （本次更新的模块清单）
  - [hash].hot-update.js    （更新的模块代码）
      ↓
通过 WebSocket 通知浏览器端："有新内容了，hash 是 xxx"
      ↓
浏览器端的 HMR Runtime（webpack-dev-server 注入的）
接收到通知 → 用 JSONP 方式拉取更新文件
      ↓
HMR Runtime 用新模块替换旧模块
      ↓
触发模块自身的 accept 回调（如果有）
→ 页面局部更新，无需整页刷新
```

**关键角色**：
- **webpack-dev-server**：提供本地 HTTP 服务 + WebSocket 通道
- **HMR Runtime**：被注入到 bundle 里，运行在浏览器端，负责接收更新和替换模块
- **WebSocket**：服务端通知浏览器有更新的通道

### 3.3 为什么 React/Vue 的 HMR 能保留状态？

纯 Webpack 的 HMR 虽然不刷新页面，但替换模块后状态可能还是丢失了（比如 React 组件的 state）。

React 用 **React Fast Refresh**，Vue 用框架层的 HMR 支持，它们在组件级别实现了状态保留：更新组件定义，但保持实例的 state/data 不变。

---

## 四、Vite 核心原理

### 4.1 Vite 是什么

Vite 是新一代前端构建工具，由 Vue 作者尤雨溪创建。它的目标是解决 Webpack **开发模式下启动慢**的问题。

### 4.2 Vite 的核心思路：利用浏览器原生 ES Module

**现代浏览器本身支持 `<script type="module">` 和 `import`。**

Vite 在开发模式下利用了这一点：**不打包，直接让浏览器按需请求每个模块。**

```
Webpack 开发模式：
  启动 → 把所有文件全部打包成 bundle → 服务器启动
  （项目越大，bundle 越大，启动越慢）

Vite 开发模式：
  启动 → 不打包，直接启动服务器 → 浏览器请求哪个模块就处理哪个
  （启动几乎瞬间，因为没有打包过程）
```

### 4.3 Vite 开发模式详细流程

```
浏览器请求 index.html
      ↓
Vite 服务器返回 index.html
（其中有 <script type="module" src="/src/main.ts">）
      ↓
浏览器解析 HTML，发起对 main.ts 的请求
      ↓
Vite 服务器拦截请求：
  - 用 esbuild 实时编译 TS → JS（极快，esbuild 是 Go 写的）
  - 处理 import 路径（如 import vue from 'vue' → 转成 /node_modules/.vite/vue.js）
  - 返回处理后的 JS
      ↓
浏览器解析 JS，发现更多 import → 继续请求
（整个过程是按需、懒加载的）
```

**依赖预构建（Pre-bundling）**：

`node_modules` 里的第三方包（如 lodash、react）不是 ES Module，Vite 会提前用 esbuild 把它们打包成 ESM 格式缓存起来，后续直接用。

### 4.4 Vite 生产模式：Rollup 打包

Vite 的生产构建用的是 **Rollup**，而不是 esbuild。原因是 Rollup 对代码分割、Tree Shaking、产物优化的支持更成熟。

```
生产构建流程：
  Rollup 打包（优化的 ESM 产物）
  + Vite 的插件系统处理各种资源
  → 输出优化后的静态文件
```

### 4.5 Vite 的 HMR

Vite 的 HMR 基于原生 ESM，粒度更细。当一个模块更新时：
- 只失效该模块及其直接依赖链上的模块
- 通过 WebSocket 通知浏览器重新请求最小范围的模块
- 比 Webpack 的 HMR 更快，因为没有重新打包的过程

---

## 五、Webpack vs Vite 核心对比

| 对比维度 | Webpack | Vite |
|---------|---------|------|
| **开发启动速度** | 慢（需要打包所有模块） | 极快（无需打包，按需编译） |
| **HMR 速度** | 随项目增大变慢 | 始终很快（模块粒度更细） |
| **生产构建** | 自己的打包器 | Rollup |
| **开发原理** | Bundle-based | No-bundle（原生 ESM） |
| **配置复杂度** | 较高，配置多 | 较低，约定优于配置 |
| **生态成熟度** | 非常成熟，插件丰富 | 较新，但快速成长 |
| **旧浏览器支持** | 好（babel 转译） | 需要 @vitejs/plugin-legacy |
| **适用场景** | 大型复杂项目、需要精细控制 | 新项目、Vue/React 现代栈 |

**为什么 Vite 开发快但生产用 Rollup 而不是 esbuild？**

esbuild 虽然编译极快，但对代码分割和 CSS 处理还不够完善。Rollup 的 Tree Shaking 和产物优化更成熟，生产构建对速度不敏感，对质量更敏感。（Vite 的作者表示未来可能切换到 esbuild 或 Rolldown）

---

## 面试官怎么问

### Q1：Webpack 中 Loader 和 Plugin 有什么区别？

**参考回答：**

Loader 是文件转换器，本质是一个函数，把不同类型的文件（TS、CSS、图片）转换成 JS 能理解的模块。它只作用于单个文件，配置在 `module.rules` 里，多个 Loader 从右到左执行。

Plugin 是构建流程的扩展器，它监听 Webpack 暴露的生命周期钩子，在特定阶段执行额外逻辑，比如生成 HTML、提取 CSS、压缩代码。配置在 `plugins` 数组里，需要 `new` 实例化。

总结：Loader 转换文件，Plugin 扩展构建能力。

---

### Q2：Bundle、Chunk、Module 分别是什么？

**参考回答：**

Module 是每个源文件，通过 import/require 连接成依赖图。

Chunk 是 Webpack 处理过程中产生的中间代码块，由多个模块组成。入口文件产生入口 Chunk，动态 import() 产生异步 Chunk，SplitChunksPlugin 提取公共模块也会产生新 Chunk。

Bundle 是最终输出的文件，通常一个 Chunk 对应一个 Bundle 文件，就是你 dist 目录下看到的那些 .js 文件。

---

### Q3：说说 Webpack 的构建流程

**参考回答：**

大致分五步：

1. **初始化**：读取配置，创建 Compiler 对象
2. **确定入口**：从 entry 出发
3. **编译模块**：对每个模块用 Loader 转换，解析依赖，递归处理，构建完整的依赖图
4. **组装 Chunk**：根据依赖关系和代码分割配置，把模块组装成 Chunk
5. **输出**：把 Chunk 写成最终的 Bundle 文件到 dist 目录

---

### Q4：Webpack 热更新（HMR）是怎么工作的？

**参考回答：**

开发时 webpack-dev-server 会同时启动 HTTP 服务器和 WebSocket 服务。当文件修改后，Webpack 增量编译只重新处理改动的模块，生成更新的模块文件和 JSON 清单，通过 WebSocket 通知浏览器。浏览器端的 HMR Runtime 收到通知后，用 JSONP 拉取新模块代码，用新模块替换旧模块，触发 accept 回调，实现不刷新页面的更新。

---

### Q5：Vite 为什么比 Webpack 开发启动快？

**参考回答：**

核心原因是 Vite 开发时**不打包**。

Webpack 开发时需要把所有模块打包成 bundle，项目越大越慢。Vite 利用浏览器原生支持 ES Module 的特性，不预先打包，而是启动一个开发服务器，浏览器请求哪个模块就实时编译哪个（用 Go 写的 esbuild，速度极快）。所以 Vite 的启动时间和项目大小几乎无关。

生产构建时 Vite 用的是 Rollup，因为 Rollup 的 Tree Shaking 和代码分割更成熟。
