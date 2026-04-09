# 构建优化：Tree Shaking、打包速度与体积

> 打包出来的文件太大、开发启动太慢——这是工程化最常见的两个痛点。这章讲如何系统性地解决它们。

---

## 一、Tree Shaking（摇树优化）

### 1.1 是什么

Tree Shaking 是一种**删除未使用代码（Dead Code）**的优化技术。它像摇树一样，把"枯叶"（没被用到的代码）摇掉，只保留实际用到的部分。

**举例**：

```js
// math.js
export function add(a, b) { return a + b }
export function multiply(a, b) { return a * b }  // 没有被任何地方导入

// main.js
import { add } from './math.js'
console.log(add(1, 2))
```

经过 Tree Shaking，最终打包结果里只有 `add`，`multiply` 被删掉。

### 1.2 Tree Shaking 的前提：ES Module（ESM）

Tree Shaking **只对 ES Module（import/export）有效**，对 CommonJS（require/module.exports）无效。

**原因**：

ES Module 是**静态**的——`import` 语句必须写在顶层，编译时就能确定依赖关系，不依赖运行时。

CommonJS 是**动态**的——`require()` 可以写在函数里、条件语句里，只有运行时才知道依赖了什么。

```js
// ✅ ESM：静态，编译时就知道用了什么
import { add } from './math'

// ❌ CommonJS：动态，运行时才知道
const fn = condition ? require('./a') : require('./b')
```

Webpack 和 Rollup 的 Tree Shaking 都依赖 ESM 的静态分析能力。

### 1.3 Tree Shaking 怎么工作

以 Webpack 为例：

```
1. 构建依赖图时，标记所有 export
2. 从入口出发，标记所有被 import 的 export（"有引用"）
3. 没有被标记的 export → 标记为 dead code
4. 压缩阶段（Terser）删除 dead code
```

**注意**：Webpack 的 Tree Shaking 要在 **生产模式（mode: 'production'）** 下才自动启用，因为它依赖压缩器 Terser 来最终删除代码。

### 1.4 副作用（sideEffects）配置

有些文件虽然没有被明确 import，但执行时会产生副作用（比如修改全局变量、注册事件监听），这类文件不能被 Tree Shaking 删掉。

```json
// package.json
{
  "sideEffects": false
  // 告诉 Webpack：这个包里的所有文件都没有副作用，可以放心 Tree Shaking
}
```

```json
{
  "sideEffects": ["*.css", "./src/polyfills.js"]
  // 指定哪些文件有副作用（不能删），其余文件可以 Tree Shaking
}
```

**常见问题**：为什么 CSS 文件需要标记为 sideEffects？

因为 CSS 文件通常是这样被引入的：
```js
import './style.css'  // 没有具体导入什么，但必须执行（把样式注入页面）
```
如果不声明 sideEffects，Webpack 看到没有具体 import 的内容，可能会把它 Tree Shaking 掉。

### 1.5 为什么有时 Tree Shaking 不生效？

1. **用了 CommonJS**：`require()` 无法静态分析
2. **babel 把 ESM 转成 CommonJS**：老版本 `@babel/preset-env` 默认会转换，需要配置 `modules: false`
3. **副作用处理不当**：sideEffects 配置不对
4. **`export default` 导出整个对象**：

```js
// ❌ 这样 Tree Shaking 可能不彻底，整个对象都被引入
export default { add, multiply, divide }

// ✅ 具名导出，Tree Shaking 更精确
export { add, multiply, divide }
```

---

## 二、打包速度优化

### 2.1 性能瓶颈在哪

Webpack 打包慢主要慢在：
1. **Loader 处理**：babel-loader 对每个 JS 文件进行 AST 解析和转换，开销大
2. **模块数量多**：`node_modules` 里可能有几万个模块
3. **单线程**：Node.js 是单线程，默认情况下 Webpack 串行处理

### 2.2 缩小处理范围

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        // ✅ 排除 node_modules，不处理第三方包
        exclude: /node_modules/,
        // 或者只包含 src 目录
        include: path.resolve(__dirname, 'src')
      }
    ]
  },
  resolve: {
    // ✅ 减少模块查找范围
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    // ✅ 减少后缀名尝试
    extensions: ['.js', '.jsx', '.ts', '.tsx']
    // 不要写太多，写了就要一个个试
  }
}
```

### 2.3 缓存（最有效的手段之一）

```js
// babel-loader 开启缓存（编译结果缓存到磁盘）
{
  test: /\.js$/,
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true  // 默认缓存在 node_modules/.cache/babel-loader
    }
  }
}

