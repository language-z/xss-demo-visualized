const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// DOMPurify配置
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'span'],
  ALLOWED_ATTR: ['href', 'title', 'class'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
};

// HTML净化
function sanitizeHTML(dirty) {
  if (typeof dirty !== 'string') return dirty;
  return DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG);
}

// HTML实体编码
function escapeHTML(str) {
  if (typeof str !== 'string') return str;

  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#96;'
  };

  return str.replace(/[&<>"'`/]/g, char => htmlEntities[char]);
}

// URL编码
function encodeURL(str) {
  if (typeof str !== 'string') return str;
  return encodeURIComponent(str);
}

// JavaScript编码
function escapeJS(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e');
}

// CSS编码
function escapeCSS(str) {
  if (typeof str !== 'string') return str;

  return str.replace(/[^\w\s-]/g, char => {
    const hex = char.charCodeAt(0).toString(16);
    return `\\${hex} `;
  });
}

// 多上下文编码中间件
function outputEncoder(req, res, next) {
  // 将编码函数注入res对象，供模板使用
  res.locals.sanitizeHTML = sanitizeHTML;
  res.locals.escapeHTML = escapeHTML;
  res.locals.encodeURL = encodeURL;
  res.locals.escapeJS = escapeJS;
  res.locals.escapeCSS = escapeCSS;

  // 包装res.render方法，自动净化数据
  const originalRender = res.render.bind(res);
  res.render = function(view, locals = {}, callback) {
    // 递归净化对象中的字符串值
    function sanitizeObject(obj) {
      if (typeof obj === 'string') {
        return sanitizeHTML(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
        }
        return sanitized;
      }
      return obj;
    }

    // 净化传递给视图的数据
    const sanitizedLocals = sanitizeObject(locals);
    originalRender(view, sanitizedLocals, callback);
  };

  next();
}

module.exports = {
  sanitizeHTML,
  escapeHTML,
  encodeURL,
  escapeJS,
  escapeCSS,
  outputEncoder
};
