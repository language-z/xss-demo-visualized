const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const ATTACK_LOG_FILE = path.join(LOG_DIR, 'attacks.json');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function readLog(filename) {
  try {
    if (fs.existsSync(filename)) {
      const data = fs.readFileSync(filename, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取日志失败:', error);
  }
  return [];
}

function writeLog(filename, data) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('写入日志失败:', error);
  }
}

function logAttack(attackInfo) {
  const logs = readLog(ATTACK_LOG_FILE);
  logs.push({
    id: logs.length + 1,
    timestamp: new Date().toISOString(),
    ...attackInfo
  });

  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000);
  }

  writeLog(ATTACK_LOG_FILE, logs);
  return logs[logs.length - 1];
}

function getAttackLogs(options = {}) {
  const logs = readLog(ATTACK_LOG_FILE);
  let filtered = logs;

  if (options.type) {
    filtered = filtered.filter(log => log.type === options.type);
  }

  if (options.startDate) {
    filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(options.startDate));
  }

  if (options.endDate) {
    filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(options.endDate));
  }

  const page = options.page || 1;
  const limit = options.limit || 50;
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    total: filtered.length,
    page,
    limit,
    data: filtered.slice(start, end).reverse()
  };
}

function getAttackStats() {
  const logs = readLog(ATTACK_LOG_FILE);
  const byType = {};
  const byResult = {};
  const byPage = {};

  logs.forEach(log => {
    byType[log.type] = (byType[log.type] || 0) + 1;
    byResult[log.result] = (byResult[log.result] || 0) + 1;
    byPage[log.page] = (byPage[log.page] || 0) + 1;
  });

  const now = new Date();
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last7Days.push({
      date: dateStr,
      count: logs.filter(log => log.timestamp.startsWith(dateStr)).length
    });
  }

  return {
    total: logs.length,
    byType,
    byResult,
    last7Days,
    byPage
  };
}

function clearLogs(type = 'all') {
  if (type === 'all' || type === 'attacks') {
    writeLog(ATTACK_LOG_FILE, []);
  }
}

function attackDetector(req, res, next) {
  const xssPatterns = [
    /<script\b[^>]*>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /<img\b[^>]*onerror/gi,
    /<svg\b[^>]*onload/gi
  ];

  const checkString = (str) => {
    if (typeof str !== 'string') return false;
    return xssPatterns.some(pattern => pattern.test(str));
  };

  let detected = false;
  let payload = '';

  if (req.body) {
    for (const key in req.body) {
      if (checkString(req.body[key])) {
        detected = true;
        payload = req.body[key];
        break;
      }
    }
  }

  if (!detected && req.query) {
    for (const key in req.query) {
      if (checkString(req.query[key])) {
        detected = true;
        payload = req.query[key];
        break;
      }
    }
  }

  if (detected) {
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

module.exports = {
  logAttack,
  getAttackLogs,
  getAttackStats,
  clearLogs,
  attackDetector
};