// Webpack 5 内置持久化缓存（强烈推荐）
module.exports = {
  cache: {
    type: 'filesystem',  // 缓存到文件系统
    buildDependencies: {
      config: [__filename]  // 配置文件变更时缓存失效
    }
  }
}
```

第一次构建慢，第二次会快很多（因为命中缓存）。

### 2.4 多进程并行处理

```js
// thread-loader：把耗时的 Loader 放到 worker 线程池
{
  test: /\.js$/,
  use: [
    {
      loader: 'thread-loader',
      options: {
        workers: 2  // worker 线程数，建议设为 CPU 核心数 - 1
      }
    },
    'babel-loader'
  ]
}
```

> 注意：thread-loader 有启动开销，对小项目可能反而变慢，适合大型项目。

### 2.5 用更快的 Loader/编译器替换

```js
// ❌ 慢：ts-loader（用 tsc 编译）
{ test: /\.tsx?$/, use: 'ts-loader' }

// ✅ 快：esbuild-loader（用 Go 写的 esbuild 编译，快 10-100 倍）
const { EsbuildPlugin } = require('esbuild-loader')
{ test: /\.tsx?$/, loader: 'esbuild-loader', options: { target: 'es2015' } }

// 压缩也用 esbuild 替换 Terser
optimization: {
  minimizer: [new EsbuildPlugin({ target: 'es2015' })]
}
```

### 2.6 DllPlugin（预编译）

对于几乎不变的第三方库（React、Vue、lodash 等），可以预先编译打包，后续构建直接引用，不重复编译。

```js
// webpack.dll.config.js（单独运行一次）
module.exports = {
  entry: { vendor: ['react', 'react-dom', 'lodash'] },
  plugins: [new webpack.DllPlugin({ name: 'vendor', path: 'dist/vendor-manifest.json' })]
}

// webpack.config.js（日常开发/构建引用）
plugins: [new webpack.DllReferencePlugin({ manifest: 'dist/vendor-manifest.json' })]
```

> Webpack 5 的持久化缓存 + esbuild-loader 基本可以替代 DllPlugin，现在 DllPlugin 用得越来越少了。

### 2.7 Vite 的速度优势总结

如果是新项目，直接用 Vite 就解决了大部分开发速度问题：

| 场景 | Webpack 优化手段 | Vite |
|------|----------------|------|
| 开发启动慢 | DllPlugin + 缓存 | 原生 ESM，无需打包，启动秒级 |
| HMR 慢 | thread-loader | 基于 ESM，只更新改变的模块 |
| TS 编译慢 | esbuild-loader | 默认用 esbuild |

---

## 三、打包体积优化

### 3.1 体积分析：先知道问题在哪

```js
// 安装 webpack-bundle-analyzer
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

plugins: [
  new BundleAnalyzerPlugin()
  // 构建后会打开一个可视化页面，展示每个模块的大小占比
]
```

通过分析报告，你可以找到：
- 哪些模块体积异常大
- 是否引入了整个库（应该按需引入）
- 是否有重复的模块

### 3.2 代码分割（Code Splitting）

把大 bundle 拆成多个小 chunk，实现**按需加载**，首屏只加载必要的代码。

**方式一：入口分割**

```js
entry: {
  main: './src/index.js',
  admin: './src/admin.js'
}
```

**方式二：动态 import（最常用）**

```js
// 路由懒加载（React）
const Dashboard = React.lazy(() => import('./pages/Dashboard'))

// Vue Router 懒加载
const routes = [
  { path: '/dashboard', component: () => import('./pages/Dashboard.vue') }
]
```

访问 `/dashboard` 时才加载 Dashboard 的代码，首屏不加载。

**方式三：SplitChunksPlugin 提取公共模块**

```js
optimization: {
  splitChunks: {
    chunks: 'all',  // 对所有 chunk（同步+异步）进行分割
    // 常用配置：把 node_modules 里的包单独提取出来
    cacheGroups: {
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all'
      }
    }
  }
}
```

这样 `react`、`lodash` 等第三方库被提取到单独的 `vendors.js`，用户二次访问时可以命中浏览器缓存（因为这些库不常变化）。

### 3.3 压缩代码

```js
// Webpack 5 生产模式默认启用 Terser 压缩 JS
// 手动配置
const TerserPlugin = require('terser-webpack-plugin')

optimization: {
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        compress: { drop_console: true }  // 删除 console.log
      }
    }),
    new CssMinimizerPlugin()  // 压缩 CSS
  ]
}
```

### 3.4 图片优化

```js
// Webpack 5 内置资源模块
{
  test: /\.(png|jpg|gif)$/,
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: 10 * 1024  // 10KB 以下转 Base64，减少 HTTP 请求
    }
  }
}

