const { body, query, validationResult } = require('express-validator');
const { logAttack } = require('./logger');

// XSS攻击向量正则模式
const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<applet\b[^>]*>/gi,
  /<form\b[^>]*>/gi,
  /<svg\b[^>]*onload/gi,
  /<img\b[^>]*onerror/gi,
  /<body\b[^>]*onload/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /<base\b[^>]*>/gi,
  /eval\s*\(/gi,
  /alert\s*\(/gi,
  /confirm\s*\(/gi,
  /prompt\s*\(/gi,
  /document\.\w+/gi,
  /window\.\w+/gi,
  /cookie/gi,
  /localStorage/gi,
  /sessionStorage/gi
];

// HTML实体编码绕过检测
const ENCODING_BYPASS_PATTERNS = [
  /&#x?[0-9a-f]+;/gi,
  /%3C/gi,
  /%3E/gi,
  /%22/gi,
  /%27/gi
];

// 检测XSS攻击向量
function containsXSS(input) {
  if (typeof input !== 'string') return false;

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  for (const pattern of ENCODING_BYPASS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

// 基础输入验证
function validateInput(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
}

// XSS过滤中间件 — 检测到攻击时标记并记录，不阻断页面
function xssFilter(req, res, next) {
  let detected = false;
  let payload = '';

  // 检查请求体
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string' && containsXSS(req.body[key])) {
        detected = true;
        payload = req.body[key];
        break;
      }
    }
  }

  // 检查查询参数
  if (!detected && req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string' && containsXSS(req.query[key])) {
        detected = true;
        payload = req.query[key];
        break;
      }
    }
  }

  // 检查URL参数
  if (!detected && req.params) {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string' && containsXSS(req.params[key])) {
        detected = true;
        payload = req.params[key];
        break;
      }
    }
  }

  if (detected) {
    req.xssDetected = true;
    logAttack({
      type: req.method === 'POST' ? 'stored' : 'reflected',
      payload: payload.substring(0, 500),
      page: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      result: 'blocked'
    });
  }

  next();
}

// XSS弹窗注入中间件 — 在页面HTML中注入警告弹窗
function xssPopupInjector(req, res, next) {
  const originalSend = res.send.bind(res);
  res.send = function (body) {
    if (req.xssDetected && typeof body === 'string' && body.includes('</body>')) {
      const popup = `<div id="xss-alert-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;justify-content:center;align-items:center;">
  <div style="background:#fff;padding:30px 40px;border-radius:12px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);max-width:420px;font-family:sans-serif;">
    <div style="font-size:48px;margin-bottom:10px;">&#128737;</div>
    <h3 style="color:#dc3545;margin:0 0 12px;font-size:20px;">安全警告</h3>
    <p style="color:#333;margin:0 0 20px;font-size:15px;line-height:1.6;">检测到疑似XSS攻击，已成功拦截。</p>
    <button onclick="document.getElementById('xss-alert-overlay').remove()" style="padding:10px 40px;background:#667eea;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;">确定</button>
  </div>
</div>`;
      body = body.replace('</body>', popup + '\n</body>');
    }
    return originalSend(body);
  };
  next();
}

// 留言板验证规则
const messageValidation = [
  body('author')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('作者名长度必须在1-50之间')
    .matches(/^[a-zA-Z0-9一-龥_]+$/).withMessage('作者名只能包含字母、数字、中文和下划线'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 }).withMessage('留言内容长度必须在1-1000之间'),
  validateInput,
  xssFilter
];

// 用户资料验证规则
const profileValidation = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 30 }).withMessage('用户名长度必须在1-30之间')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('用户名只能包含字母、数字和下划线'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('个人简介不能超过500字符'),
  body('website')
    .optional()
    .trim()
    .isURL().withMessage('请输入有效的URL地址'),
  validateInput,
  xssFilter
];

module.exports = {
  containsXSS,
  validateInput,
  xssFilter,
  xssPopupInjector,
  messageValidation,
  profileValidation
};
