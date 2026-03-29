# HTTP 核心与缓存

核心逻辑：理解 HTTP 报文的构成、状态码的含义以及浏览器缓存策略，是前端性能优化的基础。

## 知识点体系

### 1. 常见 HTTP 状态码
状态码是服务器对客户端请求的响应结果的简短描述。
*   **1xx (信息)**
    *   `100 Continue`: 客户端应继续发送请求的剩余部分（常见于大文件上传）。
    *   `101 Switching Protocols`: 服务器同意切换协议（如 HTTP -> WebSocket）。

*   **2xx (成功)**
    *   `200 OK`: 请求成功。
    *   `204 No Content`: 请求成功，但无响应体（常用于 DELETE 请求）。
    *   `206 Partial Content`: 范围请求成功（断点续传、视频播放）。
*   **3xx (重定向)**
    *   `301 Moved Permanently`: **永久重定向**。资源已永久移动，搜索引擎会更新索引。浏览器会缓存新的 URL。
    *   `302 Found`: **临时重定向**。资源临时移动，搜索引擎不更新。
    *   `304 Not Modified`: **协商缓存命中**。资源未修改，直接使用本地缓存。
*   **4xx (客户端错误)**
    *   `400 Bad Request`: 请求参数有误。
    *   `401 Unauthorized`: 未授权（未登录或 Token 过期）。
    *   `403 Forbidden`: 禁止访问（有 Token 但无权限）。
    *   `404 Not Found`: 资源不存在。
*   **5xx (服务端错误)**
    *   `500 Internal Server Error`: 服务器内部错误。
    *   `502 Bad Gateway`: 网关错误（上游服务器报错）。
    *   `503 Service Unavailable`: 服务不可用（超载或维护）。
    *   `504 Gateway Timeout`: 网关超时。

### 2. 常见 HTTP 请求方法
除了 GET 和 POST，还有以下常用方法：
*   **HEAD**: 类似于 GET，但**只返回响应头**，不返回实体的主体部分。常用于检查文件是否存在、获取文件大小 (Content-Length) 或最后修改时间，节省带宽。
*   **PUT**: 用于**更新**资源（全量更新）。幂等。
*   **PATCH**: 用于**更新**资源（局部更新）。非幂等。
*   **DELETE**: 用于**删除**资源。幂等。
*   **OPTIONS**: 用于获取服务器支持的 HTTP 请求方法；在 CORS 中用于**预检请求** (Preflight Request)。

### 3. GET 和 POST 的区别
这是一个经典的面试题，不要只回答“参数在 URL”和“参数在 Body”。

*   **语义层面**：
    *   **GET**：获取资源。是**安全**（不修改服务器数据）且**幂等**（多次请求结果一致）的。

### 4. HTTP 缓存机制 (核心)
缓存分为**强缓存**和**协商缓存**。

#### 强缓存 (本地缓存)
浏览器直接从本地读取，不请求服务器。状态码 `200 (from memory/disk cache)`。
*   **`Expires`** (HTTP/1.0): 绝对时间。缺点：受客户端本地时间影响。
*   **`Cache-Control`** (HTTP/1.1): 相对时间。优先级高于 Expires。
    *   `max-age=3600`: 3600秒内有效。
    *   `no-cache`: **不使用强缓存**，直接走协商缓存。
    *   `no-store`: 禁止任何缓存。
    *   `public`/`private`: 是否允许中间代理缓存。

#### 协商缓存 (对比缓存)
浏览器发送请求到服务器，服务器判断资源是否更新。
*   如果未更新：返回 `304`，继续使用本地缓存。
*   如果已更新：返回 `200` 和新资源。

**成对出现的 Header**：
1.  **`Last-Modified` / `If-Modified-Since`** (基于时间)
    *   Last-Modified：服务器告诉浏览器资源的最后修改时间。
    *   If-Modified-Since：浏览器告诉服务器上次缓存的时间。
    *   缺点：时间精度仅为秒级；如果文件内容没变但修改时间变了，也会重新请求。
2.  **`ETag` / `If-None-Match`** (基于内容指纹)
    *   ETag：服务器根据资源内容生成的唯一标识（如文件的 hash 值）。
    *   If-None-Match：浏览器携带上次缓存的 ETag
    *   优点：精度高，只有内容变了 ETag 才会变。
    *   缺点：计算 ETag 消耗服务器性能。
    *   **优先级**：ETag > Last-Modified。

