const express = require('express');
const bcrypt = require('bcryptjs');
const { queryGet, queryAll, queryRun } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin/manager/gm)
router.get('/', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'md') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const users = queryAll(`
      SELECT u.id, u.employee_id, u.name, u.email, u.department, u.role, u.position, u.manager_id, u.created_at,
             m.name as manager_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      ORDER BY u.employee_id
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get managers list (for assigning)
router.get('/managers', authenticateToken, (req, res) => {
  try {
    const managers = queryAll("SELECT id, employee_id, name, department, role, position FROM users WHERE role IN ('manager', 'md', 'admin') ORDER BY name");
    res.json(managers);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Create user (admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { employee_id, name, email, password, department, role, position, manager_id } = req.body;

    if (!employee_id || !name || !email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const existing = queryGet('SELECT id FROM users WHERE email = ? OR employee_id = ?', [email, employee_id]);
    if (existing) {
      return res.status(400).json({ error: 'อีเมลหรือรหัสพนักงานซ้ำ' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = queryRun(
      `INSERT INTO users (employee_id, name, email, password, department, role, position, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, name, email, hashedPassword, department || '', role || 'employee', position || '', manager_id || null]
    );

    const user = queryGet(`
      SELECT u.id, u.employee_id, u.name, u.email, u.department, u.role, u.position, u.manager_id, m.name as manager_name
      FROM users u LEFT JOIN users m ON u.manager_id = m.id WHERE u.id = ?
    `, [result.lastInsertRowid]);
    res.status(201).json({ message: 'สร้างผู้ใช้สำเร็จ', user });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Update user (admin)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, email, department, role, position, manager_id } = req.body;
    const user = queryGet('SELECT * FROM users WHERE id = ?', [parseInt(req.params.id)]);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    queryRun(
      `UPDATE users SET name = ?, email = ?, department = ?, role = ?, position = ?, manager_id = ? WHERE id = ?`,
      [
        name || user.name,
        email || user.email,
        department !== undefined ? department : user.department,
        role || user.role,
        position !== undefined ? position : user.position,
        manager_id !== undefined ? manager_id : user.manager_id,
        parseInt(req.params.id)
      ]
    );

    const updated = queryGet(`
      SELECT u.id, u.employee_id, u.name, u.email, u.department, u.role, u.position, u.manager_id, m.name as manager_name
      FROM users u LEFT JOIN users m ON u.manager_id = m.id WHERE u.id = ?
    `, [parseInt(req.params.id)]);
    res.json({ message: 'อัปเดตผู้ใช้สำเร็จ', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Delete user (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'ไม่สามารถลบตัวเองได้' });
    }

    // Check if user is a manager of others
    const subordinates = queryAll('SELECT id, name FROM users WHERE manager_id = ?', [parseInt(req.params.id)]);
    if (subordinates.length > 0) {
      return res.status(400).json({ 
        error: `ไม่สามารถลบได้ เนื่องจากเป็นหัวหน้าของ ${subordinates.length} คน กรุณาเปลี่ยนหัวหน้าก่อน` 
      });
    }

    queryRun('DELETE FROM leave_approvals WHERE approver_id = ?', [parseInt(req.params.id)]);
    queryRun('DELETE FROM users WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

module.exports = router;
