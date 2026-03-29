# 网络请求与 AJAX 方案

核心逻辑：前端与服务器通信的进化史，以及工程实践中的解决方案。

## 知识点体系

### 1. AJAX 发展史
*   **XHR (XMLHttpRequest)**：
    *   老牌方案，浏览器原生支持。
    *   用法繁琐：`open`, `send`, `onreadystatechange`。
    *   缺点：容易导致“回调地狱”，配置复杂。
*   **jQuery $.ajax**：
    *   对 XHR 的封装，简化了 API。
    *   缺点：为了用 AJAX 引入整个 jQuery 库，不符合现代框架开发理念。

### 2. 现代 Fetch API
*   **特点**：
    *   浏览器原生支持，基于 Promise 设计。
    *   语法简洁，符合现代 JS 风格。
*   **关键坑点**：
    *   **错误处理**：Fetch 认为 HTTP 状态码 4xx 或 5xx 并不是网络错误（只有网络断开才 reject），它不会 reject，需要手动检查 `response.ok` 属性。
    *   **Cookie**：默认不带 Cookie，需要设置 `credentials: 'include'`。

### 3. 工程化方案：Axios
*   **为什么选 Axios？**
    *   支持 Node.js 和浏览器端（同构）。
    *   自动转换 JSON 数据。
    *   支持上传/下载进度监控。
    *   支持取消请求 (CancelToken / AbortController)。
    *   **拦截器 (Interceptors)**：工程化核心。

### 4. 拦截器 (Interceptors)
*   **请求拦截器**：
    *   统一添加 Token (Authorization 头)。
    *   开启全局 Loading 动画。
    *   参数序列化。
*   **响应拦截器**：
    *   统一处理业务错误码（如 401 未登录跳转）。
    *   关闭全局 Loading 动画。
    *   剥离外层数据结构（直接返回 `data.data`）。

### 5. 跨域问题 (CORS)
*   **JSONP**：利用 `<script>` 标签不受同源策略限制的漏洞。只支持 GET 请求。已淘汰。
*   **CORS (跨域资源共享)**：主流方案。后端设置 `Access-Control-Allow-Origin` 等响应头，浏览器自动处理。

### 6. 登录鉴权流程 (Login & Auth)
*   **核心逻辑**：HTTP 是无状态的，需要 Token 来标识用户身份。
*   **流程步骤**：
    1.  **登录**：用户输入账号密码 -> 发送 POST 请求 -> 后端验证通过 -> 返回 Token。
    2.  **存储**：前端收到 Token，存储到 `localStorage` 或 `Cookie` 中。
    3.  **请求携带**：后续请求在 Axios **请求拦截器**中，将 Token 放入 HTTP Header (通常是 `Authorization` 字段)。
    4.  **过期处理**：后端返回 401 -> 前端 **响应拦截器** 捕获 -> 跳转登录页或刷新 Token (Refresh Token)。

### 7. 浏览器本地存储
*   **Cookie**：
    *   最早期的存储方案，主要用于**身份认证** (Session ID)。
    *   **特点**：会自动随着 HTTP 请求发送到服务器；容量小 (4KB)；需自己封装 API。
*   **localStorage**：
    *   HTML5 新增，用于**持久化存储**。
    *   **特点**：容量大 (5MB)；数据永久存在，除非手动删除；不会随请求发送。
*   **sessionStorage**：
    *   HTML5 新增，用于**会话存储**。
    *   **特点**：容量大 (5MB)；**页面关闭后即被销毁**；不会随请求发送。

---

## 面试官怎么问

### Q1: Fetch 和 XHR 有什么区别？Fetch 有什么缺点？
**参考回答：**
*   **区别**：XHR 是基于事件的旧 API，配置繁琐；Fetch 是基于 Promise 的新 API，语法简洁。
*   **Fetch 缺点**：
    1.  只对网络错误（如断网）报错，对 400/500 错误码默认不 reject。
    2.  默认不带 Cookie。
    3.  不支持原生上传进度监测（XHR 有 `onprogress`）。
    4.  不支持取消请求（早期不支持，现在可用 `AbortController`）。

### Q2: 在项目中你是怎么封装网络请求的？拦截器一般用来做什么？
**参考回答：**
通常使用 Axios 进行二次封装。
**拦截器的作用**：
1.  **请求拦截**：从 localStorage 获取 token 放入 Header；添加时间戳防止缓存；开启 Loading。
2.  **响应拦截**：
    *   检查 HTTP 状态码和业务状态码。
    *   如果是 401，清除用户信息并跳转登录页。
    *   如果是 200 但业务报错，统一弹出 Message 提示。
    *   关闭 Loading。
    *   直接返回业务数据，少写一层 `.data`。

