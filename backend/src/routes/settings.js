const express = require('express');
const path = require('path');
const fs = require('fs');
const { queryGet, queryAll, queryRun } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Ensure logo directory exists
const logoDir = path.join(__dirname, '..', '..', 'uploads', 'logo');
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

// Get company settings (public)
router.get('/', (req, res) => {
  try {
    const settings = queryGet('SELECT * FROM settings WHERE id = 1');
    if (settings) {
      res.json(settings);
    } else {
      res.json({ id: 1, company_name: '', logo: '' });
    }
  } catch (err) {
    res.json({ id: 1, company_name: '', logo: '' });
  }
});

// Update company settings (admin)
router.put('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { company_name } = req.body;
    const existing = queryGet('SELECT * FROM settings WHERE id = 1');

    if (existing) {
      queryRun('UPDATE settings SET company_name = ? WHERE id = 1', [company_name || existing.company_name]);
    } else {
      queryRun('INSERT INTO settings (id, company_name, logo) VALUES (1, ?, ?)', [company_name || '', '']);
    }

    const settings = queryGet('SELECT * FROM settings WHERE id = 1');
    res.json({ message: 'อัปเดตสำเร็จ', settings });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Upload logo (admin)
router.post('/logo', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { logo } = req.body; // base64 image

    if (!logo) {
      return res.status(400).json({ error: 'กรุณาเลือกรูปโลโก้' });
    }

    // Remove old logo file
    const existing = queryGet('SELECT logo FROM settings WHERE id = 1');
    if (existing && existing.logo) {
      const oldPath = path.join(logoDir, existing.logo);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new logo
    const matches = logo.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'รูปภาพไม่ถูกต้อง' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `company_logo_${Date.now()}.${ext}`;
    const filePath = path.join(logoDir, filename);

    fs.writeFileSync(filePath, buffer);

    // Update database
    const settingsExist = queryGet('SELECT * FROM settings WHERE id = 1');
    if (settingsExist) {
      queryRun('UPDATE settings SET logo = ? WHERE id = 1', [filename]);
    } else {
      queryRun('INSERT INTO settings (id, company_name, logo) VALUES (1, ?, ?)', ['', filename]);
    }

    res.json({ message: 'อัปโหลดโลโก้สำเร็จ', logo: filename });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Delete logo (admin)
router.delete('/logo', authenticateToken, requireAdmin, (req, res) => {
  try {
    const existing = queryGet('SELECT logo FROM settings WHERE id = 1');
    if (existing && existing.logo) {
      const filePath = path.join(logoDir, existing.logo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      queryRun('UPDATE settings SET logo = ? WHERE id = 1', ['']);
    }

    res.json({ message: 'ลบโลโก้สำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Serve logo image
router.get('/logo/:filename', (req, res) => {
  const filePath = path.join(logoDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'ไม่พบโลโก้' });
  }
});

// ===== Leave Quotas Management =====

// Get all leave quotas (public)
router.get('/leave-quotas', (req, res) => {
  try {
    const quotas = queryAll('SELECT * FROM leave_quotas ORDER BY id');
    res.json(quotas);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Update leave quota (admin)
router.put('/leave-quotas/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { leave_name, max_days, enabled } = req.body;
    const quota = queryGet('SELECT * FROM leave_quotas WHERE id = ?', [parseInt(req.params.id)]);
    if (!quota) {
      return res.status(404).json({ error: 'ไม่พบประเภทการลา' });
    }

    queryRun(
      'UPDATE leave_quotas SET leave_name = ?, max_days = ?, enabled = ? WHERE id = ?',
      [leave_name || quota.leave_name, max_days !== undefined ? max_days : quota.max_days, enabled !== undefined ? (enabled ? 1 : 0) : quota.enabled, parseInt(req.params.id)]
    );

    const updated = queryGet('SELECT * FROM leave_quotas WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'อัปเดตสำเร็จ', quota: updated });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Add new leave type (admin)
router.post('/leave-quotas', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { leave_type, leave_name, max_days } = req.body;
    if (!leave_type || !leave_name || max_days === undefined) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    const existing = queryGet('SELECT * FROM leave_quotas WHERE leave_type = ?', [leave_type]);
    if (existing) {
      return res.status(400).json({ error: 'ประเภทการลานี้มีอยู่แล้ว' });
    }

    const result = queryRun(
      'INSERT INTO leave_quotas (leave_type, leave_name, max_days, enabled) VALUES (?, ?, ?, 1)',
      [leave_type, leave_name, max_days]
    );

    const quota = queryGet('SELECT * FROM leave_quotas WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'เพิ่มประเภทการลาสำเร็จ', quota });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Delete leave type (admin)
router.delete('/leave-quotas/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    queryRun('DELETE FROM leave_quotas WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'ลบประเภทการลาสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

module.exports = router;
