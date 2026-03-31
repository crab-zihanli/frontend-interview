# 跨域问题（CORS）

## 什么是跨域？

**同源策略（Same-Origin Policy）**是浏览器最基本的安全机制：浏览器只允许网页向**同源**的服务器发送请求或读取资源。

**同源**的定义：协议 + 域名 + 端口三者完全相同。

```
http://a.com:80/page

http://a.com:80/other   ✓ 同源（路径不同，但协议/域名/端口相同）
https://a.com:80/page   ✗ 跨域（协议不同：http vs https）
http://b.com:80/page    ✗ 跨域（域名不同：a.com vs b.com）
http://a.com:8080/page  ✗ 跨域（端口不同：80 vs 8080）
http://sub.a.com/page   ✗ 跨域（子域名不同：a.com vs sub.a.com）
```

注意：同源策略限制的是**浏览器**行为。服务器之间通信没有这个限制，所以服务端代理转发是绕过跨域的常用手段。

---

## 跨域限制了什么？

不是所有跨域操作都被禁止，浏览器的限制主要针对：

| 操作 | 是否限制 |
| --- | --- |
| `XMLHttpRequest` / `fetch` 请求读取响应 | ✗ 限制（请求可以发出，但 JS 无法读取响应）|
| `<img>` / `<script>` / `<link>` 标签加载资源 | ✓ 允许（这是 JSONP 的基础）|
| `<form>` 提交 | ✓ 允许（但无法读取响应）|
| `LocalStorage` / `Cookie` | ✗ 不可跨域读取 |
| DOM 操作 | ✗ 不可跨域访问 iframe 的 DOM |

---

## CORS（跨源资源共享）

**CORS（Cross-Origin Resource Sharing）**是 W3C 标准，通过 HTTP 响应头告诉浏览器：**"我这个服务器允许某些跨域请求"**。

CORS 是目前**最推荐**的跨域解决方案，由服务端配置，前端无需做什么特殊处理。

### 简单请求 vs 预检请求

CORS 将请求分为两类：

**简单请求（Simple Request）** 需要同时满足：
- 请求方法是：`GET`、`HEAD`、`POST`
- 请求头只包含：`Accept`、`Accept-Language`、`Content-Language`、`Content-Type`
- `Content-Type` 只能是：`text/plain`、`multipart/form-data`、`application/x-www-form-urlencoded`

简单请求直接发出，浏览器检查响应头里的 `Access-Control-Allow-Origin`。

**预检请求（Preflight Request）** 不满足上述条件的请求（如 `PUT`、`DELETE`、自定义请求头、`application/json`），浏览器会在**正式请求前自动发一个 `OPTIONS` 请求**，询问服务器是否允许：

```
① 浏览器自动发 OPTIONS 请求：
   OPTIONS /api/data HTTP/1.1
   Origin: http://frontend.com
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: Content-Type, Authorization

② 服务器响应（允许）：
   HTTP/1.1 204 No Content
   Access-Control-Allow-Origin: http://frontend.com
   Access-Control-Allow-Methods: GET, POST, PUT
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Max-Age: 86400   ← 预检结果缓存 86400 秒，期间不再发 OPTIONS

③ 预检通过，浏览器发正式请求
```

### 核心响应头

服务端需要在响应中携带以下头，告诉浏览器允许跨域：

```http
# 允许的来源（* 表示允许所有，但不能配合 credentials 使用）
Access-Control-Allow-Origin: https://your-frontend.com

# 允许的请求方法
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS

# 允许的请求头
Access-Control-Allow-Headers: Content-Type, Authorization, X-Custom-Header

# 是否允许携带 Cookie（需要前端也设置 credentials: 'include'）
Access-Control-Allow-Credentials: true

# 预检请求的缓存时间（秒）
Access-Control-Max-Age: 86400
```

### 允许携带 Cookie 时的特殊要求

如果需要跨域请求携带 Cookie（比如 session 认证），需要**前后端都配置**：

```javascript
// 前端：fetch 请求带上 credentials
fetch('https://api.example.com/data', {
  credentials: 'include'   // 必须设置
})

// 前端：axios 请求
axios.get('https://api.example.com/data', {
  withCredentials: true
})
```

```http
# 后端响应头：不能用 *，必须指定具体域名
Access-Control-Allow-Origin: https://your-frontend.com
Access-Control-Allow-Credentials: true
```

---

## 其他跨域解决方案

### 1. 开发环境代理（最常用于开发）

前端开发时，在 Webpack/Vite 中配置代理，**把跨域请求变成同源请求**：

