# XSS攻击防御系统

基于Node.js/Express的三层纵深防御体系，用于演示XSS攻击与防御。

## 功能特性

### 三层纵深防御体系

1. **输入验证层** (express-validator)
   - 基础字段验证（长度、格式）
   - XSS攻击向量正则过滤
   - 白名单机制

2. **输出编码层** (EJS + DOMPurify)
   - EJS模板自动HTML转义
   - DOMPurify HTML净化
   - 多上下文编码策略

3. **CSP防护层** (helmet)
   - Content Security Policy配置
   - HttpOnly Cookie
   - 安全响应头

### XSS攻击类型演示

- **存储型XSS**: 留言板、个人资料
- **反射型XSS**: 搜索功能
- **DOM型XSS**: URL Fragment、innerHTML、eval等

- **安全监控仪表盘**: 实时监控、统计分析
- **自动化攻击测试**: 批量测试、生成报告
- **防御效果对比**: 漏洞版本 vs 安全版本
- **API安全测试**: REST API防御

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动应用

```bash
npm start
```

应用将在 http://localhost:3000 启动。

## 页面说明

### 首页
- http://localhost:3000

### 漏洞版本（用于XSS攻击测试）
- 留言板: http://localhost:3000/vulnerable/guestbook
- 个人资料: http://localhost:3000/vulnerable/profile
- 搜索: http://localhost:3000/vulnerable/search?q=test
- DOM型XSS: http://localhost:3000/vulnerable/domxss

### 安全版本（防御效果验证）
- 留言板: http://localhost:3000/secure/guestbook
- 个人资料: http://localhost:3000/secure/profile
- 搜索: http://localhost:3000/secure/search?q=test
- DOM型XSS: http://localhost:3000/secure/domxss

### 管理后台
- 仪表盘: http://localhost:3000/admin/dashboard
- 攻击日志: http://localhost:3000/admin/logs
- 自动化测试: http://localhost:3000/admin/test
- 对比分析: http://localhost:3000/admin/compare

- API文档: http://localhost:3000/api

## XSS测试用例

### 存储型XSS测试

在留言板或个人资料中输入：

```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
```

### 反射型XSS测试

访问以下URL：

```
http://localhost:3000/vulnerable/search?q=<script>alert('XSS')</script>
```

### DOM型XSS测试

访问以下URL：

```
http://localhost:3000/vulnerable/domxss#<img src=x onerror=alert('XSS')>
```

### 测试结果对比

- **漏洞版本**: XSS payload会执行，弹出警告框
- **安全版本**: XSS payload被拦截或净化，不会执行

## 技术栈

- Node.js v20.x
- Express v4.x
- EJS v3.x
- helmet v7.x
- express-validator v7.x
- DOMPurify v3.x
- jsdom v24.x
- sql.js v1.10.x (SQLite数据库)
- cookie-parser (Session管理)

## 项目结构

```
xss-defense-system/
├── app.js                    # 主应用入口
├── package.json              # 依赖配置
├── README.md                 # 项目文档
├── xss防御系统.db            # SQLite数据库文件
├── logs/                     # 攻击日志目录
├── db/
│   └── init.js               # 数据库初始化
├── middleware/
│   ├── inputValidator.js     # 输入验证层
│   ├── outputEncoder.js      # 输出编码层
│   ├── cspConfig.js          # CSP防护层
│   └── logger.js             # 攻击日志记录
├── routes/
│   ├── vulnerable.js         # 漏洞版本路由
│   ├── secure.js             # 安全版本路由
│   ├── admin.js              # 管理后台路由
│   ├── api.js                # API路由
├── views/
│   ├── index.ejs             # 首页
│   ├── vulnerable/           # 漏洞版本视图
│   ├── secure/               # 安全版本视图
│   ├── admin/                # 管理后台视图
│   └── api/                  # API视图
├── public/
│   └── css/
│       └── style.css         # 样式文件
└── test/
    └── xss-payloads.txt      # XSS攻击向量测试集
```

## 防御机制详解

### 1. 输入验证层

```javascript
// XSS攻击向量检测
const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  // ... 更多模式
];

// 验证规则
const messageValidation = [
  body('author').trim().isLength({ min: 1, max: 50 }),
  body('content').trim().isLength({ min: 1, max: 1000 }),
  xssFilter
];
```

### 2. 输出编码层

```javascript
// DOMPurify配置
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'title', 'class'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed']
};

// HTML净化
function sanitizeHTML(dirty) {
  return DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG);
}
```

### 3. CSP防护层

```javascript
// CSP配置
const cspOptions = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"]
  }
};
```

## 测试方法

### 1. 功能测试

1. 启动应用
2. 访问漏洞版本页面
3. 提交包含XSS payload的留言
4. 验证XSS payload被执行
5. 访问安全版本页面
6. 提交相同的XSS payload
7. 验证XSS payload被拦截

### 2. 防御效果测试

使用test/xss-payloads.txt中的测试向量：

```bash
# 测试输入验证层
curl -X POST -d "author=Test&content=<script>alert('XSS')</script>" \
  http://localhost:3000/secure/guestbook

# 预期结果：返回400错误
```

### 3. 安全头测试

```bash
# 检查CSP头
curl -I http://localhost:3000/secure/guestbook | grep Content-Security-Policy

# 检查其他安全头
curl -I http://localhost:3000/secure/guestbook | grep -E "X-Frame-Options|X-Content-Type-Options"
```

### 4. API测试

```bash
# 测试安全版本API
curl -X POST -d '{"payload":"<script>alert(\"XSS\")</script>"}' \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/test/secure

# 预期结果：返回400错误，payload被拦截
```

## 注意事项

1. 此系统仅用于学习和演示目的
2. 漏洞版本存在真实的安全风险，请勿在生产环境使用
3. 安全版本的配置已针对演示环境优化，生产环境需要进一步加固
4. SQLite数据库会持久化存储数据

## 参考资料

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [SQL.js Documentation](https://github.com/sql-js/sql.js)
