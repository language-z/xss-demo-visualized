const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('./db/init');
const vulnerableRoutes = require('./routes/vulnerable');
const secureRoutes = require('./routes/secure');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 基础安全头（不启用CSP，用于漏洞版本对比）
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// 路由
app.get('/', (req, res) => {
  res.render('index');
});

// 漏洞版本路由（无防御措施）
app.use('/vulnerable', vulnerableRoutes);

// 安全版本路由（启用三层防御）
app.use('/secure', secureRoutes);

// 管理员路由
app.use('/admin', adminRoutes);

// 认证路由


// 404处理
app.use((req, res) => {
  res.status(404).render('index', { error: '页面未找到' });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    console.log('数据库初始化完成');

    app.listen(PORT, () => {
      console.log(`XSS防御系统已启动: http://localhost:${PORT}`);
      console.log(`漏洞版本: http://localhost:${PORT}/vulnerable`);
      console.log(`安全版本: http://localhost:${PORT}/secure`);
      console.log(`管理后台: http://localhost:${PORT}/admin/dashboard`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