// 使用 image-webpack-loader 压缩图片
{
  test: /\.(png|jpg|gif|svg)$/,
  use: [
    'file-loader',
    {
      loader: 'image-webpack-loader',
      options: { mozjpeg: { quality: 80 } }
    }
  ]
}
```

### 3.5 按需引入第三方库

```js
// ❌ 引入整个 lodash（70KB+）
import _ from 'lodash'
_.debounce(fn, 300)

// ✅ 只引入用到的函数（几 KB）
import debounce from 'lodash/debounce'
debounce(fn, 300)

// ✅ 或者用 lodash-es（ESM 版本，支持 Tree Shaking）
import { debounce } from 'lodash-es'
```

```js
// ❌ 引入整个 antd（几 MB）
import { Button } from 'antd'
// 需要配合 babel-plugin-import 或 antd 的按需引入方案

// ✅ antd v5 开始默认支持 Tree Shaking，不需要额外配置
import { Button } from 'antd'
```

### 3.6 externals：CDN 加速大库

把不打包进 bundle、改用 CDN 引入的库配置为 externals：

```js
// webpack.config.js
externals: {
  react: 'React',       // import React from 'react' → 直接用全局变量 React
  'react-dom': 'ReactDOM'
}

// index.html 里通过 CDN 引入
// <script src="https://cdn.jsdelivr.net/npm/react@18/..."></script>
```

好处：bundle 体积大幅减小，CDN 有全球缓存，加载更快。

### 3.7 gzip / brotli 压缩

```js
const CompressionPlugin = require('compression-webpack-plugin')

plugins: [
  new CompressionPlugin({
    algorithm: 'gzip',
    test: /\.(js|css|html|svg)$/,
    threshold: 10240,  // 超过 10KB 才压缩
    minRatio: 0.8
  })
]
```

前提：服务器（Nginx）也要配置支持 gzip 传输。通常 JS/CSS 可以压缩到原来的 20%-30%。

### 3.8 体积优化总结

| 手段 | 效果 |
|------|------|
| Tree Shaking | 删除未用代码，效果显著 |
| 代码分割 + 懒加载 | 减少首屏加载量 |
| 提取公共 Chunk | 利用浏览器缓存 |
| 压缩（Terser/gzip） | 传输体积减小 50-80% |
| 图片优化 + Base64 | 减少请求数和图片体积 |
| 按需引入第三方库 | 避免引入整个大库 |
| externals + CDN | 从 bundle 移出大库，借助 CDN |

---

## 面试官怎么问

### Q1：什么是 Tree Shaking？它的原理是什么？

**参考回答：**

Tree Shaking 是删除未被使用代码的技术。原理是基于 ES Module 的静态分析：因为 `import/export` 语句必须写在顶层，编译时就能确定哪些 export 被引用了，哪些没有——没被引用的就是 dead code，最终由压缩器（Terser）删除。

它只对 ESM 有效，CommonJS 因为是动态 require 无法静态分析，不支持 Tree Shaking。需要注意 `sideEffects` 的配置，有副作用的文件（如 CSS 导入）不能被摇掉。

---

### Q2：打包速度慢怎么优化？

**参考回答：**

几个方向：

1. **缓存**：开启 Webpack 5 持久化缓存（`cache: { type: 'filesystem' }`）或 babel-loader 的 `cacheDirectory`，二次构建直接复用
2. **缩小处理范围**：Loader 加 `exclude: /node_modules/`，`resolve.extensions` 不要配太多
3. **多进程**：用 `thread-loader` 把 babel-loader 放到 worker 线程
4. **更快的工具**：用 `esbuild-loader` 替换 `ts-loader`/`babel-loader`，esbuild 是 Go 写的，快 10-100 倍
5. **新项目用 Vite**：开发时完全不打包，启动秒级

---

### Q3：打包体积大怎么优化？

**参考回答：**

首先用 `BundleAnalyzerPlugin` 分析哪里大，然后针对性优化：

1. **Tree Shaking**：用 ESM，删除未用代码
2. **代码分割 + 懒加载**：路由用动态 `import()`，首屏只加载必要代码
3. **提取公共 Chunk**：`SplitChunksPlugin` 把第三方库单独提取，利用浏览器缓存
4. **按需引入**：不引入整个 lodash，用 `lodash/debounce` 按需导入
5. **压缩**：Terser 压缩 JS，删除 console.log；gzip/brotli 传输压缩
6. **externals + CDN**：把 React 等大库从 bundle 中移出，用 CDN 引入
