const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Parser } = require('json2csv');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── إعدادات قاعدة البيانات ───────────────────────────────────────────────
// عدّل هذه القيم حسب إعدادات MySQL لديك
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'bank_audit',
  port: process.env.DB_PORT || 3306,
};

let db;

async function initDB() {
  try {
    // إنشاء الاتصال
    db = await mysql.createConnection(dbConfig);
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

    // إنشاء الجدول إذا لم يكن موجوداً
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        branch_dept VARCHAR(255) NOT NULL,
        floor VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        domain_user VARCHAR(255) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ تم إنشاء الجدول بنجاح');
  } catch (err) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    console.log('⚠️  التطبيق يعمل بدون قاعدة بيانات - سيتم تخزين البيانات مؤقتاً في الذاكرة');
    db = null;
  }
}

// تخزين مؤقت في الذاكرة كبديل عند غياب MySQL
let memoryStore = [];
let memoryIdCounter = 1;

// ─── API: إضافة سجل جديد ──────────────────────────────────────────────────
app.post('/api/records', async (req, res) => {
  const { full_name, branch_dept, floor, ip_address, domain_user, notes } = req.body;

  if (!full_name || !branch_dept || !floor || !ip_address || !domain_user) {
    return res.status(400).json({ success: false, message: 'جميع الحقول المطلوبة يجب ملؤها' });
  }

  try {
    if (db) {
      const [result] = await db.execute(
        `INSERT INTO audit_records (full_name, branch_dept, floor, ip_address, domain_user, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [full_name, branch_dept, floor, ip_address, domain_user, notes || '']
      );
      res.json({ success: true, message: 'تم حفظ البيانات بنجاح', id: result.insertId });
    } else {
      // تخزين في الذاكرة
      const record = {
        id: memoryIdCounter++,
        full_name, branch_dept, floor, ip_address, domain_user,
        notes: notes || '',
        created_at: new Date().toISOString()
      };
      memoryStore.push(record);
      res.json({ success: true, message: 'تم حفظ البيانات بنجاح (تخزين مؤقت)', id: record.id });
    }
  } catch (err) {
    console.error('خطأ في الحفظ:', err);
    res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات: ' + err.message });
  }
});

// ─── API: جلب جميع السجلات ────────────────────────────────────────────────
app.get('/api/records', async (req, res) => {
  try {
    let records;
    if (db) {
      const [rows] = await db.execute('SELECT * FROM audit_records ORDER BY created_at DESC');
      records = rows;
    } else {
      records = [...memoryStore].reverse();
    }
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
  }
});

// ─── API: حذف سجل ─────────────────────────────────────────────────────────
app.delete('/api/records/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (db) {
      await db.execute('DELETE FROM audit_records WHERE id = ?', [id]);
    } else {
      memoryStore = memoryStore.filter(r => r.id !== parseInt(id));
    }
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في الحذف' });
  }
});

// ─── API: تنزيل CSV ───────────────────────────────────────────────────────
app.get('/api/export/csv', async (req, res) => {
  try {
    let records;
    if (db) {
      const [rows] = await db.execute('SELECT * FROM audit_records ORDER BY created_at DESC');
      records = rows;
    } else {
      records = [...memoryStore].reverse();
    }

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للتصدير' });
    }

    const fields = [
      { label: 'الرقم', value: 'id' },
      { label: 'الاسم', value: 'full_name' },
      { label: 'الفرع / القسم', value: 'branch_dept' },
      { label: 'الطابق', value: 'floor' },
      { label: 'عنوان IP', value: 'ip_address' },
      { label: 'Domain User', value: 'domain_user' },
      { label: 'ملاحظات', value: 'notes' },
      { label: 'تاريخ الإدخال', value: 'created_at' },
    ];

    const parser = new Parser({ fields, withBOM: true }); // BOM لدعم العربية في Excel
    const csv = parser.parse(records);

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit_report_${date}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('خطأ في التصدير:', err);
    res.status(500).json({ success: false, message: 'خطأ في تصدير البيانات' });
  }
});

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── تشغيل الخادم ─────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على: http://localhost:${PORT}`);
  });
});