```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://backend.com:3000',
        changeOrigin: true,  // 修改请求头中的 Origin
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
}
```

原理：浏览器向 `localhost:5173/api/users` 发请求（同源），Vite 开发服务器把这个请求**转发**到 `http://backend.com:3000/users`，后端拿到的是来自 Vite 服务器的请求（服务端之间无跨域限制），再把响应转发回浏览器。

### 2. Nginx 反向代理（生产环境常用）

原理与开发代理相同，通过 Nginx 把 `/api` 请求转发给后端：

```nginx
server {
    listen 80;
    server_name frontend.com;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
    }

    # API 请求反向代理到后端
    location /api/ {
        proxy_pass http://backend-server:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. JSONP（了解历史，不推荐使用）

利用 `<script>` 标签加载 JS 不受跨域限制的特性：

```javascript
// 前端：动态创建 script 标签，并定义好回调函数
function handleData(data) {
  console.log('收到数据:', data)
}

const script = document.createElement('script')
script.src = 'http://api.example.com/data?callback=handleData'
document.head.appendChild(script)

// 服务端返回的不是 JSON，而是 JS 代码：
// handleData({"name": "张三", "age": 25})
// 这段代码在 script 加载后立即执行，调用前端定义的 handleData 函数
```

缺点：只支持 `GET` 请求，有 XSS 安全风险，现代项目不推荐。

### 4. `document.domain`（只适用于主域相同的情况）

如果两个页面的主域名相同，只是子域不同（如 `a.sub.com` 和 `b.sub.com`），可以都设置：

```javascript
document.domain = 'sub.com'
```

之后两个页面就可以互相访问 DOM 和 Cookie。适用场景非常有限，了解即可。

### 5. `postMessage`（跨域窗口通信）

用于不同源的 `window` 之间传递消息（iframe、window.open 打开的窗口等）：

```javascript
// 发送方（父窗口）
iframe.contentWindow.postMessage(
  { type: 'HELLO', data: '你好' },
  'https://other-origin.com'   // 目标来源，* 表示不限制（不安全）
)

// 接收方（iframe 内）
window.addEventListener('message', (event) => {
  // 必须验证来源！
  if (event.origin !== 'https://trusted-origin.com') return
  console.log('收到消息:', event.data)
})
```

---

## 面试官怎么问

### Q1: 什么是跨域？为什么会有跨域限制？

**参考回答：**

跨域是指浏览器发起的请求，目标地址与当前页面的**协议、域名、端口**三者之中有任意一个不同。

浏览器有同源策略（Same-Origin Policy），会阻止 JS 读取来自不同源的响应。这是为了安全：如果没有同源策略，恶意网站可以在用户不知情的情况下，用 JS 读取用户其他网站（如银行、邮箱）的接口数据，造成 CSRF 攻击等。

注意：跨域请求**可以发出**（浏览器会发送请求到服务器），只是 JS 无法**读取响应内容**。

### Q2: CORS 是如何工作的？

**参考回答：**

CORS 由服务端配置响应头来授权跨域访问：

1. **简单请求**（GET/POST + 普通 Content-Type）：浏览器直接发请求，检查响应头中的 `Access-Control-Allow-Origin` 是否包含当前页面的来源，允许则 JS 可以读取响应。

2. **预检请求**（PUT/DELETE/自定义头/JSON 等）：浏览器先自动发一个 `OPTIONS` 请求询问服务器是否允许，服务器响应允许后，浏览器再发真正的请求。

服务端只需配置 `Access-Control-Allow-Origin`（必须）等响应头，浏览器会自动处理其余逻辑，前端代码不需要改动。

### Q3: 为什么 `Access-Control-Allow-Origin: *` 不能配合 Cookie 使用？

**参考回答：**

当 `Access-Control-Allow-Credentials: true`（允许携带 Cookie）时，出于安全原因，`Access-Control-Allow-Origin` 不能设为通配符 `*`，必须指定具体的来源地址。

原因是：如果既允许所有来源跨域，又允许携带 Cookie，那任何恶意网站都可以用用户的 Cookie 向你的接口发请求，这等同于绕过了 CSRF 防护。

### Q4: 开发环境的跨域代理上线后为什么不生效了？

**参考回答：**

开发环境的代理（Vite/Webpack devServer proxy）是开发服务器在本地运行时提供的，**打包后不存在这个代理服务器**，只有静态文件。

解决方法：
1. 后端配置 CORS 响应头（推荐）
2. 生产环境 Nginx 配置反向代理，和开发代理的原理相同
3. 或者同域部署（前后端都部署在同一个域名下）
