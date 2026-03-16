# CÁCH CHƯƠNG TRÌNH HOẠT ĐỘNG (SYSTEM WORKFLOW)

Tài liệu này giải thích một cách tường minh "đường đi nước bước" của dữ liệu và luồng thực thi trong hệ thống Netflat. Bạn có thể sử dụng nội dung này để thuyết trình hoặc trả lời các câu hỏi phản biện của Hội đồng về nguyên lý hoạt động của dự án.

---

## 1. QUY TRÌNH KHỞI ĐỘNG HỆ THỐNG (SYSTEM STARTUP)
Hệ thống Netflat không chạy nguyên một khối mà được phân tách thành các dịch vụ độc lập. Khi khởi động, tiến trình diễn ra như sau:

1. **Khởi động Hạ tầng (Infrastructure):** Lệnh `docker-compose up -d` sẽ dựng lên 3 container đóng vai trò là "móng nhà":
   * `PostgreSQL (Port 5433)`: Khởi tạo các bảng CSDL (Users, Movies, Reviews...).
   * `Redis (Port 6380)`: Dọn dẹp bộ nhớ RAM, sẵn sàng làm hàng đợi nhận Job xử lý video.
   * `MinIO (Port 9002/9003)`: Bật máy chủ Object Storage, sẵn sàng nhận file tĩnh (Video, Poster).
2. **Khởi động Ứng dụng (Applications):** Lệnh `pnpm dev` nhờ công cụ Turborepo sẽ kích hoạt song song 3 ứng dụng:
   * `NestJS API (Port 3000)`: Chạy lên trước, kết nối vào DB, Redis và MinIO. Bật các Background Worker để bắt đầu lắng nghe hàng đợi.
   * `Next.js Admin (Port 3001)` và `Next.js Web (Port 3002)`: Chạy lên sau, sử dụng các biến môi trường để trỏ tới `http://localhost:3000` (API).

---

## 2. LUỒNG DỮ LIỆU CỦA NGƯỜI DÙNG (USER BROWSING FLOW)
Khi một User/Khách truy cập vào trang web xem phim (`http://localhost:3002`):

1. **Truy cập Trang chủ (SSR - Server Side Rendering):** Trình duyệt của User gửi Request. Thay vì gửi trang trắng, Máy chủ `Next.js Web` sẽ bí mật gọi sang máy chủ `NestJS API` để lấy danh sách phim mới nhất, sau đó "nấu" (render) sẵn HTML rồi mới trả về cho User. Quá trình này giúp SEO cực tốt.
2. **Đăng nhập / Xác thực:** User nhập Email/Pass. Next.js gửi dữ liệu sang API (Port 3000). API check Hash Password trong Postgres, nếu đúng sẽ trả về cục `JWT Token`. Từ đây về sau, mọi thao tác của User đều mang theo Token này.
3. **Phát Video (Video Streaming):**
   * Khi User bấm Xem phim, Client mở thẻ `<video>`.
   * Thẻ video không tải toàn bộ file 2GB cùng lúc. Nó dùng giao thức **HTTP Range Requests** (yêu cầu từng đoạn byte nhỏ). 
   * API lấy link file gốc từ MinIO và cho phép trình duyệt của User stream (hút) từng đoạn dữ liệu (chunk) từ MinIO một cách mượt mà. Trong lúc xem video, API NestJS hầu như không bị tốn CPU.
4. **Tương tác (Đánh giá / Yêu thích):** User gõ Review, gửi API. API lưu ngay vào Postgres và Web Next.js tự động lấy lại dữ liệu mới để hiển thị nội tuyến (inline) dưới video.

---

## 3. LUỒNG TẢI LÊN & XỬ LÝ VIDEO CỦA ADMIN (ADMIN PIPELINE FLOW)
Đây là nghiệp vụ "đắt giá" nhất giúp hệ thống tự động hóa quá trình cung cấp phim.

1. **Khai báo thông tin (Metadata):** Admin vào cổng 3001, tạo phim mới (Tên, Thể loại, Mô tả). Dữ liệu này chỉ là Text nên lưu bay thẳng vào Postgres. Trạng thái phim lúc này là `Chưa có Video` (PENDING).
2. **Quy trình Upload file lớn bất đồng bộ:**
   * Admin kéo thả file tệp MP4 bằng trình duyệt lên hệ thống.
   * `NestJS API` nhận file dưới dạng `Multipart Stream` và bắn trực tiếp (Pipe) thẳng vào `MinIO` (Vào thùng chứa nháp). Tránh lỗi tràn RAM (Out of Memory) API.
3. **Bàn giao công việc (Message Queue Worker):**
   * Ngay khi file bay vào MinIO thành công, `API` chèn thêm 1 thẻ ghi nhớ vào `Redis Queue` (Ví dụ: *"Xử lý Video cho phim ID: 123"*). 
   * `API` lập tức trả về phản hồi "Thành công" cho Admin. Trình duyệt Admin được giải phóng, có thể đi làm việc khác. 
   * Dưới Database, trạng thái phim là `Đang xử lý` (PROCESSING).
4. **Xử lý nền (Background Processing):**
   * Máy chủ `NestJS` có các luồng Worker chạy ngầm. Worker chộp lấy công việc từ `Redis`.
   * Khởi động quá trình kiểm tra format, mô phỏng giải nén/chuyển mã (Encode).
   * Làm xong, Worker di chuyển video sang thùng chứa chính của MinIO. Nối URL vào bảng Movies của phim `ID:123`.
5. **Hoàn tất:** Worker đổi trạng thái thành `Sẵn sàng` (READY). User bên ngoài trang web lập tức có thể bấm Play phim này.

---

## 4. TÓM TẮT ƯU ĐIỂM CỦA CƠ CHẾ HOẠT ĐỘNG
Qua 3 phần trên, Hội đồng sẽ thấy cách cấu trúc này giải quyết được 3 bài toán lớn:
1. **Không nghẽn cổ chai (Non-blocking):** Nhờ Redis Queue, Admin có thể tải lên 10 bộ phim cùng lúc mà không làm sập API.
2. **Chịu lỗi thông minh (Fault Tolerance - Idempotency):** Nếu Worker đang xử lý video mà sập nguồn mạng, Redis sẽ không để video đó biến mất. Có điện lại, Worker khác sẽ được Redis chia chác lại công việc đó để chạy tiếp mà không hỏng dữ liệu.
3. **Hiệu suất truyền tải (Performance):** Dùng chuyên gia chứa file là MinIO (S3) để chuyên phục vụ việc stream video, để yên cho chuyên gia logic NestJS API đi phục vụ các thao tác xử lý Auth, Review, Logic khác.