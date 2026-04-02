# Next.js 与全栈渲染

## 渲染模式：CSR / SSR / SSG / ISR

理解渲染模式是 Next.js 的前置知识。不同渲染模式决定了"页面 HTML 是在哪里、何时生成的"。

### CSR（Client-Side Rendering，客户端渲染）

```
用户访问页面
      ↓
服务器返回空 HTML（只有 <div id="app"></div>）
      ↓
浏览器下载并执行 JS
      ↓
JS 请求数据（API）
      ↓
JS 渲染出完整页面内容（React 挂载）
```

- **代表**：Create React App，Vite + React 的默认模式
- **优点**：前后端分离，服务器压力小，交互体验好（SPA）
- **缺点**：首屏白屏时间长；SEO 差（爬虫拿到的是空 HTML）

### SSR（Server-Side Rendering，服务端渲染）

```
用户访问页面
      ↓
服务器执行 React 组件，获取数据，生成完整 HTML
      ↓
返回完整 HTML（用户立即看到内容）
      ↓
浏览器下载 JS，React "接管"页面（Hydration 水合）
```

- **优点**：首屏快，SEO 友好（HTML 有完整内容）
- **缺点**：每次请求都要服务端渲染，服务器压力大；TTFB（首字节时间）受服务器处理时间影响

### SSG（Static Site Generation，静态生成）

```
构建时（build time）
      ↓
服务器预先渲染所有页面，生成静态 HTML 文件
      ↓
部署到 CDN
      ↓
用户访问：直接从 CDN 拿到 HTML（最快）
```

- **优点**：极快（CDN 分发），服务器压力几乎为零，SEO 最好
- **缺点**：数据是构建时的快照，实时性差；页面数量多时构建慢

### ISR（Incremental Static Regeneration，增量静态再生成）

Next.js 特有。SSG 的升级版：

```
第一次请求：返回缓存的静态 HTML
同时：后台触发重新生成（在 revalidate 时间之后）
下次请求：返回新生成的 HTML
```

```js
// 设置每 60 秒重新生成一次
export async function getStaticProps() {
  const data = await fetchData();
  return {
    props: { data },
    revalidate: 60, // 秒
  };
}
```

### 四种模式对比

| | CSR | SSR | SSG | ISR |
|--|-----|-----|-----|-----|
| HTML 生成时机 | 客户端运行时 | 每次请求时（服务端）| 构建时 | 构建时 + 按需重生成 |
| 首屏速度 | 慢 | 中 | 快 | 快 |
| SEO | 差 | 好 | 最好 | 好 |
| 数据实时性 | 高 | 高 | 低 | 中 |
| 服务器压力 | 低 | 高 | 极低 | 低 |
| 适用场景 | 后台管理、SPA | 动态内容、个性化页面 | 博客、文档、营销页 | 电商商品页、新闻 |

---

## 二、Next.js 基础

Next.js 是基于 React 的**全栈框架**，提供路由、数据获取、渲染模式等开箱即用的能力。

### 两套路由系统

Next.js 目前有两套路由：

| | Pages Router（旧） | App Router（新，Next.js 13+）|
|--|----|----|
| 目录 | `pages/` | `app/` |
| 默认渲染 | CSR + SSR | Server Components（RSC）|
| 数据获取 | `getServerSideProps` / `getStaticProps` | 直接在 Server Component 里 `async/await` |
| 布局 | `_app.tsx` + 手动 | `layout.tsx`（嵌套布局）|
| 推荐 | 旧项目维护 | ✅ 新项目推荐 |

---

## 三、App Router 深入

### 目录结构约定

```
app/
├── layout.tsx          ← 根布局（必须有，包裹所有页面）
├── page.tsx            ← 首页（/）
├── about/
│   └── page.tsx        ← /about 页面
├── blog/
│   ├── page.tsx        ← /blog 列表页
│   └── [slug]/
│       └── page.tsx    ← /blog/:slug 动态路由
└── api/
    └── hello/
        └── route.ts    ← API 路由 /api/hello
```

### 嵌套布局

