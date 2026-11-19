const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connected to MySQL. Seeding data...');

  // Hash passwords
  const teacherPass = await bcrypt.hash('cotrinh123', 10);
  const studentPass = await bcrypt.hash('123456', 10);

  // 1. Insert or update users
  const users = [
    { role: 'teacher', full_name: 'Cô Trinh', username: 'cotrinh', email: 'cotrinh.dayhoc@gmail.com', phone: '0702498036', password: teacherPass },
    { role: 'student', full_name: 'Em Nam', username: 'nam7', email: 'nam.toan7@gmail.com', phone: '0905123456', password: studentPass },
    { role: 'student', full_name: 'Em Đăng Khoa', username: 'khoa8', email: 'khoa.khtn8@gmail.com', phone: '0905654321', password: studentPass },
    { role: 'student', full_name: 'Em Linh Chi', username: 'linhchi6', email: 'linhchi.toan6@gmail.com', phone: '0905987654', password: studentPass }
  ];

  for (const u of users) {
    await connection.execute(`
      INSERT INTO users (role, full_name, username, email, phone, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), email=VALUES(email), phone=VALUES(phone), password_hash=VALUES(password_hash)
    `, [u.role, u.full_name, u.username, u.email, u.phone, u.password]);
  }

  // Get teacher ID
  const [teacherRows] = await connection.execute('SELECT id FROM users WHERE username = ?', ['cotrinh']);
  const teacherId = teacherRows[0].id;

  // 2. Insert Classes
  const classes = [
    { name: 'Toán 7 - Kèm Nâng Cao', subject: 'Toán', grade: 'Lớp 7', color: '#E7786B', description: 'Ôn tập đại số, hình học tam giác bằng nhau, rèn giải bài tập nâng cao.' },
    { name: 'Khoa Học Tự Nhiên 8', subject: 'Khoa học tự nhiên', grade: 'Lớp 8', color: '#5E9385', description: 'Trọng tâm phản ứng hóa học, phương trình hóa học và áp suất, lực đẩy Archimedes.' },
    { name: 'Toán 6 - Lấy Lại Căn Bản', subject: 'Toán', grade: 'Lớp 6', color: '#E08390', description: 'Chuyển cấp THCS, phân số, số nguyên và hình học trực quan.' }
  ];

  for (const c of classes) {
    const [existing] = await connection.execute('SELECT id FROM classes WHERE name = ?', [c.name]);
    let classId;
    if (existing.length === 0) {
      const [res] = await connection.execute(`
        INSERT INTO classes (teacher_id, name, subject, grade, color, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [teacherId, c.name, c.subject, c.grade, c.color, c.description]);
      classId = res.insertId;
    } else {
      classId = existing[0].id;
    }

    // Assign students
    const [nam] = await connection.execute('SELECT id FROM users WHERE username = ?', ['nam7']);
    const [khoa] = await connection.execute('SELECT id FROM users WHERE username = ?', ['khoa8']);
    const [chi] = await connection.execute('SELECT id FROM users WHERE username = ?', ['linhchi6']);

    if (c.name.includes('Toán 7') && nam.length) {
      await connection.execute('INSERT IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)', [classId, nam[0].id]);
      // Schedules
      await connection.execute('INSERT INTO schedules (class_id, day_of_week, start_time, end_time, room_location) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE room_location=VALUES(room_location)', [classId, 'Thứ 3', '18:00:00', '19:30:00', 'Tại nhà cô (Hòa Tiến)']);
      await connection.execute('INSERT INTO schedules (class_id, day_of_week, start_time, end_time, room_location) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE room_location=VALUES(room_location)', [classId, 'Thứ 5', '18:00:00', '19:30:00', 'Tại nhà cô (Hòa Tiến)']);
      // Assignment
      await connection.execute(`
        INSERT INTO assignments (class_id, teacher_id, title, description, due_date)
        VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 DAY))
      `, [classId, teacherId, 'Bài tập Đại số: Rút gọn biểu thức và tính giá trị', 'Các em hoàn thành các bài tập 1, 2, 3 trong phiếu bài tập cô đã gửi. Trình bày cẩn thận từng bước giải ra vở.']);
    } else if (c.name.includes('KHTN 8') && khoa.length) {
      await connection.execute('INSERT IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)', [classId, khoa[0].id]);
      // Schedules
      await connection.execute('INSERT INTO schedules (class_id, day_of_week, start_time, end_time, room_location) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE room_location=VALUES(room_location)', [classId, 'Thứ 2', '17:30:00', '19:00:00', 'Tại nhà học sinh']);
      await connection.execute('INSERT INTO schedules (class_id, day_of_week, start_time, end_time, room_location) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE room_location=VALUES(room_location)', [classId, 'Thứ 6', '17:30:00', '19:00:00', 'Tại nhà học sinh']);
      // Assignment
      await connection.execute(`
        INSERT INTO assignments (class_id, teacher_id, title, description, due_date)
        VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 4 DAY))
      `, [classId, teacherId, 'Cân bằng phương trình Hóa học và tính khối lượng', 'Lập phương trình hóa học và vận dụng định luật bảo toàn khối lượng để tính m(O2).']);
    } else if (c.name.includes('Toán 6') && chi.length) {
      await connection.execute('INSERT IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)', [classId, chi[0].id]);
      await connection.execute('INSERT INTO schedules (class_id, day_of_week, start_time, end_time, room_location) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE room_location=VALUES(room_location)', [classId, 'Thứ 7', '08:30:00', '10:00:00', 'Tại nhà cô']);
      await connection.execute('INSERT INTO schedules (class_id, day_of_week, start_time, end_time, room_location) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE room_location=VALUES(room_location)', [classId, 'Chủ Nhật', '08:30:00', '10:00:00', 'Tại nhà cô']);
    }
  }

  console.log('Seeded successfully!');
  await connection.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
