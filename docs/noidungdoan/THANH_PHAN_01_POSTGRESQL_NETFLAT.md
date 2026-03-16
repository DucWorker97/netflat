# PHÂN TÍCH THÀNH PHẦN: POSTGRESQL (CƠ SỞ DỮ LIỆU QUAN HỆ)

## 1. PostgreSQL là gì?
PostgreSQL (hay gọi tắt là Postgres) là một hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở (RDBMS) tiên tiến và mạnh mẽ nhất hiện nay. Khác với NoSQL (như MongoDB), Postgres lưu trữ dữ liệu dưới dạng các bảng (tables) có quan hệ chặt chẽ với nhau thông qua Khóa chính (Primary Key) và Khóa ngoại (Foreign Key).

## 2. Vai trò của PostgreSQL trong Netflat
Trong một hệ thống phân tán, mọi dữ liệu mang tính "Cấu trúc" (Structured Data) sinh ra từ người dùng đều được thiết kế để nằm trọn vẹn trong PostgreSQL.
Nó đảm nhận nhiệm vụ lưu trữ:
*   Hồ sơ tài khoản người dùng, băm mật khẩu đăng nhập (Users).
*   Siêu dữ liệu (Metadata) thông tin chi tiết về phim như: Tên phim, đạo diễn, tóm tắt nội dung...
*   Các tương tác mang tính nghiệp vụ như: Bình luận (Reviews), Đánh giá (Rating), Danh sách yêu thích (Favorites).

## 3. Cách thức hoạt động và Mối liên quan
*   **Liên kết với NestJS API:** PostgreSQL cắm trực tiếp vào máy chủ API thông qua một công cụ gọi là **Prisma ORM**. Nhờ Prisma, API không cần phải viết những câu lệnh SQL thuần tốn thời gian mà có thể dùng ngôn ngữ lập trình TypeScript để thao tác Thêm/Sửa/Xóa dữ liệu một cách an toàn.
*   **Mối liên quan với MinIO:** PostgreSQL KHÔNG lưu trữ hình ảnh hay video (do nhược điểm lưu BLOB làm chậm Database). Thay vào đó, nó chỉ lưu một đường dẫn (URL dạng `http://minio/bucket/...`) trỏ sang MinIO. Các API khi yêu cầu tải phim sẽ đọc đường link này từ Postgres rồi gọi qua kho MinIO để lấy video thật.
*   **Tính ACID:** Đảm bảo tính toàn vẹn. Ví dụ: Nếu một User bị xóa, tất cả các Bình luận và Danh sách yêu thích của User đó sẽ bị xóa dọn dẹp sạch sẽ cùng lúc nhờ quan hệ Ràng buộc ngoại (Foreign Key).