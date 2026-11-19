# HỆ THỐNG CLASSROOM & LANDING PAGE LỚP HỌC CÔ TRINH

Trang web Landing Page kết hợp **Hệ thống Quản lý Lớp học trực tuyến (Classroom LMS)** kết nối trực tiếp với **Cơ sở dữ liệu MySQL trên Aiven Cloud**.

---

## 1. ĐỊA CHỈ TRUY CẬP HỆ THỐNG

Máy chủ Backend Node.js đang chạy tại cổng **3000**:
* **Trang chủ Landing Page:** [http://localhost:3000/index.html](http://localhost:3000/index.html)
* **Cổng Lớp Học Trực Tuyến (Classroom LMS):** [http://localhost:3000/classroom.html](http://localhost:3000/classroom.html)

---

## 2. TÀI KHOẢN ĐĂNG NHẬP THỬ NGHIỆM SẴN

Hệ thống đã được nạp sẵn dữ liệu mẫu trong cơ sở dữ liệu `cotrinh_classroom`:

### A. Tài khoản Giáo Viên (Cô Trinh):
* **Tên đăng nhập:** `cotrinh`
* **Mật khẩu:** `cotrinh123`
* **Quyền hạn:**
  1. Tạo lớp học mới, thêm học sinh vào lớp (tự cấp tài khoản cho học sinh).
  2. Giao bài tập về nhà theo từng lớp (kèm file tài liệu / link đính kèm).
  3. Xem bài nộp của học sinh, chấm điểm và gửi lời nhận xét.
  4. Quản lý Thời khóa biểu / Lịch dạy tổng thể của cô trong tuần.
  5. Gửi email thông báo nhắc lịch học tự động hoặc gửi tức thời.

### B. Tài khoản Học Sinh:
* **Học sinh 1 (Em Nam - Lớp 7):**
  * Tên đăng nhập: `nam7` | Mật khẩu: `123456`
* **Học sinh 2 (Em Đăng Khoa - Lớp 8):**
  * Tên đăng nhập: `khoa8` | Mật khẩu: `123456`
* **Học sinh 3 (Em Linh Chi - Lớp 6):**
  * Tên đăng nhập: `linhchi6` | Mật khẩu: `123456`
* **Quyền hạn của học sinh:**
  1. Xem danh sách lớp học của mình.
  2. Xem thời khóa biểu các buổi học trong tuần kèm địa điểm.
  3. Xem bài tập về nhà cô giao, nộp bài làm trực tuyến.
  4. Xem điểm số và lời nhận xét của cô Trinh sau khi cô chấm bài.

---

## 3. CƠ SỞ DỮ LIỆU MYSQL (AIVEN CLOUD)

* **Host:** `mysql-148f4d0d-thungo3011-4212.f.aivencloud.com`
* **Port:** `23095`
* **Database:** `cotrinh_classroom` *(Được tạo riêng biệt, bảo toàn nguyên vẹn cơ sở dữ liệu cũ của bạn)*
* **SSL Mode:** Bật mã hóa bảo mật `REQUIRED`.
* **Các bảng dữ liệu:**
  * `users`: Tài khoản giáo viên và học sinh (mật khẩu mã hóa Bcrypt).
  * `classes`: Các lớp học (Toán 6, Toán 7, KHTN 8...).
  * `class_members`: Danh sách học sinh theo từng lớp.
  * `assignments`: Danh sách đề bài tập do cô Trinh giao.
  * `submissions`: Bài làm đã nộp của học sinh, điểm số và nhận xét.
  * `schedules`: Thời khóa biểu các buổi dạy theo thứ trong tuần.
  * `email_logs`: Nhật ký các email thông báo đã gửi.

---

## 4. HỆ THỐNG GỬI EMAIL NHẮC LỊCH TỰ ĐỘNG

* **Cron Job ngầm:** Chạy tự động mỗi 15 phút, tự động quét thời khóa biểu hôm nay để nhắc nhở học sinh trước giờ học.
* **Gửi thử nghiệm:** Có sẵn nút bấm gửi thử nghiệm và lưu vào nhật ký `email_logs`.
* **Cấu hình Gmail thật:** Tại tab *"Nhắc Lịch & Email"* trên giao diện giáo viên, cô Trinh có thể nhập tài khoản Gmail và Mật khẩu ứng dụng (App Password) của Google để gửi mail thật tới phụ huynh/học sinh bất kỳ lúc nào.

---

## 5. HƯỚNG DẪN DEPLOY LÊN CLOUD (RENDER / RAILWAY / VPS)

Dự án đã được đóng gói chuẩn production, sẵn sàng deploy lên bất kỳ nền tảng nào:

### Cách Deploy lên Render (Khuyên dùng - Miễn phí):
1. Đẩy code lên GitHub repository (nhớ không commit file `.env`).
2. Vào [Render.com](https://render.com) ➔ Chọn **New Web Service** ➔ Kết nối GitHub repo này.
3. Thiết lập thông số:
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
4. Vào mục **Environment Variables** (Biến môi trường) trên Render, thêm các khóa từ file `.env`:
   * `DB_HOST`: `mysql-148f4d0d-thungo3011-4212.f.aivencloud.com`
   * `DB_PORT`: `23095`
   * `DB_USER`: `avnadmin`
   * `DB_PASS`: Mật khẩu database Aiven MySQL của bạn (lấy từ file .env)
   * `DB_NAME`: `cotrinh_classroom`
   * `JWT_SECRET`: `cotrinh_secret_key_2026_super_safe`
   * `SMTP_USER`: Gmail của cô Trinh
   * `SMTP_PASS`: Mật khẩu ứng dụng 16 ký tự của Google
5. Bấm **Deploy**! Render sẽ cấp tên miền dạng `https://ten-app.onrender.com`.

---

## 6. LỆNH KHỞI ĐỘNG CỤC BỘ (LOCAL)

```bash
npm start
```
