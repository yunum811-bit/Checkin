const express = require('express');
const path = require('path');
const fs = require('fs');
const { queryGet, queryRun } = require('../database');
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

module.exports = router;
