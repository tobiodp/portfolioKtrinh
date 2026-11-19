# 🌸 SỔ TAY HƯỚNG DẪN SỬ DỤNG HỆ THỐNG
### Dành riêng cho Cô Trinh - Lớp Học Toán & Khoa Học Tự Nhiên THCS

Chào Cô Trinh! Đây là tài liệu hướng dẫn chi tiết, dễ hiểu giúp cô làm quen và làm chủ hoàn toàn hệ thống website & lớp học trực tuyến của mình.

---

## 🌟 1. TỔNG QUAN HỆ THỐNG CỦA CÔ

Hệ thống của cô bao gồm **2 phân hệ chính**:

1. **Trang Giới Thiệu (Landing Page):**
   * **Địa chỉ:** [http://localhost:3000/index.html](http://localhost:3000/index.html)
   * **Mục đích:** Giới thiệu bản thân, bằng cấp Sư phạm, kinh nghiệm, phương pháp giảng dạy và đánh giá (feedback) của học sinh để phụ huynh tin tưởng đăng ký học.
2. **Cổng Lớp Học Trực Tuyến (Classroom LMS):**
   * **Địa chỉ:** [http://localhost:3000/classroom.html](http://localhost:3000/classroom.html) (hoặc bấm nút màu hồng **"Vào Lớp Học"** ở góc trên trang chủ).
   * **Mục đích:** Nơi cô tạo lớp, quản lý học sinh, giao bài tập về nhà, chấm điểm, theo dõi lịch dạy và nhận thông tin phụ huynh đăng ký.

---

## 🔑 2. THÔNG TIN ĐĂNG NHẬP CỦA CÔ TRINH

* **Trang đăng nhập:** [http://localhost:3000/classroom.html](http://localhost:3000/classroom.html)
* **Tên đăng nhập (Username):** `cotrinh`
* **Mật khẩu (Password):** `cotrinh123`
*(Cô có thể bấm vào biểu tượng con mắt 👁️ ở ô mật khẩu để kiểm tra lại mật khẩu khi gõ).*

---

## 📚 3. HƯỚNG DẪN CÁC TÍNH NĂNG CHÍNH CỦA CÔ

Khi đăng nhập thành công, cô sẽ thấy thanh điều khiển với 5 mục chính:

### 1️⃣ Quản Lý Lớp Học (Classes)
* **Tạo lớp mới:**
  * Bấm nút xanh **"+ Tạo Lớp"** ở góc trên.
  * Điền Tên lớp (ví dụ: *Toán 7 - Kèm Nâng Cao* hoặc *KHTN 8 - Khám Phá Hóa Lý*), chọn Khối lớp và Môn học.
  * Chọn màu sắc nhận diện cho lớp để dễ phân biệt, rồi bấm **"Lưu & Tạo Lớp"**.
* **Thêm học sinh vào lớp:**
  * Tại thẻ của lớp học tương ứng, bấm dòng chữ **"+ Thêm học sinh"**.
  * Điền: Họ tên học sinh, Tên đăng nhập (ví dụ: `nam7`), Email và Mật khẩu khởi tạo (mặc định để `123456`).
  * Bấm **"Thêm Học Sinh Vào Lớp"**. Sau đó cô chỉ cần nhắn tên đăng nhập và mật khẩu này cho phụ huynh/học sinh là các em vào học được ngay.
* **Xem danh sách học sinh trong lớp:**
  * Bấm nút **"DS học sinh"** để xem các em đang theo học, hoặc xóa học sinh ra khỏi lớp khi các em đã kết thúc khóa.

---

### 2️⃣ Giao Bài Tập & Chấm Điểm (Assignments & Grading)
* **Xem bài tập đã giao theo từng lớp:**
  * Tại trang **Bài Tập & Chấm Điểm**, cô có thanh công cụ **"Lọc theo lớp học"** để xem nhanh toàn bộ bài tập của riêng lớp đó.
  * Hoặc ngay tại thẻ lớp học ở mục **Quản Lý Lớp Học**, cô chỉ cần bấm nút **"Bài tập"** là hệ thống sẽ tự động chuyển sang trang bài tập và lọc riêng lớp đó cho cô!
* **Giao bài tập mới (Hỗ trợ tải ảnh & tài liệu bài tập trực quan):**
  * Bấm nút cam **"+ Giao Bài Tập"**.
  * Chọn Lớp nhận bài tập, điền Tiêu đề và Hạn nộp bài.
  * **Tải ảnh đề bài:** Bấm nút **"Choose File" / "Chọn tệp"** và chọn ảnh đề bài từ máy tính/điện thoại:
    * 📸 *Hệ thống sẽ **tự động tải ảnh lên ngay lập tức** và hiện ảnh xem trước (thumbnail) có tích xanh `✓ Đã tải ảnh lên thành công!`*.
    * Cô không cần phải bấm thêm nút nào khác.
  * Bấm nút **"Giao Bài Tập"**.
  * **Hiển thị trực quan:** Bài tập vừa giao sẽ hiện ngay ảnh đề bài to, rõ ràng trên màn hình của cô và học sinh (có nút bấm phóng to ảnh gốc).
* **Xem bài học sinh nộp & Chấm điểm:**
  * Bấm nút **"Xem bài nộp"** tại bài tập tương ứng.
  * Hệ thống sẽ hiển thị ảnh chụp trang vở bài làm của học sinh ngay trên màn hình.
  * Cô chỉ việc nhìn bài làm, nhập Điểm số (ví dụ: *8.5*) và Lời nhận xét động viên, rồi bấm **"Lưu điểm"**. Học sinh sẽ thấy ngay lời khen của cô!

---

### 3️⃣ Lịch Dạy Tuần (Schedules)
* Mục này hiển thị bảng thời khóa biểu trực quan từ **Thứ 2 đến Chủ Nhật** của riêng cô.
* **Thêm buổi dạy mới:**
  * Bấm nút **"+ Thêm Buổi Dạy"**.
  * Chọn Lớp học, Thứ trong tuần, Giờ bắt đầu - Giờ kết thúc và Địa điểm (ví dụ: *Tại nhà cô (Hòa Tiến)* hoặc *Tại nhà em Nam*).
  * Lịch dạy sẽ tự động xếp vào đúng thứ trong tuần để cô tiện theo dõi ca dạy mỗi ngày.

---

### 4️⃣ Quản Lý Phụ Huynh Đăng Ký (Leads CRM)
* Khi có phụ huynh xem trang chủ và gửi thông tin vào form *"Đăng Ký Tư Vấn & Xếp Lớp"*, thông tin sẽ tự động đổ về mục này:
  * Hiển thị Tên phụ huynh, Số điện thoại, Khối lớp con đang học, Hình thức (1:1 hay nhóm) và Lời nhắn.
  * **Thao tác nhanh:** Cô có thể bấm vào số điện thoại để gọi ngay, hoặc bấm nút **"Zalo"** màu xanh để mở ngay khung chat Zalo với phụ huynh mà không cần lưu số trước!
  * Cô có thể chuyển trạng thái từ: *Chưa liên hệ* ➔ *Đã gọi tư vấn* ➔ *Đã xếp lớp* để không bị sót học viên.

---

### 5️⃣ Thông Báo Email Tới Ngày Học (Day-of-Class Reminders)
Hệ thống được thiết kế đặc biệt để **tự động thông báo cho cả Học sinh và Cô Trinh**:
* ⏰ **Tự động gửi mỗi sáng (07:30 sáng):**
  * Mỗi buổi sáng lúc 07:30, máy chủ tự động kiểm tra xem hôm nay (Thứ mấy) có những lớp học nào.
  * **Gửi tới Học sinh:** Tự động gửi email thông báo chi tiết: môn học, giờ bắt đầu - kết thúc, phòng học/địa điểm đến từng học sinh trong lớp để các em chuẩn bị sách vở.
  * **Gửi tới Cô Trinh:** Đồng thời tự động gửi 1 email tóm tắt toàn bộ lịch dạy hôm nay vào Gmail của cô (Hôm nay có mấy ca dạy, những lớp nào, lúc mấy giờ) để cô không lo bị sót ca.
* 🔔 **Tự động báo ngay khi có Phụ huynh mới đăng ký:**
  * Ngay khi phụ huynh gửi form trên trang chủ, hệ thống sẽ tự động gửi email thông báo trực tiếp đến cô kèm họ tên, số điện thoại, khối lớp và nút bấm gọi/chat Zalo 1-chạm.
* ⚡ **Nút bấm 1-Click "Gửi Mail Nhắc Lịch Học Hôm Nay":**
  * Trong mục **Nhắc Giờ Học**, có bảng **"Lịch Học Hôm Nay"** hiển thị rõ ràng ca dạy hôm nay và danh sách các em học sinh sẽ nhận mail.
  * Cô có thể bấm nút **"Gửi Mail Nhắc Lịch Học Hôm Nay"** bất kỳ lúc nào để nhắc các em và nhận email tóm tắt ngay lập tức.
* ✉️ **Gửi nhắc nhở riêng cho từng lớp:**
  * Cô có thể chọn lớp bất kỳ và nhập lời dặn dò riêng (ví dụ: *"Hôm nay kiểm tra 15 phút, các em nhớ mang đủ máy tính bỏ túi nhé!"*) và bấm gửi.
* ⚙️ **Cài đặt gửi bằng Gmail thật của cô:**
  * Mặc định hệ thống lưu log mô phỏng. Khi cô muốn gửi vào hòm thư Gmail thật của học sinh/phụ huynh, chỉ cần nhập địa chỉ Gmail của cô và **Mật khẩu ứng dụng (App Password)** 16 ký tự của Google. Tất cả email sẽ được gửi từ chính Gmail của cô!

---

## 👨‍🎓 4. CÂU MẪU ĐỂ CÔ GỬI CHO PHỤ HUYNH & HỌC SINH

Khi nhận học sinh mới, cô có thể sao chép đoạn tin nhắn mẫu dưới đây để gửi qua Zalo cho phụ huynh:

> *"Chào ba mẹ và em [Tên Học Sinh],*  
> *Cô Trinh gửi thông tin tài khoản để em vào nhận bài tập và xem lịch học của lớp:*  
> *🌐 Địa chỉ lớp học: http://localhost:3000/classroom.html*  
> *👤 Tên đăng nhập: **[Nhập username cô đã tạo]***  
> *🔑 Mật khẩu: **123456***  
> *Sau khi đăng nhập, em nhớ kiểm tra mục 'Bài Tập Về Nhà' để hoàn thành bài cô giao trước buổi học tiếp theo nhé! Cảm ơn ba mẹ và em."*

---

## ⚡ 5. CÁCH KHỞI ĐỘNG HỆ THỐNG KHI MỞ MÁY TÍNH

Khi khởi động lại máy tính, cô chỉ cần làm 2 bước đơn giản:
1. Mở cửa sổ dòng lệnh (Terminal / PowerShell) tại thư mục `d:\portfolioKtrinh`.
2. Gõ dòng lệnh:
   ```bash
   npm start
   ```
3. Sau đó mở trình duyệt (Chrome, Cốc Cốc, Edge) vào địa chỉ [http://localhost:3000](http://localhost:3000) là hệ thống sẵn sàng hoạt động!

---

*Chúc Cô Trinh có những buổi dạy thật nhiều niềm vui, truyền cảm hứng và giúp thật nhiều học sinh tiến bộ vượt bậc môn Toán & Khoa Học Tự Nhiên!* 🌸
