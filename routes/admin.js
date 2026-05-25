const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getAttackLogs, getAttackStats, clearLogs } = require('../middleware/logger');
const { clearAllData, clearMessages, clearUsers, getDataStats, getDatabase } = require('../db/init');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const adminSessions = new Map();

function createSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function getSafeNext(nextUrl) {
  return typeof nextUrl === 'string' && nextUrl.startsWith('/admin/') ? nextUrl : '/admin/dashboard';
}

function requireAdmin(req, res, next) {
  const sessionId = req.cookies?.adminSessionId;
  if (sessionId && adminSessions.has(sessionId)) {
    req.admin = adminSessions.get(sessionId);
    return next();
  }

  res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
}

router.get('/login', (req, res) => {
  res.render('admin/login', {
    error: null,
    next: getSafeNext(req.query.next)
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const nextUrl = getSafeNext(req.body.next);

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).render('admin/login', {
      error: '用户名或密码错误',
      next: nextUrl
    });
  }

  const sessionId = createSessionId();
  adminSessions.set(sessionId, {
    username,
    loginTime: new Date().toISOString()
  });

  res.cookie('adminSessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.redirect(nextUrl);
});

router.get('/logout', (req, res) => {
  const sessionId = req.cookies?.adminSessionId;
  if (sessionId) {
    adminSessions.delete(sessionId);
  }
  res.clearCookie('adminSessionId');
  res.redirect('/admin/login');
});

router.use(requireAdmin);

router.get('/dashboard', async (req, res) => {
  const stats = getAttackStats();
  const recentLogs = getAttackLogs({ limit: 10 }).data;
  const dataStats = await getDataStats();
  res.render('admin/dashboard', { stats, recentLogs, dataStats });
});

router.get('/logs', (req, res) => {
  const { type, startDate, endDate, page } = req.query;
  const logs = getAttackLogs({ type, startDate, endDate, page: parseInt(page) || 1 });
  res.render('admin/logs', { logs, filters: { type, startDate, endDate } });
});

router.get('/logs/clear', (req, res) => {
  clearLogs('attacks');
  res.redirect('/admin/logs');
});

router.get('/database', async (req, res) => {
  const dataStats = await getDataStats();
  const db = await getDatabase();
  const messages = db.exec("SELECT * FROM messages WHERE source = 'secure' ORDER BY created_at DESC LIMIT 50");
  const users = db.exec("SELECT * FROM users WHERE source = 'secure' ORDER BY created_at DESC LIMIT 50");

  const messageList = messages.length > 0 ? messages[0].values.map(row => ({
    id: row[0],
    author: row[1],
    content: row[2],
    created_at: row[3]
  })) : [];

  const userList = users.length > 0 ? users[0].values.map(row => ({
    id: row[0],
    username: row[1],
    bio: row[2],
    website: row[3],
    created_at: row[4]
  })) : [];

  res.render('admin/database', { dataStats, messages: messageList, users: userList });
});

router.get('/database/clear-all', async (req, res) => {
  await clearAllData();
  res.redirect('/admin/dashboard');
});

router.get('/database/clear-messages', async (req, res) => {
  await clearMessages();
  res.redirect('/admin/dashboard');
});

router.get('/database/clear-users', async (req, res) => {
  await clearUsers();
  res.redirect('/admin/dashboard');
});

router.get('/database/delete-message/:id', async (req, res) => {
  const db = await getDatabase();
  db.run('DELETE FROM messages WHERE id = ?', [req.params.id]);
  const { saveDatabase } = require('../db/init');
  saveDatabase();
  res.redirect('/admin/database');
});

router.get('/database/delete-user/:id', async (req, res) => {
  const db = await getDatabase();
  db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
  const { saveDatabase } = require('../db/init');
  saveDatabase();
  res.redirect('/admin/database');
});

router.get('/api/stats', async (req, res) => {
  const stats = getAttackStats();
  const dataStats = await getDataStats();
  res.json({ stats, dataStats });
});

router.post('/api/clear', async (req, res) => {
  const { type } = req.body;
  if (type === 'all') await clearAllData();
  else if (type === 'messages') await clearMessages();
  else if (type === 'users') await clearUsers();

  const stats = getAttackStats();
  const dataStats = await getDataStats();
  res.json({ success: true, stats, dataStats });
});

module.exports = router;
