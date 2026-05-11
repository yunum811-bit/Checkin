const express = require('express');
const { queryGet, queryAll, queryRun } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all announcements (public for logged-in users)
router.get('/', authenticateToken, (req, res) => {
  try {
    const announcements = queryAll(`
      SELECT a.*, u.name as author_name
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      ORDER BY a.pinned DESC, a.created_at DESC
      LIMIT 50
    `);
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Create announcement (admin/manager)
router.post('/', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์สร้างประกาศ' });
    }

    const { title, content, priority, pinned } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'กรุณากรอกหัวข้อและเนื้อหา' });
    }

    const result = queryRun(
      `INSERT INTO announcements (title, content, priority, pinned, created_by) VALUES (?, ?, ?, ?, ?)`,
      [title, content, priority || 'normal', pinned ? 1 : 0, req.user.id]
    );

    const announcement = queryGet(`
      SELECT a.*, u.name as author_name
      FROM announcements a JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json({ message: 'สร้างประกาศสำเร็จ', announcement });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Update announcement (admin/manager - owner or admin)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const announcement = queryGet('SELECT * FROM announcements WHERE id = ?', [parseInt(req.params.id)]);
    if (!announcement) {
      return res.status(404).json({ error: 'ไม่พบประกาศ' });
    }
    if (req.user.role !== 'admin' && announcement.created_by !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขประกาศนี้' });
    }

    const { title, content, priority, pinned } = req.body;
    queryRun(
      `UPDATE announcements SET title = ?, content = ?, priority = ?, pinned = ? WHERE id = ?`,
      [title || announcement.title, content || announcement.content, priority || announcement.priority, pinned !== undefined ? (pinned ? 1 : 0) : announcement.pinned, parseInt(req.params.id)]
    );

    const updated = queryGet(`
      SELECT a.*, u.name as author_name
      FROM announcements a JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `, [parseInt(req.params.id)]);
    res.json({ message: 'อัปเดตประกาศสำเร็จ', announcement: updated });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Delete announcement (admin/manager - owner or admin)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const announcement = queryGet('SELECT * FROM announcements WHERE id = ?', [parseInt(req.params.id)]);
    if (!announcement) {
      return res.status(404).json({ error: 'ไม่พบประกาศ' });
    }
    if (req.user.role !== 'admin' && announcement.created_by !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบประกาศนี้' });
    }

    queryRun('DELETE FROM announcements WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'ลบประกาศสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

module.exports = router;
