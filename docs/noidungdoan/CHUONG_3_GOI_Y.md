# GỢI Ý VIẾT NỘI DUNG CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

Đây là chương quan trọng nhất, nơi bạn biểu diễn năng lực System Design và khả năng tư duy giải quyết vấn đề. Hãy nhớ chèn nhiều Sơ đồ (Use Case, ERD, Sequence Diagram) vào chương này.

---

## 3.1. Thiết kế kiến trúc tổng thể (System Architecture)
*   Tham khảo và diễn giải lại nội dung từ file `KIEN_TRUC_HE_THONG.md`.
*   **Vẽ Sơ đồ khối:**
    *   Trái: `Next.js Admin` và `Next.js Web`.
    *   Giữa: `NestJS API Core`.
    *   Phải: `PostgreSQL` (chứa Data) và `MinIO` (chứa Media).
    *   Dưới: `Redis` đóng vai trò trung gian nhận Job upload từ API và chuyển cho Worker.

## 3.2. Phân tích yêu cầu và Use Case
*   **Vẽ Biểu đồ Use Case tổng quát:**
    *   `Actor: User` -> Đăng nhập, Xem danh sách phim, Xem chi tiết phim, Xem Video, Thêm vào yêu thích (Favorites), Viết đánh giá (Reviews).
    *   `Actor: Admin` -> Đăng nhập, Quản lý User (Khóa tài khoản), Quản lý Thể loại, Thay đổi thông tin phim, Upload Video mới, Chuyển ngữ (i18n) giao diện quản trị.

## 3.3. Thiết kế luồng xử lý Video (Video Processing Pipeline) - ĐIỂM NHẤN
*   **Vẽ Biểu đồ Sequence Diagram (Biểu đồ tuần tự) cho tính năng Upload Video:**
    1.  Admin Web gửi tín hiệu POST /upload kèm Video tới API.
    2.  API lưu tạm luồng bytes vào `MinIO` (bucket Draft).
    3.  API cập nhật `Postgres`: trạng thái phim = "PROCESSING".
    4.  API bắn 1 sự kiện tạo Job vào `Redis Queue`. Trả về HTTP 200 OK cho Admin Web ngay lập tức để admin không bị đơ trình duyệt.
    5.  `Background Worker` (chạy ngầm) bắt được Job từ Redis, lấy Video từ `MinIO`, mô phỏng encode.
    6.  Worker cập nhật lại `Postgres` trạng thái = "READY".
*   **Nói về tính Idempotent:** Tại sao chúng ta cần Redis? Nếu luồng đang chạy mà cá mập cắn cáp, Worker chết, video đó sẽ không bị "treo" vĩnh viễn. Khi Worker sống lại, Redis sẽ cấp cho nó Job chạy lại (Retry) mà không làm lỗi DB.

## 3.4. Thiết kế Cơ sở dữ liệu (Database Design)
*   Sử dụng PostgreSQL và Prisma ORM.
*   **Liệt kê và giải thích các bảng chính:**
    *   `users`: ID, email, hashed_password, role (ADMIN/USER), thời gian tạo.
    *   `movies`: Lưu trữ siêu dữ liệu (Metadata) như tên phim, slug, năm, thời lượng. Điểm quan trọng là có trường `video_source_url` (Trỏ link tới MinIO) và `status` (Lưu trạng thái video DRAFT, PROCESSING, READY).
    *   `movie_genres`: Bảng trung gian (Many-to-Many) nối Movie và Genre.
    *   `reviews`: Nối Movie ID và User ID. Chứa số sao (Rating) và Content. Tham chiếu từ nghiệp vụ vừa code: Review được hiển thị *inline* trực tiếp ngay dưới trình phát video của Client Web.
    *   `favorites`: Nối Movie ID và User ID để cá nhân hóa cho từng user.

## 3.5. Thiết kế API và Bảo mật
*   **Giao thức JWT (JSON Web Token):** Không dùng Session lưu ở Server để API trở thành Stateless (Phi trạng thái), dễ dàng nâng cấp (Scale) nhiều API Server mà không cần đồng bộ session chéo.
*   **Bảo vệ API Admin:** Áp dụng Role-based Guard (`@Roles('ADMIN')` trên NestJS) - chỉ có token chứa Role=ADMIN mới được lấy danh sách tất cả User hoặc Upload phim.