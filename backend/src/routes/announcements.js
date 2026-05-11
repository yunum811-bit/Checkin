const express = require('express');
const path = require('path');
const fs = require('fs');
const { queryGet, queryAll, queryRun } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Ensure attachments directory exists
const attachDir = path.join(__dirname, '..', '..', 'uploads', 'attachments');
if (!fs.existsSync(attachDir)) {
  fs.mkdirSync(attachDir, { recursive: true });
}

// Save base64 file
function saveAttachment(base64Data, originalName) {
  if (!base64Data) return { filename: '', originalName: '' };
  try {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return { filename: '', originalName: '' };

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    // Determine extension from mime type
    const extMap = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/plain': 'txt'
    };
    const ext = extMap[mimeType] || originalName?.split('.').pop() || 'bin';
    const filename = `attach_${Date.now()}.${ext}`;
    const filePath = path.join(attachDir, filename);

    fs.writeFileSync(filePath, buffer);
    return { filename, originalName: originalName || filename };
  } catch (err) {
    console.error('Error saving attachment:', err);
    return { filename: '', originalName: '' };
  }
}

// Serve attachment file
router.get('/attachment/:filename', (req, res) => {
  const filePath = path.join(attachDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'ไม่พบไฟล์' });
  }
});

// Get all announcements
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

// Create announcement (admin/manager/md)
router.post('/', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'md') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์สร้างประกาศ' });
    }

    const { title, content, priority, pinned, attachment, attachment_name } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'กรุณากรอกหัวข้อและเนื้อหา' });
    }

    // Save attachment if provided
    const saved = saveAttachment(attachment, attachment_name);

    const result = queryRun(
      `INSERT INTO announcements (title, content, priority, pinned, attachment, attachment_name, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, content, priority || 'normal', pinned ? 1 : 0, saved.filename, saved.originalName, req.user.id]
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

// Update announcement
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const announcement = queryGet('SELECT * FROM announcements WHERE id = ?', [parseInt(req.params.id)]);
    if (!announcement) {
      return res.status(404).json({ error: 'ไม่พบประกาศ' });
    }
    if (req.user.role !== 'admin' && announcement.created_by !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขประกาศนี้' });
    }

    const { title, content, priority, pinned, attachment, attachment_name, remove_attachment } = req.body;

    let attachFilename = announcement.attachment;
    let attachOriginalName = announcement.attachment_name;

    // Remove old attachment if requested or replacing
    if (remove_attachment || attachment) {
      if (announcement.attachment) {
        const oldPath = path.join(attachDir, announcement.attachment);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      attachFilename = '';
      attachOriginalName = '';
    }

    // Save new attachment
    if (attachment) {
      const saved = saveAttachment(attachment, attachment_name);
      attachFilename = saved.filename;
      attachOriginalName = saved.originalName;
    }

    queryRun(
      `UPDATE announcements SET title = ?, content = ?, priority = ?, pinned = ?, attachment = ?, attachment_name = ? WHERE id = ?`,
      [title || announcement.title, content || announcement.content, priority || announcement.priority, pinned !== undefined ? (pinned ? 1 : 0) : announcement.pinned, attachFilename, attachOriginalName, parseInt(req.params.id)]
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

// Delete announcement
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const announcement = queryGet('SELECT * FROM announcements WHERE id = ?', [parseInt(req.params.id)]);
    if (!announcement) {
      return res.status(404).json({ error: 'ไม่พบประกาศ' });
    }
    if (req.user.role !== 'admin' && announcement.created_by !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบประกาศนี้' });
    }

    // Delete attachment file
    if (announcement.attachment) {
      const filePath = path.join(attachDir, announcement.attachment);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    queryRun('DELETE FROM announcements WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'ลบประกาศสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

module.exports = router;
