# PHÂN TÍCH THÀNH PHẦN: NESTJS (API CORE BACKEND)

## 1. NestJS là gì?
NestJS là một Web Framework dành cho Node.js (viết hoàn toàn bằng ngôn ngữ TypeScript). Nó được xây dựng dựa trên Express hoặc Fastify, nhưng mang đến một tư duy kiến trúc theo chuẩn Module chặt chẽ (tương tự như gã khổng lồ Angular hay Spring Boot bên Java). Nó cung cấp sẵn mô hình "Chích lỗi phụ thuộc" (Dependency Injection).

## 2. Vai trò của NestJS trong Netflat
Đây là "bộ não" trung tâm điều phối của toàn bộ dự án. Mọi luồng Logic (Logic Nghiệp vụ / Business Logic) đều phải đi qua chốt chặn này ở Cổng mạng (Port) 3000. 
*   **API Gateway:** Cung cấp hàng loạt danh sách đường dẫn (RESTful Endpoint) chia theo từng chuyên mục cho phía UI gọi đến (`/api/auth`, `/api/movies`, `/api/users`, `/api/reviews`).
*   **Auth Guard:** Chặn cổng để kiểm tra thẻ lên tàu (Access Token) đối với các tính năng đăng nhập/bình luận, hay kiểm tra thẻ quản sát (Role: Admin) trước khi Upload tài nguyên.
*   **Job Producer & Worker:** Đảm trách vai trò tạo công việc bất đồng bộ (Video pipeline) và tự bật tiểu trình (Worker) xử lý chúng trong nền hệ thống (Background).

## 3. Cách thức hoạt động và Mối liên quan
Vai trò người đàm phán quan trọng:
*   **Giao tiếp với UI Web/Admin:** Nhận các yêu cầu (Request payload dạng JSON), kiểm tra và xác nhận tính hợp lệ class Validation (VD: Pass phải trên 6 ký tự). Trả về JSON Data sau khi đóng gói.
*   **Giao tiếp với DB Postgres (Thông qua Prisma):** Gọi dữ liệu trong Database để so sánh (VD: Check email đã được đăng ký hay chưa), lấy các dữ liệu phức tạp cần bảng JOIN (như Movie + Array Reviews + Lượt tim) ghép vào.
*   **Giao tiếp MinIO:** Quản trị các URL upload chuẩn S3.
*   **Bảo mật Stateless (Phi trạng thái):** NestJS ứng dụng công nghệ JSON Web Token (JWT) để giấu mật khẩu đã mã hóa của User sinh ra chuỗi token duy nhất, lưu phiên cho mọi phía. Đảm bảo API này có thể được nhân bản ra (Scale) thành chục cái Server (chạy ở nhiều port) mà không sợ lỗi lưu phiên truyền thống.