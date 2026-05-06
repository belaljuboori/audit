# 🏦 نظام التدقيق المصرفي
## Bank Audit Management System

---

## 📦 المتطلبات
- Node.js v18 أو أحدث
- MySQL 5.7 أو أحدث (اختياري - يعمل بدونه مؤقتاً)
- npm

---

## 🚀 خطوات التشغيل المحلي

### 1. تثبيت المكتبات
```bash
cd audit-app
npm install
```

### 2. إعداد قاعدة البيانات (اختياري)
افتح MySQL وشغّل:
```sql
CREATE DATABASE bank_audit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. تعديل إعدادات قاعدة البيانات
افتح ملف `server.js` وعدّل:
```javascript
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'كلمة_المرور_هنا',
  database: 'bank_audit',
  port: 3306,
};
```

### 4. تشغيل التطبيق
```bash
npm start
```
ثم افتح: http://localhost:3000

---

## 🌐 رفع التطبيق على الإنترنت

### الخيار الأول: Railway (مجاني وسهل) ✅ موصى به
1. سجّل على https://railway.app
2. أنشئ مشروع جديد من GitHub
3. أضف MySQL database من نفس المشروع
4. Railway يضيف متغيرات البيئة تلقائياً

### الخيار الثاني: Render
1. سجّل على https://render.com
2. New → Web Service → ارفع الملفات
3. أضف PostgreSQL أو MySQL

### الخيار الثالث: VPS (DigitalOcean / Linode)
```bash
# على السيرفر
git clone [رابط مشروعك]
cd audit-app
npm install
# استخدم PM2 للتشغيل المستمر
npm install -g pm2
pm2 start server.js --name audit-app
pm2 startup
pm2 save
```

---

## 🔒 الأمان (مهم للبيئة المصرفية)
- أضف HTTPS (SSL) عبر Let's Encrypt أو Cloudflare
- فعّل كلمة مرور للوصول إذا احتجت
- لا ترفع ملف `.env` على GitHub

---

## 📋 متغيرات البيئة
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=كلمة_المرور
DB_NAME=bank_audit
DB_PORT=3306
PORT=3000
```

---

## 📊 هيكل قاعدة البيانات
```sql
CREATE TABLE audit_records (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(255) NOT NULL,
  branch_dept VARCHAR(255) NOT NULL,
  floor       VARCHAR(100) NOT NULL,
  ip_address  VARCHAR(45)  NOT NULL,
  domain_user VARCHAR(255) NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📱 الاستخدام من الموبايل
بعد رفع التطبيق، افتح الرابط من متصفح الموبايل.
التطبيق مصمم بالكامل للموبايل (Mobile-First).
