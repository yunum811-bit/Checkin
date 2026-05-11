const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'checkin.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      department TEXT DEFAULT '',
      role TEXT DEFAULT 'employee',
      manager_id INTEGER,
      position TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      check_in_time TEXT,
      check_out_time TEXT,
      check_in_location TEXT DEFAULT '',
      check_out_location TEXT DEFAULT '',
      check_in_photo TEXT DEFAULT '',
      check_out_photo TEXT DEFAULT '',
      status TEXT DEFAULT 'present',
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      current_level INTEGER DEFAULT 1,
      max_level INTEGER DEFAULT 2,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leave_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      leave_id INTEGER NOT NULL,
      approver_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      comment TEXT DEFAULT '',
      acted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (leave_id) REFERENCES leaves(id),
      FOREIGN KEY (approver_id) REFERENCES users(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leave_approvals_leave ON leave_approvals(leave_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leave_approvals_approver ON leave_approvals(approver_id, status)`);

  // Settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      company_name TEXT DEFAULT '',
      logo TEXT DEFAULT ''
    )
  `);

  // Announcements table
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      pinned INTEGER DEFAULT 0,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  // Seed default users if not exists
  const adminResult = db.exec("SELECT id FROM users WHERE role = 'admin'");
  if (adminResult.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(
      `INSERT INTO users (employee_id, name, email, password, department, role, position) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['EMP001', 'Admin', 'admin@company.com', hashedPassword, 'IT', 'admin', 'ผู้ดูแลระบบ']
    );

    const gmPassword = bcrypt.hashSync('md123', 10);
    db.run(
      `INSERT INTO users (employee_id, name, email, password, department, role, position) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['EMP002', 'ประสิทธิ์ ผู้บริหาร', 'prasit@company.com', gmPassword, 'Management', 'md', 'Managing Director']
    );

    const mgrPassword = bcrypt.hashSync('manager123', 10);
    db.run(
      `INSERT INTO users (employee_id, name, email, password, department, role, manager_id, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['EMP003', 'วิชัย หัวหน้า', 'wichai@company.com', mgrPassword, 'Engineering', 'manager', 2, 'หัวหน้าแผนก']
    );

    db.run(
      `INSERT INTO users (employee_id, name, email, password, department, role, manager_id, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['EMP004', 'สุดา ผู้จัดการ', 'suda@company.com', mgrPassword, 'HR', 'manager', 2, 'ผู้จัดการฝ่าย']
    );

    const empPassword = bcrypt.hashSync('password123', 10);
    // Employees under manager EMP003 (id=3)
    db.run(
      `INSERT INTO users (employee_id, name, email, password, department, role, manager_id, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['EMP005', 'สมชาย ใจดี', 'somchai@company.com', empPassword, 'Engineering', 'employee', 3, 'วิศวกร']
    );
    db.run(
      `INSERT INTO users (employee_id, name, email, password, department, role, manager_id, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['EMP006', 'สมหญิง รักงาน', 'somying@company.com', empPassword, 'HR', 'employee', 4, 'เจ้าหน้าที่ HR']
    );
  }

  saveDatabase();
  console.log('✅ Database initialized');
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getDb() {
  return db;
}

function queryGet(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryRun(sql, params = []) {
  db.run(sql, params);
  // Get last_insert_rowid BEFORE saving (save doesn't affect it but let's be safe)
  const stmt = db.prepare("SELECT last_insert_rowid() as id");
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  saveDatabase();
  return { lastInsertRowid: result.id || 0 };
}

module.exports = { initDatabase, getDb, queryGet, queryAll, queryRun, saveDatabase };