### Q3: 如何手动取消一个正在进行的 fetch/axios 请求？
**参考回答：**
*   **Fetch**：使用 `AbortController`。
    ```javascript
    const controller = new AbortController();
    fetch(url, { signal: controller.signal });
    controller.abort(); // 取消请求
    ```
*   **Axios**：
    *   旧版：使用 `CancelToken`。
    *   新版 (v0.22+)：也支持 `AbortController`。

### Q4: 手写题：请用 Promise 封装一个简单的原生 XHR 请求。
**参考回答：**
```javascript
function ajax(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error('Request failed with status ' + xhr.status));
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('Network Error'));
    
    xhr.send();
  });
}
```

### Q5: url解析
**参考回答：**
```javascript
const parseUrl = (url) => {
  const tmpUrl = url.split("?")[1]
  const resObj = {}
  for(const str of tmpUrl.split("&")) {
    let [key, value] = str.split("=")
    value = decodeURIComponent(value)
    if(resObj.hasOwnProperty(key)) {
      resObj[key] = [].concat(resObj[key], value)
    } else if(value == "undefined") { // !!!
      resObj[key] = true
    } else {
      resObj[key] = value 
    }
  }
  return resObj
}
console.log(parseUrl("http://www.test.com?name=zhangsan&age=18&hobby=reading&hobby=swimming&married=undefined"))
// { name: 'zhangsan', age: '18', hobby: [ 'reading', 'swimming' ], married: true }
```

### Q6: 详细描述一下登录鉴权流程？Token 一般放在哪里？Axios 怎么封装？
**参考回答：**
这是一个非常高频的工程化问题，建议从**获取、存储、携带、过期处理**四个阶段来回答。

1.  **获取 Token**：
    用户登录成功后，后端返回 Token (通常是 JWT 格式)。

2.  **存储 Token**：
    *   **localStorage**: 最常用。优点是方便；缺点是易受 XSS 攻击。
    *   **Cookie (httpOnly)**: 安全性更高。优点是防 XSS；缺点是易受 CSRF 攻击（需配合 SameSite 属性）。
    *   **结论**：一般项目存 localStorage 即可；高安全要求项目存 Cookie。

3.  **携带 Token (Axios 封装)**：
    利用 Axios 的**请求拦截器**，在每次发送请求前自动把 Token 加到 Header 中。
    *   **字段名**：通常是 `Authorization`。
    *   **格式**：通常是 `Bearer <token>` (Bearer Schema)。

    ```javascript
    // request.js
    import axios from 'axios';

    const service = axios.create({
      baseURL: process.env.VUE_APP_BASE_API,
      timeout: 5000
    });

    // 请求拦截器
    service.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');
        if (token) {
          // 核心：将 Token 放入 Header
          config.headers['Authorization'] = 'Bearer ' + token;
        }
        return config;
      },
      error => Promise.reject(error)
    );
    ```

4.  **过期处理 (401)**：
    利用 Axios 的**响应拦截器**监听后端返回的状态码。
    *   如果返回 **401 (Unauthorized)**，说明 Token 无效或过期。
    *   **处理逻辑**：清除本地 Token -> 重定向到登录页 -> (可选) 提示用户“登录已过期”。

    ```javascript
    // 响应拦截器
    service.interceptors.response.use(
      response => response.data,
      error => {
        if (error.response && error.response.status === 401) {
          // 1. 清除本地 Token
          localStorage.removeItem('token');
          // 2. 跳转登录页
          location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
    export default service;
    ```

### Q7: Cookie, localStorage, sessionStorage 的区别？
**参考回答：**
| 特性 | Cookie | localStorage | sessionStorage |
| :--- | :--- | :--- | :--- |
| **生命周期** | 可设置过期时间，默认关闭浏览器失效 | **永久有效**，除非手动删除 | **仅当前会话有效**，关闭标签页即失效 |
| **数据大小** | 4KB 左右 | 5MB 左右 | 5MB 左右 |
| **与服务器通信** | **每次请求都会携带** (浪费带宽) | 不参与服务器通信 | 不参与服务器通信 |
| **易用性** | 原生 API 难用 (需封装) | 原生 API 简单 (`getItem`, `setItem`) | 原生 API 简单 |
| **应用场景** | Token (配合 httpOnly 防 XSS), Session ID | 长期保存的用户偏好、Token | 敏感账号信息、表单临时数据 |

