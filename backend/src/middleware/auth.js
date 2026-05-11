const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'checkin-system-secret-key-2024';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
  }
  next();
}

function requireManagerOrAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'md') {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง (ต้องเป็นหัวหน้า, MD หรือผู้ดูแลระบบ)' });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, requireManagerOrAdmin, JWT_SECRET };
