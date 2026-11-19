const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cotrinh_secret_key_2026';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + cleanName);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname)));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '23095'),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Mail Transporter Helper
function getMailer() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập. Vui lòng đăng nhập lại.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    req.user = user;
    next();
  });
}

// File Upload Endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không tìm thấy file tải lên' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl: fileUrl,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi upload file: ' + err.message });
  }
});


// ==================== AUTH APIS ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Tên đăng nhập không tồn tại' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập: ' + err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, role, full_name, username, email, phone FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Người dùng không tồn tại' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== DASHBOARD STATS (TEACHER) ====================
app.get('/api/teacher/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });

    const [classes] = await pool.execute('SELECT COUNT(*) as count FROM classes WHERE teacher_id = ?', [req.user.id]);
    const [students] = await pool.execute(`
      SELECT COUNT(DISTINCT cm.student_id) as count 
      FROM class_members cm
      JOIN classes c ON cm.class_id = c.id
      WHERE c.teacher_id = ?
    `, [req.user.id]);
    const [assignments] = await pool.execute('SELECT COUNT(*) as count FROM assignments WHERE teacher_id = ?', [req.user.id]);
    const [ungraded] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      WHERE a.teacher_id = ? AND s.score IS NULL
    `, [req.user.id]);
    const [leads] = await pool.execute("SELECT COUNT(*) as count FROM leads WHERE status = 'new'");

    res.json({
      totalClasses: classes[0].count,
      totalStudents: students[0].count,
      totalAssignments: assignments[0].count,
      ungradedSubmissions: ungraded[0].count,
      newLeads: leads[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== CLASSES (LỚP HỌC) ====================
app.get('/api/classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const [classes] = await pool.execute(`
        SELECT c.*, 
               COUNT(DISTINCT cm.student_id) AS student_count,
               COUNT(DISTINCT a.id) AS assignment_count
        FROM classes c
        LEFT JOIN class_members cm ON c.id = cm.class_id
        LEFT JOIN assignments a ON c.id = a.class_id
        WHERE c.teacher_id = ?
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `, [req.user.id]);
      res.json({ classes });
    } else {
      const [classes] = await pool.execute(`
        SELECT c.*, u.full_name as teacher_name, u.phone as teacher_phone
        FROM classes c
        JOIN class_members cm ON c.id = cm.class_id
        JOIN users u ON c.teacher_id = u.id
        WHERE cm.student_id = ?
        ORDER BY c.created_at DESC
      `, [req.user.id]);
      res.json({ classes });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền tạo lớp' });
    const { name, subject, grade, color, description } = req.body;
    if (!name || !subject || !grade) {
      return res.status(400).json({ error: 'Vui lòng nhập tên lớp, môn học và khối lớp' });
    }

    const [result] = await pool.execute(`
      INSERT INTO classes (teacher_id, name, subject, grade, color, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, name.trim(), subject, grade, color || '#E7786B', description ? description.trim() : '']);

    res.json({ success: true, classId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/classes/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    await pool.execute('DELETE FROM classes WHERE id = ? AND teacher_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Đã xóa lớp học thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/classes/:id/students', authenticateToken, async (req, res) => {
  try {
    const classId = req.params.id;
    const [students] = await pool.execute(`
      SELECT u.id, u.full_name, u.username, u.email, u.phone, cm.joined_at
      FROM users u
      JOIN class_members cm ON u.id = cm.student_id
      WHERE cm.class_id = ?
      ORDER BY u.full_name ASC
    `, [classId]);
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes/:id/students', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền thêm học sinh' });
    const classId = req.params.id;
    const { username, full_name, email, phone, password } = req.body;

    if (!username) return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập học sinh' });

    let studentId;
    const [existing] = await pool.execute('SELECT id, role FROM users WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      studentId = existing[0].id;
    } else {
      if (!full_name || !password) {
        return res.status(400).json({ error: 'Học sinh mới cần nhập Họ tên và Mật khẩu khởi tạo' });
      }
      const hashed = await bcrypt.hash(password, 10);
      const [newUser] = await pool.execute(`
        INSERT INTO users (role, full_name, username, email, phone, password_hash)
        VALUES ('student', ?, ?, ?, ?, ?)
      `, [full_name.trim(), username.trim(), email ? email.trim() : `${username.trim()}@student.local`, phone ? phone.trim() : '', hashed]);
      studentId = newUser.insertId;
    }

    await pool.execute('INSERT IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)', [classId, studentId]);

    res.json({ success: true, message: 'Đã thêm học sinh vào lớp thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/classes/:classId/students/:studentId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    await pool.execute('DELETE FROM class_members WHERE class_id = ? AND student_id = ?', [req.params.classId, req.params.studentId]);
    res.json({ success: true, message: 'Đã xóa học sinh khỏi lớp' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== SCHEDULES (THỜI KHÓA BIỂU) ====================
app.get('/api/schedules', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const [schedules] = await pool.execute(`
        SELECT s.*, c.name as class_name, c.subject, c.grade, c.color,
               COUNT(DISTINCT cm.student_id) as student_count
        FROM schedules s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN class_members cm ON c.id = cm.class_id
        WHERE c.teacher_id = ?
        GROUP BY s.id
        ORDER BY FIELD(s.day_of_week, 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'), s.start_time ASC
      `, [req.user.id]);
      res.json({ schedules });
    } else {
      const [schedules] = await pool.execute(`
        SELECT s.*, c.name as class_name, c.subject, c.grade, c.color, u.full_name as teacher_name
        FROM schedules s
        JOIN classes c ON s.class_id = c.id
        JOIN class_members cm ON c.id = cm.class_id
        JOIN users u ON c.teacher_id = u.id
        WHERE cm.student_id = ?
        ORDER BY FIELD(s.day_of_week, 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'), s.start_time ASC
      `, [req.user.id]);
      res.json({ schedules });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const { class_id, day_of_week, start_time, end_time, room_location } = req.body;
    if (!class_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ lớp học, thứ trong tuần và thời gian' });
    }

    const [resInsert] = await pool.execute(`
      INSERT INTO schedules (class_id, day_of_week, start_time, end_time, room_location)
      VALUES (?, ?, ?, ?, ?)
    `, [class_id, day_of_week, start_time, end_time, room_location ? room_location.trim() : 'Tại nhà cô']);

    res.json({ success: true, scheduleId: resInsert.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedules/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    await pool.execute('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa buổi dạy thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== ASSIGNMENTS (BÀI TẬP & CHẤM ĐIỂM) ====================
app.get('/api/assignments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const [assignments] = await pool.execute(`
        SELECT a.*, c.name as class_name, c.color as class_color,
               COUNT(DISTINCT sub.id) as submission_count,
               COUNT(DISTINCT cm.student_id) as total_students
        FROM assignments a
        JOIN classes c ON a.class_id = c.id
        LEFT JOIN class_members cm ON c.id = cm.class_id
        LEFT JOIN submissions sub ON a.id = sub.assignment_id
        WHERE a.teacher_id = ?
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `, [req.user.id]);
      res.json({ assignments });
    } else {
      const [assignments] = await pool.execute(`
        SELECT a.*, c.name as class_name, c.color as class_color,
               sub.id as submission_id, sub.content as submission_content, 
               sub.attachment_url as submission_attachment, sub.submitted_at, 
               sub.score, sub.feedback
        FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN class_members cm ON c.id = cm.class_id
        LEFT JOIN submissions sub ON a.id = sub.assignment_id AND sub.student_id = ?
        WHERE cm.student_id = ?
        ORDER BY a.created_at DESC
      `, [req.user.id, req.user.id]);
      res.json({ assignments });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assignments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền giao bài tập' });
    const { class_id, title, description, due_date, attachment_url } = req.body;
    if (!class_id || !title) {
      return res.status(400).json({ error: 'Vui lòng chọn lớp học và nhập tiêu đề bài tập' });
    }

    const [resInsert] = await pool.execute(`
      INSERT INTO assignments (class_id, teacher_id, title, description, due_date, attachment_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [class_id, req.user.id, title.trim(), description ? description.trim() : '', due_date || null, attachment_url ? attachment_url.trim() : null]);

    res.json({ success: true, assignmentId: resInsert.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assignments/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    await pool.execute('DELETE FROM assignments WHERE id = ? AND teacher_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Đã xóa bài tập thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assignments/:id/submit', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Chỉ học sinh mới nộp bài tập' });
    const assignmentId = req.params.id;
    const { content, attachment_url } = req.body;

    await pool.execute(`
      INSERT INTO submissions (assignment_id, student_id, content, attachment_url, submitted_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE content=VALUES(content), attachment_url=VALUES(attachment_url), submitted_at=NOW()
    `, [assignmentId, req.user.id, content ? content.trim() : '', attachment_url ? attachment_url.trim() : '']);

    res.json({ success: true, message: 'Đã nộp bài tập thành công!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/assignments/:id/submissions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const assignmentId = req.params.id;

    const [submissions] = await pool.execute(`
      SELECT sub.*, u.full_name as student_name, u.email as student_email, u.phone as student_phone
      FROM submissions sub
      JOIN users u ON sub.student_id = u.id
      WHERE sub.assignment_id = ?
      ORDER BY sub.submitted_at DESC
    `, [assignmentId]);

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/submissions/:id/grade', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const { score, feedback } = req.body;
    await pool.execute(`
      UPDATE submissions
      SET score = ?, feedback = ?
      WHERE id = ?
    `, [score, feedback ? feedback.trim() : '', req.params.id]);

    res.json({ success: true, message: 'Đã lưu điểm và nhận xét thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== PARENT LEADS / ĐĂNG KÝ HỌC THỬ ====================
// Public: Parent registers on Landing Page
app.post('/api/leads', async (req, res) => {
  try {
    const { name, phone, grade, format, note } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Vui lòng nhập họ tên và số điện thoại liên hệ' });
    }

    const [resInsert] = await pool.execute(`
      INSERT INTO leads (name, phone, grade, format, note)
      VALUES (?, ?, ?, ?, ?)
    `, [name.trim(), phone.trim(), grade || '', format || '', note ? note.trim() : '']);

    // Tự động gửi thông báo tức thì tới email của Cô Trinh
    sendLeadNotificationToTeacher({
      name: name.trim(),
      phone: phone.trim(),
      grade: grade || '',
      format: format || '',
      note: note ? note.trim() : ''
    }).catch(err => console.error('Lỗi gửi mail thông báo lead mới tới cô:', err));

    res.json({ success: true, leadId: resInsert.insertId, message: 'Đăng ký thành công! Cô Trinh sẽ sớm liên hệ lại.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: View Leads
app.get('/api/teacher/leads', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const [leads] = await pool.execute('SELECT * FROM leads ORDER BY created_at DESC');
    res.json({ leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Update Lead Status
app.patch('/api/teacher/leads/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const { status } = req.body;
    await pool.execute('UPDATE leads SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: 'Đã cập nhật trạng thái phụ huynh đăng ký' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Delete Lead
app.delete('/api/teacher/leads/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    await pool.execute('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== EMAIL NOTIFICATIONS ====================
// Helper: Get today's Vietnamese day name
function getTodayVietnameseDay() {
  const daysMap = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const now = new Date();
  return daysMap[now.getDay()];
}

// Send Class Reminder Email (On the day of the class)
async function sendClassReminderEmail(recipientEmail, studentName, className, timeText, location) {
  const mailer = getMailer();
  const subject = `[Lớp Học Cô Trinh] Nhắc Lịch Học Hôm Nay: ${className}`;
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #3d312a; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #f7c5cc; border-radius: 18px; background: #faf6f0;">
      <div style="text-align: center; border-bottom: 2px solid #f7c5cc; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="color: #e7786b; margin: 0; font-size: 22px;">🌸 LỚP HỌC CÔ TRINH</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #7e6857;">Thông Báo Nhắc Lịch Học Trong Ngày</p>
      </div>

      <p style="font-size: 15px;">Chào em <strong>${studentName}</strong> và Quý Phụ huynh thân mến,</p>
      
      <p style="font-size: 14px;">Cô Trinh gửi thông báo nhắc lịch học <strong>hôm nay (${dateStr})</strong> của em như sau:</p>
      
      <div style="background: #ffffff; padding: 18px; border-radius: 14px; border: 1px solid #cde4dc; margin: 16px 0; box-shadow: 0 4px 12px rgba(83, 62, 45, 0.05);">
        <p style="margin: 6px 0; font-size: 14px;">📚 <strong>Môn học / Lớp:</strong> <span style="color: #e7786b; font-weight: bold;">${className}</span></p>
        <p style="margin: 6px 0; font-size: 14px;">⏰ <strong>Thời gian:</strong> <span style="color: #2b7a66; font-weight: bold;">${timeText}</span></p>
        <p style="margin: 6px 0; font-size: 14px;">📍 <strong>Địa điểm:</strong> <strong>${location || 'Tại nhà cô Trinh (Hòa Tiến)'}</strong></p>
      </div>

      <div style="background: #fdf0f2; padding: 12px 16px; border-radius: 10px; border-left: 4px solid #e7786b; font-size: 13px; color: #533e2d; margin-bottom: 20px;">
        💡 <strong>Lời dặn của cô:</strong> Em nhớ hoàn thành bài tập về nhà cô đã giao trên Classroom và chuẩn bị đầy đủ sách vở, dụng cụ học tập trước giờ vào lớp nhé!
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #7e6857; border-top: 1px dashed #f7c5cc; padding-top: 14px;">
        Thân ái gửi đến em và gia đình,<br>
        <strong>Cô Trinh - Sư phạm Khoa học tự nhiên & Toán THCS</strong><br>
        📞 Hotline / Zalo: <strong>0702.498.036</strong><br>
        🏡 Địa chỉ: Thôn Phú Sơn 2, xã Hòa Tiến, TP. Đà Nẵng
      </p>
    </div>
  `;

  if (!mailer) {
    console.log(`[EMAIL SIMULATED]: Gửi tới ${recipientEmail}: ${subject}`);
    await pool.execute(`
      INSERT INTO email_logs (recipient_email, subject, body, status)
      VALUES (?, ?, ?, 'simulated')
    `, [recipientEmail, subject, `Lớp: ${className} | Giờ: ${timeText}`]);
    return { success: true, simulated: true };
  }

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || '"Lớp Học Cô Trinh" <cotrinh.dayhoc@gmail.com>',
      to: recipientEmail,
      subject: subject,
      html: htmlBody
    });
    await pool.execute(`
      INSERT INTO email_logs (recipient_email, subject, body, status)
      VALUES (?, ?, ?, 'sent')
    `, [recipientEmail, subject, `Lớp: ${className} | Giờ: ${timeText}`]);
    return { success: true, simulated: false };
  } catch (err) {
    console.error('Email send error:', err);
    await pool.execute(`
      INSERT INTO email_logs (recipient_email, subject, body, status)
      VALUES (?, ?, ?, 'failed')
    `, [recipientEmail, subject, err.message]);
    return { success: false, error: err.message };
  }
}

// Helper: Get Teacher Email
async function getTeacherEmail() {
  try {
    const [rows] = await pool.execute("SELECT email FROM users WHERE role = 'teacher' LIMIT 1");
    if (rows.length > 0 && rows[0].email) return rows[0].email;
  } catch (e) {
    console.error('Error fetching teacher email:', e);
  }
  return process.env.SMTP_USER || 'cotrinh.dayhoc@gmail.com';
}

// Send Lead Notification Email to Teacher (when parent registers on Landing Page)
async function sendLeadNotificationToTeacher(lead) {
  const teacherEmail = await getTeacherEmail();
  const mailer = getMailer();
  const subject = `[Lớp Học Cô Trinh] 🔔 Phụ Huynh Mới Đăng Ký: ${lead.name} (${lead.phone})`;
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ngày ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #3d312a; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #f7c5cc; border-radius: 18px; background: #faf6f0;">
      <div style="text-align: center; border-bottom: 2px solid #f7c5cc; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="color: #e7786b; margin: 0; font-size: 22px;">🌸 LỚP HỌC CÔ TRINH</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #7e6857;">Thông Báo Phụ Huynh Mới Đăng Ký Tư Vấn</p>
      </div>

      <p style="font-size: 15px;">Cô Trinh ơi, có phụ huynh vừa để lại thông tin đăng ký trên trang chủ lúc <strong>${timeStr}</strong>:</p>
      
      <div style="background: #ffffff; padding: 18px; border-radius: 14px; border: 1px solid #cde4dc; margin: 16px 0; box-shadow: 0 4px 12px rgba(83, 62, 45, 0.05);">
        <p style="margin: 6px 0; font-size: 14px;">👤 <strong>Họ tên phụ huynh:</strong> <span style="font-weight: bold; color: #3d312a;">${lead.name}</span></p>
        <p style="margin: 6px 0; font-size: 14px;">📞 <strong>Số điện thoại:</strong> <a href="tel:${lead.phone}" style="color: #e7786b; font-weight: bold; text-decoration: underline;">${lead.phone}</a></p>
        <p style="margin: 6px 0; font-size: 14px;">🎒 <strong>Khối lớp cần học:</strong> <strong>${lead.grade || 'Chưa rõ'}</strong></p>
        <p style="margin: 6px 0; font-size: 14px;">👥 <strong>Hình thức mong muốn:</strong> <strong>${lead.format || '1:1 hoặc nhóm 3-5'}</strong></p>
        <p style="margin: 6px 0; font-size: 14px;">📝 <strong>Lời nhắn:</strong> <span style="font-style: italic;">${lead.note || '(Không có lời nhắn)'}</span></p>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="https://zalo.me/${(lead.phone || '').replace(/[^0-9]/g, '')}" target="_blank" style="display: inline-block; background: #0068FF; color: #ffffff; font-weight: bold; padding: 10px 18px; border-radius: 12px; text-decoration: none; font-size: 13px; margin-right: 8px;">
          💬 Chat Zalo Với Phụ Huynh
        </a>
        <a href="tel:${lead.phone}" style="display: inline-block; background: #e7786b; color: #ffffff; font-weight: bold; padding: 10px 18px; border-radius: 12px; text-decoration: none; font-size: 13px;">
          📞 Gọi Điện Cho Phụ Huynh
        </a>
      </div>

      <p style="margin-top: 20px; font-size: 12px; color: #7e6857; text-align: center;">
        Cô có thể quản lý và xếp lớp cho phụ huynh tại: <a href="http://localhost:3000/classroom.html" style="color: #e7786b;">Cổng Lớp Học Cô Trinh</a>
      </p>
    </div>
  `;

  if (!mailer) {
    console.log(`[EMAIL SIMULATED]: Gửi thông báo lead mới tới cô Trinh (${teacherEmail}): ${subject}`);
    await pool.execute(`
      INSERT INTO email_logs (recipient_email, subject, body, status)
      VALUES (?, ?, ?, 'simulated')
    `, [teacherEmail, subject, `Phụ huynh: ${lead.name} | SĐT: ${lead.phone}`]);
    return { success: true, simulated: true };
  }

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || '"Lớp Học Cô Trinh" <cotrinh.dayhoc@gmail.com>',
      to: teacherEmail,
      subject: subject,
      html: htmlBody
    });
    await pool.execute(`
      INSERT INTO email_logs (recipient_email, subject, body, status)
      VALUES (?, ?, ?, 'sent')
    `, [teacherEmail, subject, `Phụ huynh: ${lead.name} | SĐT: ${lead.phone}`]);
    return { success: true, simulated: false };
  } catch (err) {
    console.error('Email lead notify error:', err);
    await pool.execute(`
      INSERT INTO email_logs (recipient_email, subject, body, status)
      VALUES (?, ?, ?, 'failed')
    `, [teacherEmail, subject, err.message]);
    return { success: false, error: err.message };
  }
}

// Send Teacher Daily Schedule Briefing Email
async function sendTeacherDailyScheduleEmail(teacherEmail, todayName, schedules) {
  const mailer = getMailer();
  const subject = `[Lớp Học Cô Trinh] 📅 Lịch Dạy Hôm Nay Của Cô (${todayName})`;
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const scheduleItemsHtml = schedules.map(sch => `
    <div style="background: #ffffff; padding: 14px 18px; border-radius: 12px; border: 1px solid #cde4dc; margin-bottom: 12px;">
      <h3 style="margin: 0 0 6px 0; color: #e7786b; font-size: 16px;">📖 ${sch.class_name}</h3>
      <p style="margin: 4px 0; font-size: 14px;">⏰ <strong>Thời gian:</strong> <span style="color: #2b7a66; font-weight: bold;">${sch.start_time.substring(0, 5)} - ${sch.end_time.substring(0, 5)}</span></p>
      <p style="margin: 4px 0; font-size: 14px;">📍 <strong>Địa điểm:</strong> ${sch.room_location || 'Tại nhà cô (Hòa Tiến)'}</p>
    </div>
  `).join('');

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #3d312a; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #f7c5cc; border-radius: 18px; background: #faf6f0;">
      <div style="text-align: center; border-bottom: 2px solid #f7c5cc; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="color: #e7786b; margin: 0; font-size: 22px;">🌸 LỚP HỌC CÔ TRINH</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #7e6857;">Thông Báo Lịch Dạy Hôm Nay Của Cô</p>
      </div>

      <p style="font-size: 15px;">Chào Cô Trinh thân mến,</p>
      <p style="font-size: 14px;">Hôm nay là <strong>${todayName} (ngày ${dateStr})</strong>. Cô có <strong>${schedules.length} ca dạy</strong> được xếp lịch như sau:</p>

      <div style="margin: 16px 0;">
        ${scheduleItemsHtml}
      </div>

      <p style="font-size: 13px; color: #2b7a66; background: #eaf5f1; padding: 10px 14px; border-radius: 10px; margin-bottom: 16px;">
        ✅ Hệ thống đã tự động gửi email thông báo nhắc giờ học tới tất cả học sinh trong các lớp này!
      </p>

      <p style="font-size: 13px; color: #7e6857; text-align: center; border-top: 1px dashed #f7c5cc; padding-top: 12px;">
        Chúc cô Trinh có một ngày giảng dạy thật nhiều niềm vui và truyền cảm hứng! 🌸
      </p>
    </div>
  `;

  if (!mailer) {
    console.log(`[EMAIL SIMULATED]: Gửi tóm tắt lịch dạy tới cô Trinh (${teacherEmail}): ${subject}`);
    await pool.execute(`
      INSERT INTO email_logs (recipient_email, subject, body, status)
      VALUES (?, ?, ?, 'simulated')
    `, [teacherEmail, subject, `Lịch dạy hôm nay: ${schedules.length} lớp`]);
    return { success: true, simulated: true };
  }

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || '"Lớp Học Cô Trinh" <cotrinh.dayhoc@gmail.com>',
      to: teacherEmail,
      subject: subject,
      html: htmlBody
    });
    await pool.execute(`
      INSERT INTO email_logs (recipient_email, subject, body, status)
      VALUES (?, ?, ?, 'sent')
    `, [teacherEmail, subject, `Lịch dạy hôm nay: ${schedules.length} lớp`]);
    return { success: true, simulated: false };
  } catch (err) {
    console.error('Email teacher schedule error:', err);
    await pool.execute(`
      INSERT INTO email_logs (recipient_email, subject, body, status)
      VALUES (?, ?, ?, 'failed')
    `, [teacherEmail, subject, err.message]);
    return { success: false, error: err.message };
  }
}

// Teacher: Get classes scheduled for TODAY
app.get('/api/teacher/today-classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const todayName = getTodayVietnameseDay();
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const [schedules] = await pool.execute(`
      SELECT s.*, c.name as class_name, c.color, c.grade, c.subject
      FROM schedules s
      JOIN classes c ON s.class_id = c.id
      WHERE s.day_of_week = ? AND c.teacher_id = ?
      ORDER BY s.start_time ASC
    `, [todayName, req.user.id]);

    const result = [];
    for (const sch of schedules) {
      const [students] = await pool.execute(`
        SELECT u.id, u.full_name, u.email, u.phone
        FROM users u
        JOIN class_members cm ON u.id = cm.student_id
        WHERE cm.class_id = ?
      `, [sch.class_id]);

      result.push({
        ...sch,
        students: students
      });
    }

    res.json({
      todayName,
      formattedDate,
      schedules: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Send reminders for all classes scheduled TODAY
app.post('/api/teacher/send-today-reminders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const todayName = getTodayVietnameseDay();

    const [schedules] = await pool.execute(`
      SELECT s.*, c.name as class_name, c.id as class_id
      FROM schedules s
      JOIN classes c ON s.class_id = c.id
      WHERE s.day_of_week = ? AND c.teacher_id = ?
    `, [todayName, req.user.id]);

    if (schedules.length === 0) {
      return res.status(400).json({ error: `Hôm nay (${todayName}) không có lịch dạy lớp nào.` });
    }

    let sentCount = 0;
    for (const sch of schedules) {
      const [students] = await pool.execute(`
        SELECT u.id, u.full_name, u.email
        FROM users u
        JOIN class_members cm ON u.id = cm.student_id
        WHERE cm.class_id = ?
      `, [sch.class_id]);

      for (const st of students) {
        const timeText = `${todayName} (${sch.start_time.substring(0, 5)} - ${sch.end_time.substring(0, 5)})`;
        await sendClassReminderEmail(st.email, st.full_name, sch.class_name, timeText, sch.room_location);
        sentCount++;
      }
    }

    // Đồng thời tự động gửi 1 email tóm tắt lịch dạy hôm nay tới Cô Trinh
    try {
      const teacherEmail = await getTeacherEmail();
      await sendTeacherDailyScheduleEmail(teacherEmail, todayName, schedules);
    } catch (e) {
      console.error('Lỗi gửi mail lịch dạy tới cô Trinh:', e);
    }

    res.json({
      success: true,
      message: `Đã gửi thông báo nhắc lịch học hôm nay (${todayName}) đến ${sentCount} học sinh và gửi tóm tắt lịch dạy tới cô Trinh!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Send manual reminder to a specific class
app.post('/api/teacher/send-reminder', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const { class_id, custom_message } = req.body;

    const [classRows] = await pool.execute('SELECT * FROM classes WHERE id = ?', [class_id]);
    if (classRows.length === 0) return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    const cls = classRows[0];

    const [students] = await pool.execute(`
      SELECT u.id, u.full_name, u.email
      FROM users u
      JOIN class_members cm ON u.id = cm.student_id
      WHERE cm.class_id = ?
    `, [class_id]);

    if (students.length === 0) {
      return res.status(400).json({ error: 'Lớp này hiện chưa có học sinh nào' });
    }

    let sentCount = 0;
    for (const st of students) {
      await sendClassReminderEmail(st.email, st.full_name, cls.name, custom_message || 'Buổi học sắp diễn ra', 'Tại nhà cô / Theo lịch xếp');
      sentCount++;
    }

    res.json({ success: true, message: `Đã gửi thông báo nhắc học đến ${sentCount} học sinh!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/email-logs', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const [logs] = await pool.execute('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 30');
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/smtp-config', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Chỉ giáo viên có quyền' });
    const { email, app_password } = req.body;
    if (email && app_password) {
      process.env.SMTP_USER = email.trim();
      process.env.SMTP_PASS = app_password.trim();
      process.env.SMTP_FROM = `"Lớp Học Cô Trinh" <${email.trim()}>`;
      res.json({ success: true, message: 'Đã cập nhật tài khoản Gmail gửi thông báo!' });
    } else {
      res.status(400).json({ error: 'Vui lòng nhập Email và Mật khẩu ứng dụng Gmail' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRON JOB: TỰ ĐỘNG GỬI EMAIL VÀO BUỔI SÁNG NGÀY HỌC (07:30 SÁNG MỖI NGÀY)
cron.schedule('30 7 * * *', async () => {
  try {
    const todayName = getTodayVietnameseDay();
    console.log(`[CRON 07:30 SÁNG] Bắt đầu quét các lớp có lịch học hôm nay (${todayName})...`);

    const [schedules] = await pool.execute(`
      SELECT s.*, c.name as class_name, c.id as class_id
      FROM schedules s
      JOIN classes c ON s.class_id = c.id
      WHERE s.day_of_week = ?
    `, [todayName]);

    for (const sch of schedules) {
      const [students] = await pool.execute(`
        SELECT u.id, u.full_name, u.email
        FROM users u
        JOIN class_members cm ON u.id = cm.student_id
        WHERE cm.class_id = ?
      `, [sch.class_id]);

      for (const st of students) {
        const timeText = `${todayName} (${sch.start_time.substring(0, 5)} - ${sch.end_time.substring(0, 5)})`;
        console.log(`[CRON SÁNG] Gửi thông báo tới ${st.full_name} (${st.email}) cho lớp ${sch.class_name}`);
        await sendClassReminderEmail(st.email, st.full_name, sch.class_name, timeText, sch.room_location);
      }
    }

    // Tự động gửi tóm tắt toàn bộ lịch dạy hôm nay cho Cô Trinh
    if (schedules.length > 0) {
      const teacherEmail = await getTeacherEmail();
      console.log(`[CRON SÁNG] Gửi email lịch dạy hôm nay tới Cô Trinh (${teacherEmail})...`);
      await sendTeacherDailyScheduleEmail(teacherEmail, todayName, schedules);
    }
  } catch (err) {
    console.error('Cron job morning error:', err);
  }
});

// CRON JOB: Chạy mỗi 30 phút kiểm tra ca học sắp diễn ra trong ngày
cron.schedule('*/30 * * * *', async () => {
  try {
    const todayName = getTodayVietnameseDay();
    const [schedules] = await pool.execute(`
      SELECT s.*, c.name as class_name, c.id as class_id
      FROM schedules s
      JOIN classes c ON s.class_id = c.id
      WHERE s.day_of_week = ?
    `, [todayName]);

    for (const sch of schedules) {
      const [students] = await pool.execute(`
        SELECT u.id, u.full_name, u.email
        FROM users u
        JOIN class_members cm ON u.id = cm.student_id
        WHERE cm.class_id = ?
      `, [sch.class_id]);

      for (const st of students) {
        // Chỉ gửi nếu hôm nay chưa gửi để tránh spam
        const [sentToday] = await pool.execute(`
          SELECT id FROM email_logs 
          WHERE recipient_email = ? 
            AND subject LIKE ? 
            AND DATE(sent_at) = CURDATE()
        `, [st.email, `%${sch.class_name}%`]);

        if (sentToday.length === 0) {
          const timeText = `${todayName} (${sch.start_time.substring(0, 5)} - ${sch.end_time.substring(0, 5)})`;
          console.log(`[CRON AUTO] Gửi email nhắc học sinh ${st.full_name} lớp ${sch.class_name}`);
          await sendClassReminderEmail(st.email, st.full_name, sch.class_name, timeText, sch.room_location);
        }
      }
    }
  } catch (err) {
    console.error('Cron job error:', err);
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled express error:', err);
  res.status(500).json({ error: 'Đã xảy ra sự cố nội bộ trên máy chủ: ' + err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  LỚP HỌC CÔ TRINH - PRODUCTION SERVER RUNNING`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Landing page: http://localhost:${PORT}/index.html`);
  console.log(`  Classroom LMS: http://localhost:${PORT}/classroom.html`);
  console.log(`=================================================`);
});