```tsx
// app/layout.tsx —— 根布局，所有页面共用
export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body>
        <Navbar />
        {children}   {/* 子布局或页面内容 */}
        <Footer />
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx —— 只对 /dashboard/* 生效的布局
export default function DashboardLayout({ children }) {
  return (
    <div>
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

布局组件在路由切换时**不会重新挂载**，状态保留，比 Pages Router 的 `_app.tsx` 更灵活。

---

## 四、Server Components（服务端组件）

这是 App Router 最核心、最重要的概念。

### 两种组件

| | Server Component | Client Component |
|--|----------------|-----------------|
| 运行位置 | 服务器 | 浏览器（也会被服务端预渲染 HTML）|
| 能否用 Hooks | ❌ 不能 | ✅ 可以 |
| 能否访问数据库/文件系统 | ✅ 可以 | ❌ 不能 |
| 能否处理用户交互 | ❌ 不能 | ✅ 可以 |
| 打包到客户端 JS | ❌ 不会 | ✅ 会 |
| 默认 | App Router 里是 Server Component | 需要显式声明 |

### 如何声明 Client Component

在文件顶部加 `'use client'` 指令：

```tsx
'use client'; // ← 这一行让整个文件变成 Client Component

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Server Component 的数据获取

```tsx
// app/products/page.tsx —— Server Component（默认）
// 可以直接 async/await，不需要 useEffect + fetch
async function ProductsPage() {
  const products = await db.query('SELECT * FROM products'); // 直接查数据库

  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}

export default ProductsPage;
```

### 组件树中的混合使用

```
RootLayout (Server)
  └── ProductsPage (Server)
        ├── ProductList (Server)  ← 展示列表
        └── AddToCartButton (Client)  ← 需要点击交互
```

规则：**Server Component 可以包含 Client Component，但 Client Component 不能直接包含 Server Component**（可以通过 `children` prop 的方式传入）。

```tsx
// ✅ 通过 children 传入 Server Component 到 Client Component
function ClientWrapper({ children }) { // Client Component
  return <div className="wrapper">{children}</div>;
}

// Server Component 使用
<ClientWrapper>
  <ServerComponent />  {/* ✅ 通过 children 传入 */}
</ClientWrapper>
```

### Server Component 的优势

1. **减少 JS 包体积**：Server Component 的代码不发送到浏览器，第三方库（如 markdown 解析器）只在服务端运行。
2. **直接访问后端资源**：数据库、文件系统、环境变量（敏感信息不暴露给客户端）。
3. **自动代码分割**：只发送用户需要的 Client Component 代码。

---

## 五、数据获取与缓存

### App Router 的数据获取

```tsx
// 1. 基本 fetch（Server Component）
async function Page() {
  const data = await fetch('https://api.example.com/data').then(r => r.json());
  return <div>{data.title}</div>;
}

// 2. 不缓存（每次请求都重新获取，类似 SSR）
const data = await fetch(url, { cache: 'no-store' });

// 3. 缓存并定期重新验证（类似 ISR）
const data = await fetch(url, { next: { revalidate: 60 } }); // 60秒后重新请求

// 4. 永久缓存（类似 SSG，默认行为）
const data = await fetch(url); // 默认 force-cache
```

### 并行数据获取

```tsx
async function Page() {
  // ❌ 串行：先等 user，再等 posts
  const user = await fetchUser();
  const posts = await fetchPosts();

  // ✅ 并行：同时发起
  const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);

  return <div>...</div>;
}
```

### Streaming（流式渲染）

结合 Suspense，Next.js 可以流式渲染页面，先发送快速加载的部分，慢的部分等数据就绪后补充：

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      <FastContent />   {/* 立即渲染 */}
      <Suspense fallback={<Spinner />}>
        <SlowComponent />  {/* 数据加载完后再流式发送给浏览器 */}
      </Suspense>
    </>
  );
}
```

---

## 六、路由系统

### 文件系统路由

| 文件路径 | 对应 URL |
|---------|---------|
| `app/page.tsx` | `/` |
| `app/about/page.tsx` | `/about` |
| `app/blog/[slug]/page.tsx` | `/blog/any-slug` |
| `app/shop/[...segments]/page.tsx` | `/shop/a/b/c`（捕获所有） |
| `app/(marketing)/page.tsx` | `/`（括号是路由分组，不影响 URL）|

### 动态路由

```tsx
// app/blog/[slug]/page.tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <h1>文章：{params.slug}</h1>;
}

// 静态生成时，告诉 Next.js 有哪些 slug
export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  return posts.map(post => ({ slug: post.slug }));
}
```

### 特殊文件约定

| 文件名 | 作用 |
|--------|------|
| `page.tsx` | 页面主内容 |
| `layout.tsx` | 布局（跨路由保持状态）|
| `loading.tsx` | 加载中 UI（自动包裹 Suspense）|
| `error.tsx` | 错误 UI（自动包裹 Error Boundary）|
| `not-found.tsx` | 404 页面 |
| `route.ts` | API 路由（Route Handler）|

---

## 七、API Routes（路由处理器）

```ts
// app/api/users/route.ts

