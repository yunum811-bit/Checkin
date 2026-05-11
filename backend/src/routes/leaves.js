const express = require('express');
const { queryGet, queryAll, queryRun } = require('../database');
const { authenticateToken, requireManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Approval level hierarchy (unlimited levels):
// ไล่ตาม manager_id ขึ้นไปเรื่อยๆ จนถึง Admin
// เช่น: Employee → Supervisor → Manager → Director → MD → Admin
// ระบบจะสร้าง chain อัตโนมัติตามโครงสร้างองค์กรที่กำหนดไว้

function getApprovalChain(userId) {
  const user = queryGet('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return [];

  const chain = [];
  const addedIds = new Set();
  addedIds.add(userId); // Don't add self

  // Walk up the manager chain
  let currentId = user.manager_id;
  const maxLevels = 10; // Safety limit to prevent infinite loops

  while (currentId && chain.length < maxLevels) {
    if (addedIds.has(currentId)) break; // Prevent circular reference

    const superior = queryGet('SELECT id, name, role FROM users WHERE id = ?', [currentId]);
    if (!superior) break;

    chain.push({
      level: chain.length + 1,
      approver_id: superior.id,
      approver_name: superior.name,
      role: superior.role
    });
    addedIds.add(superior.id);

    // If we reached admin, stop here
    if (superior.role === 'admin') break;

    // Move up to next manager
    const superiorFull = queryGet('SELECT manager_id FROM users WHERE id = ?', [superior.id]);
    currentId = superiorFull?.manager_id || null;
  }

  // If chain doesn't end with admin, add admin as final approver
  const lastInChain = chain[chain.length - 1];
  if (!lastInChain || lastInChain.role !== 'admin') {
    const admin = queryGet("SELECT id, name, role FROM users WHERE role = 'admin' AND id != ?", [userId]);
    if (admin && !addedIds.has(admin.id)) {
      chain.push({
        level: chain.length + 1,
        approver_id: admin.id,
        approver_name: admin.name,
        role: 'admin'
      });
    }
  }

  // If no chain at all, fallback to any admin
  if (chain.length === 0) {
    const anyAdmin = queryGet("SELECT id, name, role FROM users WHERE role = 'admin'");
    if (anyAdmin) {
      chain.push({ level: 1, approver_id: anyAdmin.id, approver_name: anyAdmin.name, role: 'admin' });
    }
  }

  return chain;
}

// Get leave types
router.get('/types', authenticateToken, (req, res) => {
  res.json([
    { id: 'sick', name: 'ลาป่วย', max_days: 30 },
    { id: 'personal', name: 'ลากิจ', max_days: 5 },
    { id: 'vacation', name: 'ลาพักร้อน', max_days: 10 },
    { id: 'maternity', name: 'ลาคลอด', max_days: 90 },
    { id: 'other', name: 'อื่นๆ', max_days: 5 }
  ]);
});

// Submit leave request
router.post('/', authenticateToken, (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;

    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    // Check for overlapping leave requests
    const overlap = queryGet(`
      SELECT * FROM leaves 
      WHERE user_id = ? AND status != 'rejected'
      AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))
    `, [req.user.id, end_date, start_date, start_date, start_date]);

    if (overlap) {
      return res.status(400).json({ error: 'มีการลาที่ซ้อนทับกับวันที่เลือก' });
    }

    // Get approval chain for this user
    const chain = getApprovalChain(req.user.id);
    if (chain.length === 0) {
      return res.status(400).json({ error: 'ไม่พบผู้อนุมัติในระบบ กรุณาติดต่อ Admin' });
    }

    const maxLevel = chain.length;

    // Create leave request
    const result = queryRun(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status, current_level, max_level) VALUES (?, ?, ?, ?, ?, 'pending_level_1', 1, ?)`,
      [req.user.id, leave_type, start_date, end_date, reason || '', maxLevel]
    );

    const leaveId = result.lastInsertRowid;

    // Create approval records for each level
    for (const step of chain) {
      queryRun(
        `INSERT INTO leave_approvals (leave_id, approver_id, level, status) VALUES (?, ?, ?, ?)`,
        [leaveId, step.approver_id, step.level, step.level === 1 ? 'pending' : 'waiting']
      );
    }

    const leave = queryGet('SELECT * FROM leaves WHERE id = ?', [leaveId]);
    const approvals = queryAll('SELECT la.*, u.name as approver_name FROM leave_approvals la JOIN users u ON la.approver_id = u.id WHERE la.leave_id = ? ORDER BY la.level', [leaveId]);

    res.status(201).json({ 
      message: 'ส่งคำขอลาสำเร็จ', 
      leave,
      approvals,
      approval_chain: chain
    });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get my leave requests (with approval details)
router.get('/my', authenticateToken, (req, res) => {
  try {
    const leaves = queryAll(`
      SELECT l.*
      FROM leaves l
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `, [req.user.id]);

    // Attach approval details to each leave
    const result = leaves.map(leave => {
      const approvals = queryAll(`
        SELECT la.*, u.name as approver_name, u.role as approver_role, u.position as approver_position
        FROM leave_approvals la
        JOIN users u ON la.approver_id = u.id
        WHERE la.leave_id = ?
        ORDER BY la.level
      `, [leave.id]);
      return { ...leave, approvals };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get pending approvals for current user (manager/admin)
router.get('/pending-approvals', authenticateToken, requireManagerOrAdmin, (req, res) => {
  try {
    const approvals = queryAll(`
      SELECT la.*, l.leave_type, l.start_date, l.end_date, l.reason, l.current_level, l.max_level,
             u.name, u.employee_id, u.department, u.position as requester_position
      FROM leave_approvals la
      JOIN leaves l ON la.leave_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE la.approver_id = ? AND la.status = 'pending'
      ORDER BY la.created_at DESC
    `, [req.user.id]);

    // Attach full approval chain for each leave
    const result = approvals.map(approval => {
      const allApprovals = queryAll(`
        SELECT la.*, u.name as approver_name, u.role as approver_role, u.position as approver_position
        FROM leave_approvals la
        JOIN users u ON la.approver_id = u.id
        WHERE la.leave_id = ?
        ORDER BY la.level
      `, [approval.leave_id]);
      return { ...approval, all_approvals: allApprovals };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Approve/Reject at current level
router.put('/:id/approve', authenticateToken, requireManagerOrAdmin, (req, res) => {
  try {
    const { status, comment } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    }

    const leaveId = parseInt(req.params.id);
    const leave = queryGet('SELECT * FROM leaves WHERE id = ?', [leaveId]);
    if (!leave) {
      return res.status(404).json({ error: 'ไม่พบคำขอลา' });
    }

    // Find the pending approval for this approver
    const approval = queryGet(
      `SELECT * FROM leave_approvals WHERE leave_id = ? AND approver_id = ? AND status = 'pending'`,
      [leaveId, req.user.id]
    );

    if (!approval) {
      // Admin can override and approve/reject any pending leave
      if (req.user.role === 'admin') {
        const anyPending = queryGet(
          `SELECT * FROM leave_approvals WHERE leave_id = ? AND status IN ('pending', 'waiting')`,
          [leaveId]
        );
        if (!anyPending) {
          return res.status(400).json({ error: 'คำขอนี้ได้รับการดำเนินการแล้ว' });
        }

        // Admin overrides: approve/reject all remaining levels
        if (status === 'rejected') {
          queryRun(
            `UPDATE leave_approvals SET status = 'rejected', comment = ?, acted_at = datetime('now') WHERE leave_id = ? AND status IN ('pending', 'waiting')`,
            [comment || 'Admin ปฏิเสธ', leaveId]
          );
          queryRun(
            `UPDATE leaves SET status = 'rejected' WHERE id = ?`,
            [leaveId]
          );
        } else {
          queryRun(
            `UPDATE leave_approvals SET status = 'approved', comment = ?, acted_at = datetime('now') WHERE leave_id = ? AND status IN ('pending', 'waiting')`,
            [comment || 'Admin อนุมัติ', leaveId]
          );
          queryRun(
            `UPDATE leaves SET status = 'approved', current_level = max_level WHERE id = ?`,
            [leaveId]
          );
        }

        const updated = queryGet('SELECT * FROM leaves WHERE id = ?', [leaveId]);
        const approvals = queryAll(`
          SELECT la.*, u.name as approver_name FROM leave_approvals la 
          JOIN users u ON la.approver_id = u.id WHERE la.leave_id = ? ORDER BY la.level
        `, [leaveId]);

        return res.json({
          message: status === 'approved' ? 'อนุมัติสำเร็จ (Admin Override)' : 'ปฏิเสธสำเร็จ',
          leave: updated,
          approvals
        });
      }

      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์อนุมัติคำขอนี้ หรือยังไม่ถึงลำดับของคุณ' });
    }

    // Process the approval
    if (status === 'rejected') {
      // Rejected: mark this level as rejected, mark all subsequent as skipped, reject the leave
      queryRun(
        `UPDATE leave_approvals SET status = 'rejected', comment = ?, acted_at = datetime('now') WHERE id = ?`,
        [comment || '', approval.id]
      );
      queryRun(
        `UPDATE leave_approvals SET status = 'skipped' WHERE leave_id = ? AND level > ?`,
        [leaveId, approval.level]
      );
      queryRun(
        `UPDATE leaves SET status = 'rejected' WHERE id = ?`,
        [leaveId]
      );

      const updated = queryGet('SELECT * FROM leaves WHERE id = ?', [leaveId]);
      const approvals = queryAll(`
        SELECT la.*, u.name as approver_name FROM leave_approvals la 
        JOIN users u ON la.approver_id = u.id WHERE la.leave_id = ? ORDER BY la.level
      `, [leaveId]);

      return res.json({ message: 'ปฏิเสธคำขอลาสำเร็จ', leave: updated, approvals });
    }

    // Approved at this level
    queryRun(
      `UPDATE leave_approvals SET status = 'approved', comment = ?, acted_at = datetime('now') WHERE id = ?`,
      [comment || '', approval.id]
    );

    // Check if there's a next level
    const nextLevel = queryGet(
      `SELECT * FROM leave_approvals WHERE leave_id = ? AND level = ?`,
      [leaveId, approval.level + 1]
    );

    if (nextLevel) {
      // Move to next level
      queryRun(
        `UPDATE leave_approvals SET status = 'pending' WHERE id = ?`,
        [nextLevel.id]
      );
      queryRun(
        `UPDATE leaves SET current_level = ?, status = ? WHERE id = ?`,
        [approval.level + 1, `pending_level_${approval.level + 1}`, leaveId]
      );
    } else {
      // All levels approved - final approval
      queryRun(
        `UPDATE leaves SET status = 'approved', current_level = ? WHERE id = ?`,
        [approval.level, leaveId]
      );
    }

    const updated = queryGet('SELECT * FROM leaves WHERE id = ?', [leaveId]);
    const approvals = queryAll(`
      SELECT la.*, u.name as approver_name FROM leave_approvals la 
      JOIN users u ON la.approver_id = u.id WHERE la.leave_id = ? ORDER BY la.level
    `, [leaveId]);

    const isFullyApproved = updated.status === 'approved';
    res.json({
      message: isFullyApproved ? 'อนุมัติสำเร็จ (ครบทุกลำดับ)' : `อนุมัติลำดับที่ ${approval.level} สำเร็จ รอลำดับถัดไป`,
      leave: updated,
      approvals
    });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get all leave requests (admin) - with approval chain
router.get('/all', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'md') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const { status } = req.query;
    let sql = `
      SELECT l.*, u.name, u.employee_id, u.department
      FROM leaves l
      JOIN users u ON l.user_id = u.id
    `;
    const params = [];

    if (status) {
      if (status === 'pending') {
        sql += " WHERE l.status LIKE 'pending%'";
      } else {
        sql += ' WHERE l.status = ?';
        params.push(status);
      }
    }

    sql += ' ORDER BY l.created_at DESC';
    const leaves = queryAll(sql, params);

    // Attach approvals
    const result = leaves.map(leave => {
      const approvals = queryAll(`
        SELECT la.*, u.name as approver_name, u.role as approver_role, u.position as approver_position
        FROM leave_approvals la
        JOIN users u ON la.approver_id = u.id
        WHERE la.leave_id = ?
        ORDER BY la.level
      `, [leave.id]);
      return { ...leave, approvals };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Cancel leave request
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const leave = queryGet('SELECT * FROM leaves WHERE id = ? AND user_id = ?', [parseInt(req.params.id), req.user.id]);
    if (!leave) {
      return res.status(404).json({ error: 'ไม่พบคำขอลา' });
    }
    if (leave.status === 'approved' || leave.status === 'rejected') {
      return res.status(400).json({ error: 'ไม่สามารถยกเลิกคำขอที่ดำเนินการเสร็จแล้ว' });
    }

    queryRun('DELETE FROM leave_approvals WHERE leave_id = ?', [parseInt(req.params.id)]);
    queryRun('DELETE FROM leaves WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'ยกเลิกคำขอลาสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get leave balance
router.get('/balance', authenticateToken, (req, res) => {
  try {
    const year = new Date().getFullYear();
    const datePattern = `${year}%`;

    const leaveTypes = [
      { id: 'sick', name: 'ลาป่วย', max_days: 30 },
      { id: 'personal', name: 'ลากิจ', max_days: 5 },
      { id: 'vacation', name: 'ลาพักร้อน', max_days: 10 },
      { id: 'maternity', name: 'ลาคลอด', max_days: 90 },
      { id: 'other', name: 'อื่นๆ', max_days: 5 }
    ];

    const balance = leaveTypes.map(type => {
      const used = queryGet(`
        SELECT COALESCE(SUM(
          CAST(julianday(end_date) - julianday(start_date) + 1 AS INTEGER)
        ), 0) as days
        FROM leaves 
        WHERE user_id = ? AND leave_type = ? AND status = 'approved' AND start_date LIKE ?
      `, [req.user.id, type.id, datePattern]);

      return {
        ...type,
        used_days: used?.days || 0,
        remaining_days: type.max_days - (used?.days || 0)
      };
    });

    res.json(balance);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Get approval chain for current user (preview)
router.get('/my-chain', authenticateToken, (req, res) => {
  try {
    const chain = getApprovalChain(req.user.id);
    res.json(chain);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

module.exports = router;
