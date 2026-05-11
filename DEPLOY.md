# 🚀 วิธี Deploy ระบบเช็คอิน

## ทางเลือกที่ 1: Railway (ฟรี, ง่ายสุด)

### ขั้นตอน:

1. **สร้าง GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/checkin-app.git
   git push -u origin main
   ```

2. **สมัคร Railway**
   - ไปที่ https://railway.app
   - สมัครด้วย GitHub account

3. **สร้าง Project**
   - กด "New Project" → "Deploy from GitHub repo"
   - เลือก repo ที่ push ไว้
   - Railway จะ build และ deploy อัตโนมัติ

4. **ตั้งค่า**
   - ไปที่ Settings → Networking → Generate Domain
   - จะได้ URL เช่น `https://checkin-app-production.up.railway.app`

5. **เสร็จ!** เปิด URL นั้นจากมือถือได้เลย

---

## ทางเลือกที่ 2: Render (ฟรี)

1. ไปที่ https://render.com
2. สร้าง "Web Service" → เชื่อม GitHub
3. ตั้งค่า:
   - Build Command: `cd frontend && npm install && npm run build && cd ../backend && npm install`
   - Start Command: `node backend/src/index.js`
4. Deploy อัตโนมัติ

---

## ทางเลือกที่ 3: VPS (DigitalOcean / Vultr / AWS)

### ขั้นตอน:

1. **เช่า VPS** (Ubuntu 22.04, ราคา ~$5/เดือน)

2. **ติดตั้ง Node.js บน server**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **Upload โค้ด**
   ```bash
   git clone https://github.com/YOUR_USERNAME/checkin-app.git
   cd checkin-app
   ```

4. **Deploy**
   ```bash
   bash deploy.sh
   ```

5. **ตั้ง Nginx (reverse proxy + SSL)**
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx

   # สร้าง config
   sudo nano /etc/nginx/sites-available/checkin
   ```

   ใส่:
   ```nginx
   server {
       listen 80;
       server_name checkin.yourdomain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/checkin /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx

   # ติดตั้ง SSL (HTTPS) ฟรี
   sudo certbot --nginx -d checkin.yourdomain.com
   ```

6. **เสร็จ!** เข้าได้ที่ `https://checkin.yourdomain.com`

---

## ทางเลือกที่ 4: Docker

```bash
docker build -t checkin-app .
docker run -d -p 3001:3001 --name checkin checkin-app
```

---

## 📱 หลัง Deploy แล้ว

1. เปิด URL จาก browser บนมือถือ
2. กด "Add to Home Screen" / "ติดตั้งแอป"
3. ใช้งานได้จากทุกที่ที่มี internet!

## ⚠️ สิ่งที่ควรทำก่อน Production

- เปลี่ยน JWT_SECRET ใน environment variable
- ตั้ง HTTPS (SSL) เพื่อความปลอดภัย
- เปลี่ยนรหัสผ่าน admin เริ่มต้น
- Backup database เป็นประจำ