// GET /api/users
export async function GET(request: Request) {
  const users = await db.findAll();
  return Response.json(users);
}

// POST /api/users
export async function POST(request: Request) {
  const body = await request.json();
  const user = await db.create(body);
  return Response.json(user, { status: 201 });
}
```

---

## 八、中间件（Middleware）

中间件在请求到达页面之前运行，可以用于：鉴权、重定向、请求头修改、AB 测试等。

```ts
// middleware.ts（放在项目根目录）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.has('token');

  // 未登录访问 /dashboard 时重定向到登录页
  if (!isLoggedIn && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next(); // 继续正常处理
}

// 配置中间件只对哪些路径生效
export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## 九、Hydration（水合）

SSR / SSG 时，服务端生成了静态 HTML，浏览器下载 HTML 后用户能立即看到内容。但此时 React 还没有启动，页面不能交互（按钮点不了、事件没绑定）。

**Hydration** 是 React 在浏览器端"接管"这些静态 HTML 的过程：React 遍历 DOM 树，将事件监听器绑定到对应节点，初始化组件状态，使页面变成可交互的完整 React 应用。

```
服务端渲染 HTML → 发送给浏览器 → 浏览器展示 HTML（可见，不可交互）
                                       ↓
                               下载 React JS bundle
                                       ↓
                          React Hydration（水合）
                                       ↓
                               页面完全可交互
```

### Hydration 不匹配问题

如果服务端渲染的 HTML 与客户端 React 渲染的结果不一致（比如服务端和客户端数据不同），会出现 Hydration 错误：

```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

常见原因：
- 在 Server Component 里使用了 `Math.random()` 或 `Date.now()`（每次结果不同）
- 在服务端读了浏览器特有 API（`window`、`localStorage`）
- CSS-in-JS 服务端没正确处理

---

## 面试官怎么问

### Q1: SSR、SSG、CSR、ISR 分别是什么？各自适合什么场景？

**参考回答：**

- **CSR**：HTML 是空的，所有内容由浏览器端 JavaScript 渲染。首屏慢、SEO 差，适合后台管理系统等不需要 SEO 的 SPA。
- **SSR**：每次请求时服务端执行 React 渲染，返回完整 HTML。首屏快、SEO 好，适合需要实时数据且 SEO 重要的页面（如电商商品详情）。
- **SSG**：构建时预渲染所有页面，生成静态 HTML。速度最快（CDN 分发），适合内容不频繁变化的场景（博客、文档、营销页）。
- **ISR**：SSG 的增量版，支持在不重新构建整个站点的情况下更新部分页面（设置 `revalidate` 时间）。适合商品页、新闻列表等数据有变化但不需要实时的场景。

### Q2: Next.js App Router 中 Server Component 和 Client Component 的区别？

**参考回答：**

Server Component（RSC）在服务器上运行，不发送到浏览器，可以直接访问数据库、文件系统，不能使用 useState/useEffect 等 Hooks，不能处理用户交互。

Client Component 用 `'use client'` 声明，在浏览器运行（也会在服务端预渲染 HTML），可以使用所有 Hooks 和浏览器 API，可以处理交互。

实践原则：能用 Server Component 就用（减少客户端 JS），需要交互或状态的才改成 Client Component。Server Component 可以包含 Client Component，反过来通过 children prop 传入。

### Q3: 什么是 Hydration？可能遇到什么问题？

**参考回答：**

Hydration（水合）是 React 在浏览器端"接管"服务端渲染的静态 HTML 的过程——React 遍历 DOM，绑定事件监听器，初始化组件状态，使页面从"可见但不可交互"变成完整的 React 应用。

常见问题是 Hydration 不匹配：服务端渲染的 HTML 和客户端 React 渲染的结果不一致。原因通常是在组件里使用了非确定性的值（`Date.now()`、`Math.random()`），或访问了只在浏览器可用的 API（`window`、`localStorage`）。解决方法是把这些逻辑移到 `useEffect` 里（只在客户端执行），或使用 `suppressHydrationWarning` 属性（谨慎使用）。

### Q4: Next.js 中间件（Middleware）是什么？有什么应用场景？

**参考回答：**

中间件是在请求到达页面路由之前执行的函数，运行在 Edge Runtime（类 Service Worker 环境）。

常见应用：
- **鉴权**：检查 Cookie/Token，未登录则重定向到登录页
- **国际化**：根据 Accept-Language 请求头重定向到对应语言的页面
- **AB 测试**：随机分配用户到不同版本
- **请求头修改**：注入请求 ID、安全相关 Headers

中间件性能很好（Edge Runtime 启动快），但功能有限（不能访问数据库）。
