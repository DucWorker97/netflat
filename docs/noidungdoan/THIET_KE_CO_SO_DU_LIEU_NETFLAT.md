# THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA) HỆ THỐNG NETFLAT

Hệ thống Netflat sử dụng **PostgreSQL** kết hợp với **Prisma ORM** để định nghĩa mô hình thực thể (Entity Relationship). Các bảng (Table) được thiết kế chuẩn hóa để tối ưu tốc độ đọc (Read-heavy) phù hợp với một ứng dụng Video Streaming.

Dưới đây là đặc tả các bảng (Tables) chính tạo nên "khung xương" dữ liệu của dự án.

---

## 1. BẢNG `Users` (Quản lý Tài khoản)
Lưu trữ thông tin xác thực và hồ sơ của người dùng (kể cả User thường và Admin).

| Tên trường (Field) | Kiểu dữ liệu | Khóa (Key) | Mô tả & Ràng buộc (Constraints) |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | **PK** | Mã định danh duy nhất (tự động tạo (cuid)). |
| `email` | String | Unique | Email đăng nhập. Bắt buộc (Not Null). |
| `password` | String | | Chuỗi mật khẩu đã được băm (hashing bằng bcrypt). |
| `name` | String | | Tên hiển thị công khai. Có thể NULL. |
| `role` | Enum | | Vai trò: `USER` hoặc `ADMIN`. Mặc định: `USER`. |
| `status` | Enum | | Mặc định: `ACTIVE`. Bị quản trị khóa sẽ thành `BANNED`. |
| `createdAt` | DateTime | | Dấu thời gian tạo bản ghi. |
| `updatedAt` | DateTime | | Dấu thời gian mỗi lần cập nhật bản ghi. |

---

## 2. BẢNG `Movies` (Kho Phim - Siêu dữ liệu)
Đóng vai trò là bảng trung tâm nhất. Lưu ý: Video file thực tế nằm ở máy chủ MinIO, bảng này **chỉ lưu đường link nối (URL)** để tham chiếu.

| Tên trường (Field) | Kiểu dữ liệu | Khóa (Key) | Mô tả & Ràng buộc (Constraints) |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | **PK** | Mã định danh duy nhất của phim. |
| `title` | String | | Tên hiển thị (Tiêu đề). |
| `slug` | String | Unique | Tên chuẩn hóa dùng cho đường dẫn URL (VD: `sao-hoa-nguc`). |
| `description` | Text | | Tóm tắt nội dung phim. |
| `releaseYear` | Int | | Năm phát hành (Ví dụ: 2026). |
| `duration` | Int | | Thời lượng phim (tính bằng phút). |
| `director` | String | | Tên đạo diễn. |
| `actors` | String | | Danh sách diễn viên chính (Lưu dạng chuỗi cách bằng dấu phẩy hoặc mảng JSON). |
| `status` | Enum | | Trạng thái vòng đời Video: `DRAFT`, `PENDING_MEDIA`, `PROCESSING`, `READY`, `FAILED`. |
| `posterUrl` | String | | Đường dẫn ảnh Thumbnail (Trỏ tới máy chủ MinIO). |
| `videoUrl` | String | | Đường dẫn file Video stream MP4/HLS (Trỏ tới máy chủ MinIO). |
| `createdAt` | DateTime | | |
| `updatedAt` | DateTime | | |

---

## 3. BẢNG `Genres` (Quản lý Thể loại)
Bảng độc lập quy định các thuộc tính thể loại (Ví dụ: Hành động, Hài hước, Kinh dị).

| Tên trường (Field) | Kiểu dữ liệu | Khóa (Key) | Mô tả & Ràng buộc (Constraints) |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | **PK** | Định danh thể loại. |
| `name` | String | Unique | Tên thể loại. |
| `description` | String | | Mô tả danh mục (tùy chọn). |

---

## 4. BẢNG KẾT NỐI `MovieGenres` (Nhiều - Nhiều / Many-to-Many)
Một phim có thể thuộc nhiều thể loại (Ví dụ: "Terminator" vừa là Hành động vừa là Viễn tưởng). Một thể loại có thể gắn cho nhiều phim.

| Tên trường (Field) | Kiểu dữ liệu | Khóa (Key) | Mô tả & Ràng buộc (Constraints) |
| :--- | :--- | :--- | :--- |
| `movieId` | UUID | **FK / PK** | Trỏ tới bảng `Movies (id)`. Cú pháp Cascade Delete. |
| `genreId` | UUID | **FK / PK** | Trỏ tới bảng `Genres (id)`. Cú pháp Cascade Delete. |

*(Chú thích: Khi xóa một bộ phim trong hệ thống, cặp khóa `movieId` trong bảng này cũng tự động bị xóa nhờ lệnh xóa xếp tầng - ON DELETE CASCADE)*

---

## 5. BẢNG `Reviews` (Đánh giá của Người xem)
Lưu trữ nội dung chấm sao và bình luận của user đối với 1 bộ phim cụ thể.

| Tên trường (Field) | Kiểu dữ liệu | Khóa (Key) | Mô tả & Ràng buộc (Constraints) |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | **PK** | Định danh bình luận. |
| `movieId` | UUID | **FK** | Đánh giá này thuộc về phim nào -> `Movies (id)`. |
| `userId` | UUID | **FK** | Ai là người viết bình luận này -> `Users (id)`. |
| `rating` | Int | | Số sao (Giá trị từ 1 đến 5). |
| `content` | Text | | Đoạn nhận xét bằng chữ. |
| `createdAt` | DateTime | | Ngày đăng bình luận. |

*(Ràng buộc mức nghiệp vụ: Mỗi User chỉ được phép tạo đúng 1 bản ghi Review cho 1 bộ phim. Khóa phức hợp `Unique(userId, movieId)`).*

---

## 6. BẢNG `Favorites` (Danh sách yêu thích cá nhân hóa)
Giải quyết bài toán "My List" - Lưu trữ phim mà User thêm vào giỏ xem sau.

| Tên trường (Field) | Kiểu dữ liệu | Khóa (Key) | Mô tả & Ràng buộc (Constraints) |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | **PK** | Chữ ký định danh record. |
| `userId` | UUID | **FK** | Thuộc về User nào -> `Users (id)`. |
| `movieId` | UUID | **FK** | Chọn Phim nào -> `Movies (id)`. |
| `createdAt` | DateTime | | Ngày giờ User bấm "Tim" bộ phim này. |

*(Bảng này sử dụng chiến lược khóa ngoại liên kết yếu hoặc Index `(userId, movieId)` để truy vấn cực nhanh khi User truy cập tab thư viện Favorites).*

---

## 7. MÔ HÌNH THỰC THỂ KẾT NỐI (ERD SUMMARY)
Nếu vẽ biểu đồ Entity Relationship Diagram (ERD):
* Bảng trung tâm là **Movies**.
* Bảng **Users** có quan hệ 1-N (One-to-Many) với bảng **Reviews** (Một người dùng viết được nhiều bình luận).
* Bảng **Users** có quan hệ 1-N (One-to-Many) với bảng **Favorites** (Một người yêu thích nhiều phim).
* Bảng **Movies** có quan hệ N-N (Many-to-Many) với **Genres** thông qua bảng nối **MovieGenres**.
* Đặc biệt, thuộc tính `videoUrl` của bảng Movies không phải khóa ngoại, mà là một String URI trỏ ra máy chủ bên ngoài (MinIO Storage) - Đây là minh chứng cho việc phân tách tài nguyên tĩnh hoàn hảo.