# PHÂN TÍCH KIẾN TRÚC HỆ THỐNG NETFLAT
Tài liệu này cung cấp cái nhìn chi tiết về thiết kế cấu trúc phần mềm và cơ sở hạ tầng của dự án Netflat, phục vụ trực tiếp cho việc viết Chương 3 trong Báo cáo Đồ án.

---

## 1. MÔ HÌNH KIẾN TRÚC TỔNG THỂ (HIGH-LEVEL ARCHITECTURE)
Hệ thống Netflat không sử dụng kiến trúc nguyên khối (Monolithic) truyền thống mà áp dụng mô hình **Phân tán dịch vụ (Distributed)** kết hợp **Monorepo** để chia tách rõ ràng các tầng giao diện (Client), logic nghiệp vụ (API) và lưu trữ (Storage).

Hệ thống bao gồm 4 thành phần chính:
* **Tầng Client (Frontend - Next.js):** Bao gồm cổng dành cho người dùng cuối (Web App) để xem phim và cổng quản trị nội dung (Admin Portal). 
* **Tầng API (Backend - NestJS):** Đóng vai trò là trung tâm điều phối (Core Engine), cung cấp RESTful API, xác thực (JWT) và thao tác với Database.
* **Tầng Message Queue & Background Worker (Redis):** Xử lý bất đồng bộ các tác vụ nặng (như mã hóa video) để không làm treo luồng chính của API.
* **Tầng Storage (PostgreSQL & MinIO):** Phân tách rõ ràng giữa dữ liệu có cấu trúc (Text/Metadata) và dữ liệu phi cấu trúc (Files/Video).

---

## 2. CẤU TRÚC MÃ NGUỒN (MONOREPO ARCHITECTURE)
Dự án được quản lý bằng cơ chế **Monorepo** thông qua công cụ `pnpm workspaces` và `Turborepo`. Cấu trúc này giúp chia sẻ code dùng chung một cách hoàn hảo:

* `apps/api/`: Backend Core viết bằng NestJS (cổng 3000). Chứa toàn bộ các module nghiệp vụ: Auth, Movies, Users, Reviews, Genres.
* `apps/web/`: Frontend User viết bằng Next.js (cổng 3002). Tối ưu SEO bằng Server-Side Rendering.
* `apps/admin/`: Frontend Admin viết bằng Next.js (cổng 3001). Giao diện quản trị, xem biểu đồ, tải lên video.
* `packages/shared/`: Định nghĩa các kiểu dữ liệu (Types/Interfaces) và các hàm tiện ích (Utils) được dùng chung cho cả API, Web và Admin. Tránh tình trạng lặp lặp code (DRY - Don't Repeat Yourself).

---

## 3. THIẾT KẾ CƠ SỞ LƯU TRỮ CHUYÊN BIỆT
Nút thắt cổ chai lớn nhất của một hệ thống streaming video là **lưu trữ**. Netflat giải quyết bằng cách áp dụng 3 hệ lưu trữ khác nhau cho 3 mục đích riêng biệt:

1. **PostgreSQL (Port 5433):** Cơ sở dữ liệu quan hệ chính. Dùng để lưu trữ thông tin có cấu trúc như: User profile, Movie metadata (tên phim, mô tả), Reviews, Danh sách yêu thích. Đảm bảo tính toàn vẹn dữ liệu (ACID).
2. **MinIO (Port 9002/9003):** Một hệ thống Object Storage tương thích S3 (Amazon S3). Thay vì lưu file Video/Poster vào ổ cứng ảo chung với API, hệ thống sẽ upload trực tiếp lên MinIO. MinIO hỗ trợ truyền tải HTTP Range Requests rất tốt để stream video mượt mà.
3. **Redis (Port 6380):** In-memory Database siêu tốc. Dùng để lưu trạng thái phiên đăng nhập (Session/Cache) và đặc biệt là làm Message Broker cho hàng đợi (Job Queue).

---

## 4. CHI TIẾT LUỒNG XỬ LÝ VIDEO (VIDEO PROCESSING PIPELINE)
Đây là đặc tả kiến trúc quan trọng nhất của Netflat, giúp hệ thống chịu tải được khi Admin upload các tệp video dung lượng lớn. 

**Quy trình Upload bắt đồng bộ:**
1. **[Bước 1] Khởi tạo:** Giao diện Admin gửi thông tin Metadata (Tên phim, đạo diễn) lên `NestJS API`. Tệp Video thô được API nhận và ghi tạm (hoặc stream trực tiếp) vào `MinIO` ở Bucket `nháp`.
2. **[Bước 2] Đẩy vào hàng đợi:** Ngay sau khi lưu file thô thành công, `API` cập nhật trạng thái phim trong `PostgreSQL` thành *"Đang xử lý"* (Processing) và lập tức tạo một Job đẩy vào `Redis Queue`. Client ngay lập tức nhận được phản hồi "Thành công" mà không phải chờ đợi.
3. **[Bước 3] Worker xử lý song song:** Các Background Worker của NestJS (lắng nghe trên Redis) nhận lấy Job. Bắt đầu quá trình kéo video thô về, tiến hành đọc, kiểm tra chuẩn định dạng, (trong tương lai có thể mã hóa HLS/chia độ phân giải).
4. **[Bước 4] Hoàn tất:** File video thành phẩm được tải ngược lên `MinIO` ở Bucket `chính thức`. Worker cập nhật Database chuyển trạng thái sang *"Sẵn sàng"* (Ready).
5. **[Bước 5] Cập nhật UI:** Giao diện Admin liên tục gửi (Polling/WebSocket) đến API để biết trạng thái. Khi trạng thái là Ready, UI thông báo "Video đã sẵn sàng để phát".

**Ưu điểm:** Khả năng **Idempotency** (Chịu lỗi). Nếu server bị cúp điện mạng giữa chừng (Network error) ở [Bước 3], lúc có điện lại, Redis sẽ cấp lại Job đó cho Worker xử lý tiếp mà không làm hỏng dữ liệu hệ thống.

---

## 5. TRIỂN KHAI VÀ VẬN HÀNH (DEVOPS)
Toàn bộ hệ thống kể trên được đóng gói trong các siêu chứa (Containers) bằng **Docker** và điều phối bằng **Docker Compose**.
* Chỉ cần 1 câu lệnh `docker-compose up`, hệ thống sẽ tự động pull các image (Postgres, Minio, Redis) và build các service (API, Web, Admin) lên với mạng nội bộ độc lập.
* Kiến trúc này chứng minh hệ thống đã sẵn sàng cho quy trình CI/CD và triển khai thực tế trên máy chủ Cloud (VPS) như AWS, Azure hoặc DigitalOcean.