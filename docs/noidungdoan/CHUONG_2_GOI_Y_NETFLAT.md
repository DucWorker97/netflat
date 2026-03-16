# GỢI Ý VIẾT NỘI DUNG CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG

Chương này là nơi bạn "khoe" các công nghệ xịn mà Netflat đang sử dụng. Không nên viết quá dài như từ điển, hãy tập trung vào "Tại sao lại chọn công nghệ này thay vì công nghệ khác".

---

## 2.1. Kiến trúc Monorepo và công cụ Turborepo
*   **Monorepo là gì:** Khác với Polyrepo (mỗi dự án một Repository riêng), Monorepo chứa tất cả source code Frontend, Backend, Admin chung trong một siêu thư mục. Google, Facebook đều dùng cách này.
*   **Tại sao dùng PNPM Workspace & Turborepo:** 
    *   Chia sẻ Utils và Type (`/packages/shared`) an toàn giữa Backend và Frontend mà không cần xuất bản (publish) lên npm.
    *   Turborepo giúp cache lại quá trình build, giảm thiểu thời gian build khi chạy CI/CD.

## 2.2. Nền tảng Backend và Frontend
*   **NestJS (Backend):** 
    *   Được xây dựng trên nền tảng Express/Node.js, sử dụng TypeScript giúp code an toàn và tránh lỗi runtime.
    *   Hỗ trợ mạnh mẽ Dependency Injection, giúp ứng dụng chia module rõ ràng (Auth, Users, Movies). Kiến trúc tương tự Angular giúp code dễ bảo trì.
*   **Next.js (Frontend - User & Admin):** 
    *   Đây là Framework của React phổ biến nhất hiện nay.
    *   **Server-Side Rendering (SSR):** Khác với React thuần chỉ chạy trên trình duyệt (CSR), Next.js render html từ phía Server. Điều này rất quan trọng với Netflat vì khi chia sẻ link phim lên Facebook, Facebook sẽ đọc được thẻ meta (ảnh thumbnail, tên phim) ngay lập tức (SEO tốt).
    *   **Đa ngôn ngữ (i18n):** Hệ thống được tích hợp hệ thống dịch thuật next-intl (Tiếng Việt / Tiếng Anh) chạy nội suy trực tiếp trong quá trình SSR.

## 2.3. Hệ thống cơ sở lưu trữ phân tán
Phần này nên viết nhấn mạnh sự độc lập của 3 hệ thống:
*   **PostgreSQL:** Là CSDL cốt lõi tuân thủ ACID. Nó quản lý thông tin có cấu trúc. Tại sao không dùng MongoDB? Vì hệ thống User, Phim, Đánh giá, Thể loại có liên kết mạnh mẽ (Relational) với nhau thông qua ID, dùng SQL sẽ tối ưu truy vấn join hơn.
*   **Redis và Message Queue:** 
    *   Giải thích Message Queue: Giống như lấy số thứ tự ở ngân hàng. 
    *   Redis có tốc độ đọc ghi vào RAM cực cao. Được sử dụng để lưu các Job mã hóa Video. Giúp Server không bị sập khi có nhiều lượt Upload.
*   **MinIO (S3-compatible Object Storage):** 
    *   Thay vì lưu đè trực tiếp ảnh bìa/video vào source code Next.js, chúng ta dùng MinIO làm cỗ máy lưu trữ độc lập.
    *   MinIO tương thích với Amazon S3, hỗ trợ việc tạo các luồng stream video rất mượt cho client và khả năng nâng cấp ổ cứng không giới hạn ở tương lai.

## 2.4. Công nghệ đóng gói và Tích hợp (Docker)
*   **Khó khăn trước khi có Docker:** Chạy dự án này thủ công cần phải cài Node, cài Postgres, cài Redis, cài Minio, chạy Admin, Web, API ở các tab terminal khác nhau... rất cực.
*   **Giải pháp Docker Compose:** Chỉ với 1 file `docker-compose.yml`, quá trình khởi tạo môi trường mất chưa đến 1 phút. Đảm bảo Dev chạy được, đưa lên Server chạy được (It works on my machine problem solved).