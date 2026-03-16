# MỤC LỤC ĐỒ ÁN (THESIS OUTLINE)
**Đề tài: Nghiên cứu và xây dựng hệ thống cung cấp dịch vụ Video Streaming dựa trên kiến trúc Monorepo và Object Storage**

### LỜI MỞ ĐẦU
* Lý do chọn đề tài
* Mục tiêu của đề tài
* Đối tượng và phạm vi nghiên cứu
* Bố cục của báo cáo

---

### CHƯƠNG 1: TỔNG QUAN VỀ HỆ THỐNG VIDEO VOD (VIDEO ON DEMAND)
**1.1. Hiện trạng và xu hướng của các hệ thống Video Streaming**
* 1.1.1. Sự bùng nổ của dịch vụ VOD (Netflix, Amazon Prime...)
* 1.1.2. Các thách thức kỹ thuật trong việc phân phối nội dung đa phương tiện

**1.2. Khảo sát nghiệp vụ hệ thống Netflat**
* 1.2.1. Nghiệp vụ đối với Người dùng (User): Trải nghiệm xem, đánh giá, danh sách yêu thích
* 1.2.2. Nghiệp vụ đối với Quản trị viên (Admin): Quản trị nội dung, quy trình tải lên (Upload) và xử lý Video

**1.3. Đánh giá về lựa chọn kiến trúc phần mềm**
* 1.3.1. Nhược điểm của kiến trúc Monolith trong xử lý Video file lớn
* 1.3.2. Đề xuất mô hình phân tán nghiệp vụ và tách biệt không gian lưu trữ tĩnh

---

### CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG
**2.1. Kiến trúc Monorepo và công cụ Turborepo**
* 2.1.1. Khái niệm Monorepo
* 2.1.2. Ưu điểm trong việc chia sẻ mã nguồn (Shared packages)

**2.2. Nền tảng Backend và Frontend**
* 2.2.1. NestJS: Khung làm việc (Framework) Node.js kiến trúc module
* 2.2.2. Next.js: Tối ưu UI/UX với Server-Side Rendering (SSR) và Đa ngôn ngữ (i18n)

**2.3. Hệ thống cơ sở lưu trữ phân tán**
* 2.3.1. Cơ sở dữ liệu quan hệ PostgreSQL (Quản lý User, Metadata)
* 2.3.2. Redis và Message Queue (Hàng đợi công việc chạy ngầm)
* 2.3.3. MinIO (S3-compatible Object Storage) trong việc phân phối file Video tĩnh

**2.4. Công nghệ đóng gói và Tích hợp**
* 2.4.1. Ảo hóa ứng dụng với Docker và Docker Compose

---

### CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG
**3.1. Thiết kế kiến trúc tổng thể (System Architecture)**
* 3.1.1. Sơ đồ các thành phần hệ thống (Client - API - Queue - Storage)
* 3.1.2. Mô hình luồng dữ liệu (Data flow)

**3.2. Phân tích yêu cầu và Use Case**
* 3.2.1. Biểu đồ Use Case tổng quát
* 3.2.2. Mô tả các Use Case chính (Đăng nhập/Đăng ký, Xem phim, Đánh giá, Quản lý tiến trình cấp chiếu phim)

**3.3. Thiết kế luồng xử lý Video (Video Processing Pipeline)**
* 3.3.1. Bài toán: Tại sao không xử lý Video đồng bộ?
* 3.3.2. Sơ đồ tuần tự (Sequence Diagram) quy trình Upload -> Hàng đợi Redis -> Mã hóa -> MinIO
* 3.3.3. Đảm bảo tính Idempotency (Chịu lỗi và khả năng tải lại / Retry) trong tiến trình

**3.4. Thiết kế Cơ sở dữ liệu (Database Design)**
* 3.4.1. Biểu đồ thực thể liên kết (ERD)
* 3.4.2. Giải thích cấu trúc các bảng chính: `Users`, `Movies`, `Reviews`, `Favorites`, `Genres`

**3.5. Thiết kế API**
* 3.5.1. Chuẩn giao tiếp RESTful API
* 3.5.2. Cơ chế phân quyền và bảo mật (JWT - JSON Web Token)

---

### CHƯƠNG 4: TRIỂN KHAI VÀ ĐÁNH GIÁ KẾT QUẢ
**4.1. Cấu hình môi trường và Tự động hóa triển khai**
* 4.1.1. Cấu trúc thư mục mã nguồn
* 4.1.2. Cấu hình file `docker-compose.yml` định tuyến các Port (5433, 6380, 9002...)

**4.2. Thực nghiệm giao diện Người dùng (Client Web)**
* 4.2.1. Giao diện Trang chủ và trải nghiệm xem phim
* 4.2.2. Chức năng tương tác: Đánh giá (Review inline) và Danh sách cá nhân
* 4.2.3. Hệ thống đa ngôn ngữ (Tiếng Anh / Tiếng Việt)

**4.3. Thực nghiệm Hệ thống Quản trị (Admin Portal)**
* 4.3.1. Bảng điều khiển (Dashboard) và thống kê
* 4.3.2. Giao diện quản lý quy trình Upload Media (Trạng thái: Đang chờ, Đang xử lý, Hoàn tất)

**4.4. Đánh giá tính năng hệ thống**
* 4.4.1. Đo lường hiệu năng tải Video từ MinIO
* 4.4.2. Đánh giá khả năng chịu lỗi của Video Pipeline khi xảy ra gián đoạn mạng (Network error)

---

### KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
**5.1. Kết quả đạt được**
**5.2. Các hạn chế còn tồn tại**
**5.3. Hướng phát triển tương lai**
(Ví dụ: Tích hợp AI gợi ý phim, Streaming độ phân giải thích ứng HLS/DASH, Webhook thanh toán trả phí bản quyền)

### TÀI LIỆU THAM KHẢO
