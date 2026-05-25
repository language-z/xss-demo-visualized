const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'xss防御系统.db');

let db = null;
let isInitialized = false;

async function getDatabase() {
  if (!db) {
    const SQL = await initSqlJs();

    // 尝试从文件加载数据库
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('从文件加载数据库');
    } else {
      db = new SQL.Database();
      console.log('创建新数据库');
    }

    // 创建表
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'secure'
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        bio TEXT,
        website TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'secure'
      )
    `);

    // 兼容旧数据库：添加 source 列（如果不存在）
    try { db.run("ALTER TABLE messages ADD COLUMN source TEXT DEFAULT 'secure'"); } catch (e) {}
    try { db.run("ALTER TABLE users ADD COLUMN source TEXT DEFAULT 'secure'"); } catch (e) {}

    // 保存初始状态
    saveDatabase();
  }
  return db;
}

function saveDatabase() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
      console.log('数据库已保存到文件');
    } catch (error) {
      console.error('保存数据库失败:', error);
    }
  }
}

async function initDatabase() {
  await getDatabase();
  console.log('数据库初始化完成');
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// 清除所有数据
async function clearAllData() {
  const database = await getDatabase();
  database.run('DELETE FROM messages');
  database.run('DELETE FROM users');
  database.run('DELETE FROM sqlite_sequence'); // 重置自增ID
  saveDatabase();
  console.log('所有数据已清除');
}

// 清除留言数据
async function clearMessages() {
  const database = await getDatabase();
  database.run('DELETE FROM messages');
  saveDatabase();
  console.log('留言数据已清除');
}

// 清除用户数据
async function clearUsers() {
  const database = await getDatabase();
  database.run('DELETE FROM users');
  saveDatabase();
  console.log('用户数据已清除');
}

// 获取数据统计（仅统计防御版本数据）
async function getDataStats() {
  const database = await getDatabase();
  const messages = database.exec("SELECT COUNT(*) as count FROM messages WHERE source = 'secure'");
  const users = database.exec("SELECT COUNT(*) as count FROM users WHERE source = 'secure'");
  return {
    messages: messages.length > 0 ? messages[0].values[0][0] : 0,
    users: users.length > 0 ? users[0].values[0][0] : 0
  };
}

module.exports = { getDatabase, initDatabase, closeDatabase, saveDatabase, clearAllData, clearMessages, clearUsers, getDataStats };
