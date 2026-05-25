const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase } = require('../db/init');

// 漏洞版本首页
router.get('/', (req, res) => {
  res.render('vulnerable/index');
});

// 漏洞版留言板 - 显示留言
router.get('/guestbook', async (req, res) => {
  const db = await getDatabase();
  const results = db.exec('SELECT * FROM messages ORDER BY created_at DESC');
  const messages = results.length > 0 ? results[0].values.map(row => ({
    id: row[0],
    author: row[1],
    content: row[2],
    created_at: row[3]
  })) : [];
  res.render('vulnerable/guestbook', { messages });
});

// 漏洞版留言板 - 提交留言（无任何验证和编码）
router.post('/guestbook', async (req, res) => {
  const { author, content } = req.body;

  // 直接存储用户输入，无任何过滤
  const db = await getDatabase();
  db.run("INSERT INTO messages (author, content, source) VALUES (?, ?, 'vulnerable')", [author, content]);
  saveDatabase();

  res.redirect('/vulnerable/guestbook');
});

// 漏洞版个人资料 - 显示用户列表
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
  res.render('vulnerable/profile', { users });
});

// 漏洞版个人资料 - 创建/更新用户（无任何验证和编码）
router.post('/profile', async (req, res) => {
  const { username, bio, website } = req.body;

  // 直接存储用户输入，无任何过滤
  const db = await getDatabase();

  // 检查用户是否已存在
  const existingResults = db.exec('SELECT id FROM users WHERE username = ?', [username]);
  const existingUser = existingResults.length > 0 ? { id: existingResults[0].values[0][0] } : null;

  if (existingUser) {
    // 更新
    db.run('UPDATE users SET bio = ?, website = ? WHERE id = ?', [bio || '', website || '', existingUser.id]);
  } else {
    // 创建
    db.run("INSERT INTO users (username, bio, website, source) VALUES (?, ?, ?, 'vulnerable')", [username, bio || '', website || '']);
  }
  saveDatabase();

  res.redirect('/vulnerable/profile');
});

// 漏洞版搜索（反射型XSS）
router.get('/search', (req, res) => {
  const { q } = req.query;
  // 直接输出用户输入到页面，无任何编码
  res.render('vulnerable/search', { query: q || '' });
});

// 漏洞版用户详情（DOM型XSS演示）
router.get('/user/:id', async (req, res) => {
  const db = await getDatabase();
  const results = db.exec('SELECT * FROM users WHERE id = ?', [req.params.id]);
  const user = results.length > 0 ? {
    id: results[0].values[0][0],
    username: results[0].values[0][1],
    bio: results[0].values[0][2],
    website: results[0].values[0][3],
    created_at: results[0].values[0][4]
  } : null;
  res.render('vulnerable/user', { user });
});

// 漏洞版DOM型XSS演示页面
router.get('/domxss', (req, res) => {
  res.render('vulnerable/domxss');
});

module.exports = router;
