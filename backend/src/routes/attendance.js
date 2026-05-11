const express = require('express');
const path = require('path');
const fs = require('fs');
const { queryGet, queryAll, queryRun } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded photos
router.get('/photo/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'ไม่พบรูปภาพ' });
  }
});

// Save base64 photo to file
function savePhoto(base64Data, userId, type) {
  if (!base64Data) return '';
  
  try {
    // Remove data:image/...;base64, prefix
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return '';

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${userId}_${type}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filePath, buffer);
    return filename;
  } catch (err) {
    console.error('Error saving photo:', err);
    return '';
  }
}

// Get today's attendance status
router.get('/today', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = queryGet('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
    res.json(record || { checked_in: false });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Check-in (with photo)
router.post('/checkin', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('th-TH', { hour12: false });
    const { location, note, photo } = req.body;

    // Check if already checked in today
    const existing = queryGet('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: 'คุณได้เช็คอินวันนี้แล้ว' });
    }

    // Save photo
    const photoFilename = savePhoto(photo, req.user.id, 'checkin');

    // Determine status based on time (late if after 9:00)
    const hour = new Date().getHours();
    const status = hour >= 9 ? 'late' : 'present';

    if (existing) {
      queryRun(
        `UPDATE attendance SET check_in_time = ?, check_in_location = ?, status = ?, note = ?, check_in_photo = ? WHERE user_id = ? AND date = ?`,
        [now, location || '', status, note || '', photoFilename, req.user.id, today]
      );
    } else {
      queryRun(
        `INSERT INTO attendance (user_id, date, check_in_time, check_in_location, status, note, check_in_photo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, today, now, location || '', status, note || '', photoFilename]
      );
    }

    const record = queryGet('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
    res.json({ message: 'เช็คอินสำเร็จ', record });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Check-out (with photo)
router.post('/checkout', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('th-TH', { hour12: false });
    const { location, note, photo } = req.body;

    const existing = queryGet('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
    if (!existing || !existing.check_in_time) {
      return res.status(400).json({ error: 'กรุณาเช็คอินก่อน' });
    }
    if (existing.check_out_time) {
      return res.status(400).json({ error: 'คุณได้เช็คเอาท์วันนี้แล้ว' });
    }

    // Save photo
    const photoFilename = savePhoto(photo, req.user.id, 'checkout');

    const updatedNote = existing.note ? existing.note + ' | ' + (note || '') : (note || '');
    queryRun(
      `UPDATE attendance SET check_out_time = ?, check_out_location = ?, note = ?, check_out_photo = ? WHERE user_id = ? AND date = ?`,
      [now, location || '', updatedNote, photoFilename, req.user.id, today]
    );

    const record = queryGet('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
    res.json({ message: 'เช็คเอาท์สำเร็จ', record });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get attendance history
router.get('/history', authenticateToken, (req, res) => {
  try {
    const { month, year } = req.query;
    let sql = 'SELECT * FROM attendance WHERE user_id = ?';
    const params = [req.user.id];

    if (month && year) {
      const paddedMonth = String(month).padStart(2, '0');
      sql += " AND date LIKE ?";
      params.push(`${year}-${paddedMonth}%`);
    }

    sql += ' ORDER BY date DESC LIMIT 31';
    const records = queryAll(sql, params);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get all attendance (admin)
router.get('/all', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const records = queryAll(`
      SELECT a.*, u.name, u.employee_id, u.department
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.date = ?
      ORDER BY a.check_in_time ASC
    `, [targetDate]);

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get summary statistics
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || String(new Date().getMonth() + 1).padStart(2, '0');
    const currentYear = year || String(new Date().getFullYear());
    const datePattern = `${currentYear}-${currentMonth}%`;

    const userId = req.user.role === 'admin' && req.query.user_id ? req.query.user_id : req.user.id;

    const totalDays = queryGet('SELECT COUNT(*) as count FROM attendance WHERE user_id = ? AND date LIKE ?', [userId, datePattern]);
    const lateDays = queryGet("SELECT COUNT(*) as count FROM attendance WHERE user_id = ? AND date LIKE ? AND status = 'late'", [userId, datePattern]);
    const leaveDays = queryGet("SELECT COUNT(*) as count FROM leaves WHERE user_id = ? AND start_date LIKE ? AND status = 'approved'", [userId, datePattern]);

    res.json({
      total_days: totalDays?.count || 0,
      late_days: lateDays?.count || 0,
      leave_days: leaveDays?.count || 0,
      on_time_days: (totalDays?.count || 0) - (lateDays?.count || 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

module.exports = router;