### 5. 跨域与同源策略
*   **同源策略 (Same-Origin Policy)**：浏览器的核心安全机制。要求**协议**、**域名**、**端口**必须完全相同，否则禁止 JS 操作 DOM 或发送 AJAX 请求。
*   **CORS (跨域资源共享)**：W3C 标准，允许浏览器向跨源服务器发出 XMLHttpRequest 请求。
    *   **简单请求** (Simple Request)：
        *   方法为 HEAD, GET, POST。
        *   无自定义 Header，Content-Type 受限 (text/plain, multipart/form-data, application/x-www-form-urlencoded)。
        *   **流程**：浏览器直接发出请求，后端响应头包含 `Access-Control-Allow-Origin` 即可。
    *   **非简单请求** (Preflighted Request)：
        *   方法为 PUT, DELETE 或 Content-Type 为 `application/json`，或带自定义 Header (如 Token)。
        *   **流程**：浏览器先发送一个 **OPTIONS** 预检请求，询问服务器是否允许。服务器回复允许后，浏览器才发送正式请求。
    *   **关键响应头**：
        *   `Access-Control-Allow-Origin`: 允许访问的域名 (或 `*`)。
        *   `Access-Control-Allow-Methods`: 允许的方法。
        *   `Access-Control-Allow-Headers`: 允许的 Header (如 Authorization)。
        *   `Access-Control-Allow-Credentials`: `true` 表示允许发送 Cookie (此时 Origin 不能为 `*`)。

---

## 面试官怎么问

### Q1: OPTIONS 请求是做什么的？
**参考回答：**
OPTIONS 请求主要用于**CORS 预检** (Preflight)。
当发起跨域请求且不满足“简单请求”条件时（例如使用了 `application/json` 或自定义 Header），浏览器会自动先发一个 OPTIONS 请求，询问服务器支持哪些方法和 Header。只有得到服务器的许可（返回 204 或 200），浏览器才会发出真正的业务请求。

### Q2: 简单请求和非简单请求的区别？
**参考回答：**
*   **简单请求**：浏览器直接发送请求。条件是方法仅限 GET/HEAD/POST，Header 和 Content-Type 有限。
*   **非简单请求**：浏览器会先发 OPTIONS 预检。常见场景是 `application/json` 格式的 POST 请求，或者携带了 `Authorization` Token 的请求。

### Q3: 301 和 302 有什么区别？为什么不建议滥用 302？
**参考回答：**
*   301 是永久重定向，浏览器会缓存新的路由，下次直接访问新地址，减轻服务器压力；搜索引擎会合并权重。
*   302 是临时重定向，浏览器不会缓存，每次都去原地址请求；搜索引擎不合并权重。
*   **滥用 302 的危害**：容易导致 **URL 劫持**。如果 A 站 302 到 B 站，搜索引擎可能会误判 B 站的内容属于 A 站（因为 A 站还在），导致搜索 A 站关键词跳到 B 站，或者 B 站排名下降。

### Q2: 为什么有了 Last-Modified 还需要 ETag？
**参考回答：**
1.  **精度问题**：Last-Modified 只能精确到秒。如果在 1 秒内修改了多次文件，Last-Modified 无法感知。
2.  **内容未变**：有时候文件被“touch”了（修改时间变了），但内容其实没变。此时用 Last-Modified 会导致不必要的重新请求，而 ETag 基于内容摘要，能正确判断。
3.  **服务器生成规则**：某些服务器不能精确获取文件修改时间。

### Q3: 浏览器输入 URL 后，缓存的执行顺序是怎样的？
**参考回答：**
1.  **强缓存**：先检查 `Cache-Control` 和 `Expires`。如果命中且未过期，直接读取本地缓存 (200 OK)，不发请求。
2.  **协商缓存**：如果强缓存失效（过期或设置了 no-cache），则发送请求，带上 `If-None-Match` (ETag) 和 `If-Modified-Since` (Last-Modified)。
3.  **服务器判断**：
    *   命中协商缓存：返回 304，浏览器从本地读取。
    *   未命中：返回 200 和新资源，并更新 Header。
