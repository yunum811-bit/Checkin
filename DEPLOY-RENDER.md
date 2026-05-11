# 🚀 ขั้นตอน Deploy ระบบเช็คอินขึ้น Render.com (ฟรี)

## สิ่งที่ต้องมี
- บัญชี GitHub (สมัครฟรีที่ https://github.com)
- บัญชี Render (สมัครฟรีที่ https://render.com)
- Git ติดตั้งบนเครื่อง (ดาวน์โหลดที่ https://git-scm.com)

---

## ขั้นตอนที่ 1: สร้าง GitHub Repository

### 1.1 สร้าง Repository บน GitHub
1. เปิด https://github.com/new
2. ตั้งชื่อ Repository: `checkin-system`
3. เลือก **Public** (หรือ Private ก็ได้)
4. **อย่าติ๊ก** Add README, .gitignore, license
5. กด **Create repository**
6. จะเห็นหน้าที่มีคำสั่ง git — เก็บ URL ไว้ เช่น:
   `https://github.com/YOUR_USERNAME/checkin-system.git`

### 1.2 Push โค้ดขึ้น GitHub
เปิด Terminal (Command Prompt / PowerShell) แล้วรัน:

```bash
cd D:\KiroProject\Checkin-out

git init
git add .
git commit -m "Initial commit - Check-in system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/checkin-system.git
git push -u origin main
```

> ⚠️ เปลี่ยน `YOUR_USERNAME` เป็น username GitHub ของคุณ

ถ้าถูกถามรหัสผ่าน:
- ใช้ **Personal Access Token** แทนรหัสผ่าน
- สร้างได้ที่: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- ติ๊ก scope: `repo`

### 1.3 ตรวจสอบ
เปิด `https://github.com/YOUR_USERNAME/checkin-system` ใน browser
ต้องเห็นไฟล์โปรเจคทั้งหมด

---

## ขั้นตอนที่ 2: สมัคร Render.com

1. เปิด https://render.com
2. กด **Get Started for Free**
3. เลือก **Sign up with GitHub**
4. อนุญาตให้ Render เข้าถึง GitHub
5. ยืนยันอีเมล (ถ้ามี)

---

## ขั้นตอนที่ 3: สร้าง Web Service บน Render

### 3.1 สร้าง Service ใหม่
1. ที่ Dashboard กด **"New +"** → เลือก **"Web Service"**
2. เลือก **"Build and deploy from a Git repository"** → กด Next
3. เชื่อม GitHub:
   - กด **"Connect GitHub"** (ถ้ายังไม่ได้เชื่อม)
   - ค้นหา repo `checkin-system`
   - กด **"Connect"**

### 3.2 ตั้งค่า Service
กรอกข้อมูลดังนี้:

| ช่อง | ค่า |
|------|-----|
| **Name** | `checkin-system` |
| **Region** | Singapore (เลือกที่ใกล้ไทยที่สุด) |
| **Branch** | `main` |
| **Runtime** | `Docker` |
| **Instance Type** | `Free` |

> เลือก Runtime เป็น **Docker** เพราะเรามี Dockerfile อยู่แล้ว

### 3.3 เพิ่ม Environment Variables
เลื่อนลงหาส่วน **"Environment Variables"** กด **"Add Environment Variable"**:

| Key | Value |
|-----|-------|
| `PORT` | `3001` |
| `JWT_SECRET` | `my-checkin-secret-2024-render` |
| `NODE_ENV` | `production` |

> ⚠️ เปลี่ยน JWT_SECRET เป็นค่าที่ยาวและคาดเดาไม่ได้

### 3.4 Deploy
กด **"Create Web Service"**

Render จะเริ่ม:
1. Clone โค้ดจาก GitHub
2. Build ด้วย Dockerfile
3. รัน server

**ใช้เวลาประมาณ 3-5 นาที** ครั้งแรก

---

## ขั้นตอนที่ 4: รอ Deploy เสร็จ

1. จะเห็นหน้า Logs แสดงขั้นตอน build
2. รอจนเห็นข้อความ:
   ```
   ==> Your service is live 🎉
   ```
3. ที่ด้านบนจะมี URL เช่น:
   ```
   https://checkin-system.onrender.com
   ```

---

## ขั้นตอนที่ 5: ทดสอบ

1. เปิด URL ที่ได้ใน browser
2. จะเห็นหน้า Login
3. Login ด้วย:
   - Email: `admin@company.com`
   - Password: `admin123`
4. ทดสอบเช็คอิน, ลางาน, ดูประวัติ

---

## ขั้นตอนที่ 6: ใช้งานบนมือถือ

1. เปิด Chrome/Safari บนมือถือ
2. พิมพ์ URL: `https://checkin-system.onrender.com`
3. Login ตามปกติ
4. **ติดตั้งเป็นแอป:**
   - **Android (Chrome):** กดจุด 3 จุด (⋮) → "ติดตั้งแอป"
   - **iPhone (Safari):** กดปุ่มแชร์ (□↑) → "เพิ่มไปยังหน้าจอหลัก"
5. จะมีไอคอนแอปบนหน้าจอ ใช้งานได้เหมือนแอปปกติ

---

## 📋 สรุปขั้นตอนทั้งหมด

```
1. สร้าง GitHub repo
2. Push code ขึ้น GitHub
3. สมัคร Render.com (ด้วย GitHub)
4. สร้าง Web Service → เชื่อม repo → เลือก Docker → ใส่ env vars
5. รอ deploy (3-5 นาที)
6. ได้ URL → ใช้งานได้ทันที
```

---

## ⚠️ ข้อควรรู้

### แผนฟรีของ Render:
- ✅ ฟรี ไม่ต้องใส่บัตรเครดิต
- ✅ HTTPS อัตโนมัติ (กล้องมือถือใช้ได้)
- ✅ Auto deploy เมื่อ push code ใหม่
- ⚠️ Sleep หลังไม่มีคนใช้ 15 นาที (เปิดครั้งแรกรอ ~30 วินาที)
- ⚠️ 750 ชม./เดือน (เพียงพอสำหรับใช้งานปกติ)
- ⚠️ ข้อมูลใน SQLite จะหายเมื่อ redeploy (ถ้าต้องการเก็บถาวร ต้องใช้ PostgreSQL)

### ถ้าต้องการข้อมูลไม่หาย:
เพิ่ม Render PostgreSQL (ฟรี 90 วัน) แล้วเปลี่ยน database
หรือใช้แผน Starter ($7/เดือน) ที่มี persistent disk

### การอัปเดตระบบ:
ทุกครั้งที่แก้โค้ดแล้ว push ขึ้น GitHub:
```bash
git add .
git commit -m "อัปเดต: เพิ่มฟีเจอร์ใหม่"
git push
```
Render จะ auto deploy ให้อัตโนมัติ (ใช้เวลา 2-3 นาที)

---

## 🔧 แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|--------|---------|
| Build failed | ดู Logs ใน Render → แก้ไข → push ใหม่ |
| หน้าเว็บขาว | ตรวจสอบว่า frontend build สำเร็จใน Dockerfile |
| Login ไม่ได้ | ตรวจสอบ Environment Variables (PORT, JWT_SECRET) |
| กล้องไม่ทำงาน | Render ให้ HTTPS อัตโนมัติ กล้องควรทำงานได้ |
| ข้อมูลหาย | ปกติของแผนฟรี (SQLite อยู่ใน container) |
| เว็บช้าตอนเปิด | ปกติของแผนฟรี (server sleep แล้วตื่น) |
