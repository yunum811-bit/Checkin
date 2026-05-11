const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryGet } = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    const user = queryGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        position: user.position,
        manager_id: user.manager_id
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = queryGet(`
      SELECT u.id, u.employee_id, u.name, u.email, u.department, u.role, u.position, u.manager_id, u.created_at,
             m.name as manager_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = ?
    `, [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Change password
router.put('/change-password', authenticateToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { queryRun } = require('../database');
    const user = queryGet('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    queryRun('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

module.exports = router;
