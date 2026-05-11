# ระบบเช็คอิน-เช็คเอาท์ และลางาน

ระบบจัดการเวลาเข้า-ออกงาน และการลางานของพนักงาน รองรับการใช้งานบนมือถือ (PWA)  
พร้อมระบบอนุมัติแบบลำดับขั้น (Hierarchical Approval)

## ✨ Features

- ✅ เช็คอิน / เช็คเอาท์ พร้อมบันทึก GPS
- 📊 Dashboard สรุปข้อมูลรายเดือน
- 📅 ระบบลางาน (ลาป่วย, ลากิจ, ลาพักร้อน, ลาคลอด)
- 🔗 **อนุมัติแบบลำดับขั้น** (Employee → Manager → Admin)
- 👤 จัดการโปรไฟล์ / เปลี่ยนรหัสผ่าน
- 🔐 ระบบ Admin จัดการพนักงาน กำหนดหัวหน้า
- 📱 รองรับมือถือ (PWA - ติดตั้งเป็นแอปได้)
- 🕐 ตรวจจับการมาสาย (หลัง 09:00)

## 🔗 ระบบอนุมัติลำดับขั้น (Hierarchical Approval)

### Flow การอนุมัติ:

```
พนักงานส่งคำขอลา
       ↓
  ลำดับที่ 1: หัวหน้าโดยตรง (Manager) อนุมัติ
       ↓
  ลำดับที่ 2: Admin อนุมัติ (Final)
       ↓
  ✅ อนุมัติสำเร็จ
```

### กฎการอนุมัติ:
- **ลำดับขั้น**: คำขอต้องผ่านการอนุมัติตามลำดับ (Manager → Admin)
- **ปฏิเสธ**: ถ้าลำดับใดปฏิเสธ คำขอจะถูกปฏิเสธทันที ไม่ส่งต่อ
- **Admin Override**: Admin สามารถอนุมัติ/ปฏิเสธได้ทุกขั้นตอน
- **ไม่มีหัวหน้า**: ถ้าพนักงานไม่มี Manager จะส่งตรงไป Admin
- **ดูสถานะ**: พนักงานเห็นลำดับการอนุมัติแบบ real-time

### Roles:
| Role | สิทธิ์ |
|------|--------|
| Employee | เช็คอิน/เอาท์, ขอลา, ดูประวัติ |
| Manager | ทุกอย่างของ Employee + อนุมัติลูกน้อง |
| Admin | ทุกอย่าง + จัดการพนักงาน + Override อนุมัติ |

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite (PWA)
- **Backend**: Node.js + Express
- **Database**: SQLite via sql.js (ไม่ต้องติดตั้งแยก)
- **Auth**: JWT Token

## 🚀 วิธีติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies

```bash
# ติดตั้ง Backend
cd backend
npm install

# ติดตั้ง Frontend
cd ../frontend
npm install
```

### 2. รัน Backend Server

```bash
cd backend
npm run dev
```

Server จะรันที่ http://localhost:3001

### 3. รัน Frontend (Development)

```bash
cd frontend
npm run dev
```

Frontend จะรันที่ http://localhost:5173

### 4. Build สำหรับ Production

```bash
cd frontend
npm run build
```

จากนั้นรัน Backend อย่างเดียว ระบบจะ serve frontend จาก `frontend/dist`

## 👤 บัญชีทดสอบ

| Role | ชื่อ | Email | Password |
|------|------|-------|----------|
| Admin | Admin | admin@company.com | admin123 |
| Manager | วิชัย หัวหน้า | wichai@company.com | manager123 |
| Manager | สุดา ผู้จัดการ | suda@company.com | manager123 |
| Employee | สมชาย ใจดี | somchai@company.com | password123 |
| Employee | สมหญิง รักงาน | somying@company.com | password123 |

### ความสัมพันธ์:
- สมชาย → หัวหน้า: วิชัย → Admin
- สมหญิง → หัวหน้า: สุดา → Admin

## 📱 ใช้งานบนมือถือ

1. เปิด browser บนมือถือ
2. เข้า URL ของระบบ
3. กด "Add to Home Screen" / "เพิ่มไปยังหน้าจอหลัก"
4. ใช้งานเหมือนแอปปกติ

## 📁 โครงสร้างโปรเจค

```
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server
│   │   ├── database.js           # SQLite setup + helpers
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT + role middleware
│   │   └── routes/
│   │       ├── auth.js           # Login/Profile
│   │       ├── attendance.js     # Check-in/out
│   │       ├── leaves.js         # Leave + Hierarchical Approval
│   │       └── users.js          # User management
│   └── data/                     # SQLite database (auto-created)
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main app with routing
│   │   ├── api.ts                # Axios instance
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── components/
│   │   │   ├── BottomNav.tsx     # Navigation (shows Approve for manager/admin)
│   │   │   └── Toast.tsx
│   │   └── pages/
│   │       ├── Login.tsx
│   │       ├── Home.tsx          # Check-in/out + Dashboard
│   │       ├── History.tsx       # Attendance history
│   │       ├── Leave.tsx         # Leave requests + approval chain view
│   │       ├── Approvals.tsx     # Manager/Admin approval page
│   │       ├── Profile.tsx       # User profile
│   │       └── Admin.tsx         # Admin: users + all leaves
│   └── public/
└── README.md
```

## 🔧 การตั้งค่าลำดับการอนุมัติ

ใน Admin Panel สามารถ:
1. กำหนด **หัวหน้าโดยตรง** (manager_id) ให้แต่ละพนักงาน
2. กำหนด **บทบาท** (employee / manager / admin)
3. ระบบจะสร้าง approval chain อัตโนมัติตามลำดับ:
   - หัวหน้าโดยตรง (ถ้ามี) → Admin
