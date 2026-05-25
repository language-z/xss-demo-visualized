const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase } = require('../db/init');
const { messageValidation, profileValidation, xssFilter, xssPopupInjector } = require('../middleware/inputValidator');
const { outputEncoder } = require('../middleware/outputEncoder');
const { cspMiddleware, secureCookieConfig, securityHeaders } = require('../middleware/cspConfig');

// 应用三层防御中间件
router.use(cspMiddleware);
router.use(secureCookieConfig);
router.use(securityHeaders);
router.use(outputEncoder);
router.use(xssPopupInjector);

// 安全版本首页
router.get('/', (req, res) => {
  res.render('secure/index');
});

// 安全版留言板 - 显示留言
router.get('/guestbook', async (req, res) => {
  const db = await getDatabase();
  const results = db.exec('SELECT * FROM messages ORDER BY created_at DESC');
  const messages = results.length > 0 ? results[0].values.map(row => ({
    id: row[0],
    author: row[1],
    content: row[2],
    created_at: row[3]
  })) : [];
  res.render('secure/guestbook', { messages });
});

// 安全版留言板 - 提交留言（启用三层防御）
router.post('/guestbook', messageValidation, async (req, res) => {
  // XSS检测到攻击时，保留页面并弹出警告
  if (req.xssDetected) {
    const db = await getDatabase();
    const results = db.exec('SELECT * FROM messages ORDER BY created_at DESC');
    const messages = results.length > 0 ? results[0].values.map(row => ({
      id: row[0], author: row[1], content: row[2], created_at: row[3]
    })) : [];
    return res.render('secure/guestbook', { messages });
  }

  const { author, content } = req.body;

  const db = await getDatabase();
  db.run("INSERT INTO messages (author, content, source) VALUES (?, ?, 'secure')", [author, content]);
  saveDatabase();

  res.redirect('/secure/guestbook');
});

// 安全版个人资料 - 显示用户列表
router.get('/profile', async (req, res) => {
  const db = await getDatabase();
  const results = db.exec('SELECT * FROM users ORDER BY created_at DESC');
  const users = results.length > 0 ? results[0].values.map(row => ({
    id: row[0],
    username: row[1],
    bio: row[2],
    website: row[3],
    created_at: row[4]
  })) : [];
  res.render('secure/profile', { users });
});

// 安全版个人资料 - 创建/更新用户（启用三层防御）
router.post('/profile', profileValidation, async (req, res) => {
  // XSS检测到攻击时，保留页面并弹出警告
  if (req.xssDetected) {
    const db = await getDatabase();
    const results = db.exec('SELECT * FROM users ORDER BY created_at DESC');
    const users = results.length > 0 ? results[0].values.map(row => ({
      id: row[0], username: row[1], bio: row[2], website: row[3], created_at: row[4]
    })) : [];
    return res.render('secure/profile', { users });
  }

  const { username, bio, website } = req.body;

  const db = await getDatabase();

  // 检查用户是否已存在
  const existingResults = db.exec('SELECT id FROM users WHERE username = ?', [username]);
  const existingUser = existingResults.length > 0 ? { id: existingResults[0].values[0][0] } : null;

  if (existingUser) {
    // 更新
    db.run('UPDATE users SET bio = ?, website = ? WHERE id = ?', [bio || '', website || '', existingUser.id]);
  } else {
    // 创建
    db.run("INSERT INTO users (username, bio, website, source) VALUES (?, ?, ?, 'secure')", [username, bio || '', website || '']);
  }
  saveDatabase();

  res.redirect('/secure/profile');
});

// 安全版搜索（反射型XSS防御）
router.get('/search', xssFilter, (req, res) => {
  const { q } = req.query;
  // 使用DOMPurify净化查询参数
  const { sanitizeHTML } = require('../middleware/outputEncoder');
  const sanitizedQuery = sanitizeHTML(q || '');
  res.render('secure/search', { query: sanitizedQuery });
});

// 安全版用户详情
router.get('/user/:id', xssFilter, async (req, res) => {
  const db = await getDatabase();
  const results = db.exec('SELECT * FROM users WHERE id = ?', [req.params.id]);
  const user = results.length > 0 ? {
    id: results[0].values[0][0],
    username: results[0].values[0][1],
    bio: results[0].values[0][2],
    website: results[0].values[0][3],
    created_at: results[0].values[0][4]
  } : null;
  res.render('secure/user', { user });
});

// 安全版DOM型XSS演示页面
router.get('/domxss', (req, res) => {
  res.render('secure/domxss');
});

module.exports = router;
