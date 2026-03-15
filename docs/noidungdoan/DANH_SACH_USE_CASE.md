# DANH SÁCH USE CASE & ĐẶC TẢ NGHIỆP VỤ HỆ THỐNG NETFLAT

Tài liệu này tổng hợp toàn bộ các Use Case (Ca sử dụng) của hệ thống phân chia theo từng nhóm người dùng (Actor). Bạn sử dụng nội dung này để đưa vào Báo cáo đồ án (Phần Thiết kế hệ thống).

---

## 1. CÁC TÁC NHÂN (ACTORS) TRONG HỆ THỐNG

Hệ thống Netflat được phân quyền dành cho 2 nhóm đối tượng tác nhân chính:
1.  **Người dùng cuối (User/Client - Web App):** Những người truy cập hệ thống để tìm kiếm, đăng ký tài khoản, xem phim và tương tác.
2.  **Quản trị viên (Admin - Admin Portal):** Nội bộ nhà cung cấp, đóng vai trò vận hành, cập nhật phim, giám sát video pipeline và quản lý lượng người dùng.

---

## 2. NHÓM USE CASE DÀNH CHO NGƯỜI DÙNG QUẢN TRỊ (ADMIN)

Đây là các nghiệp vụ thiết yếu tại cổng `Next.js Admin` (Port 3001) phục vụ công tác điều hành hệ sinh thái VOD.

### UC_AD_01: Quản lý Thông tin Phim (Movie Metadata Management)
*   **Mô tả:** Admin có thể tạo mới (Create), sửa đổi (Update) hoặc xóa bỏ (Delete/Unpublish) các thông tin văn bản (Metadata) của 1 bộ phim như Tên phim, Thể loại, Diễn viên, Năm sản xuất, Đạo diễn.
*   **Tiền điều kiện:** Admin đã đăng nhập thành công.
*   **Luồng chính:** Admin điền form thông tin. Bấm nút Lưu -> Gọi API để lưu dữ liệu văn bản vào bảng `Movies` trong Database PostgreSQL.

### UC_AD_02: Cập nhật Media & Tài nguyên (Media Pipeline Control)
*   **Mô tả:** Admin tiến hành upload Poster đại diện và đặc biệt là file MP4 Video nguồn đối với bộ phim đang bị thiếu (PENDING).
*   **Luồng chính (Upload Video):** 
    1. Drag/drop file video vào khung tải lên. 
    2. API nhận file truyền thẳng lên MinIO S3 (Streaming) và lập tức tạo mốc trạng thái "Đang xử lý". 
    3. Hàng đợi Redis nhận lệnh và Worker bắt đầu chuyển mã Encode băng thông (Chạy ngầm).
*   **Kết quả:** File video đã lọt qua kho MinIO chính, phim chuyển sang trạng thái "Sẵn Sàng" (READY) cho phép Stream.

### UC_AD_03: Quản lý Thể loại (Genre Management)
*   **Mô tả:** Thêm, xóa, chỉnh sửa các danh mục Thể loại (Hành động, Hài, Viễn tưởng...) để hệ thống tự động gán Tag vào phim tương ứng để người dùng ở web bộ lọc dễ dàng.

### UC_AD_04: Quản trị Hệ thống Tài khoản (User Dashboard)
*   **Mô tả:** Admin truy cập màn hình Danh sách User, giám sát tổng lượng người dùng đã xuất hiện (Registration List).
*   **Luồng chính:** Admin có quyền thực thi nghiệp vụ Cấm người dùng (Ban/Block user) nếu phát hiện hành vi xấu, để chặn quyền đăng nhập của họ ở phiên Web Client.

### UC_AD_05: Theo dõi Tổng quan Hệ thống (Dashboard Analytics)
*   **Mô tả:** Cập nhật Live số liệu thông qua biểu đồ: Bao nhiêu phim đang có, lượng User đăng ký mới, số video đang xử lý hiện tại trong Queue.

---

## 3. NHÓM USE CASE DÀNH CHO NGƯỜI DÙNG CUỐI (USER)

Đây là các tác vụ phát sinh từ màn hình của Trang Xem phim (`Next.js Web` - Port 3002).

### UC_US_01: Xác thực & Đăng nhập (Auth)
*   **Mô tả:** Khách hàng tiến hành đăng ký tài khoản (Tạo bản ghi mới trong Postgres) và Đăng nhập. Hệ thống sẽ phát hành và quản lý phiên thông qua cơ chế JWT Token (Stateless).

### UC_US_02: Trải nghiệm Nguồn cấp Phim (Discover/Browse)
*   **Mô tả:** Khi User vào Trang chủ, hệ thống hiển thị danh sách phim theo dạng Carousel cuộn ngang. Các phim được ưu tiên hiển thị theo "Phim nổi bật", "Phim Hành động", "Phim Mới cập nhật" nhờ cơ chế phân trang.

### UC_US_03: Tìm kiếm Nội dung (Search & Filter)
*   **Mô tả:** Cho phép User sử dụng thanh tìm kiếm để gõ từ khóa tóm tắt (Tên phim/Diễn viên/Thể loại) -> API sử dụng truy vấn RegEx SQL để tìm mút chính xác.

### UC_US_04: Xem và Trải nghiệm Trình phát (Video Streaming)
*   *Đây là Use Case Cốt lõi của Client.*
*   **Mô tả:** User click vào phim, hệ thống gọi API để lấy Video URL tĩnh trên Object Storage (MinIO). Trình xem phim (Video Player) chạy mượt mà ngay trên PC/Mobile nhờ tính năng Stream Range Bytes (Chỉ tải tới đâu chạy tới đó - không phải đợi nguyên tệp).

### UC_US_05: Cá nhân hóa: Lịch sử Xem (History) & Theo dõi (Favorites)
*   **Mô tả:** Bấm nút "Yêu thích / Trái tim" trên ảnh phim -> Hệ thống bắn API lập bản ghi Mapping giữa `User_id` và `Movie_id`. Từ đó, User có Thư viện riệng nằm ở mục (My List).
*   *Mở rộng:* Ghi nhớ tiến trình xem phim (Ví dụ người dùng đã xem tới phút 40) - gọi là "Continue Watching".

### UC_US_06: Tương tác Mạng Xã hội (Reviews & Rating)
*   **Mô tả:** User có thể chấm sao (Rating 1-5) và Viết bình luận (Review) trên chính màn hình xem video. Dữ liệu này được làm tươi (Refresh) theo dạng Inline Text, giúp người khác trên mạng lập tức thấy ý kiến của User này.

---

## 4. TỪ VỰNG KHI VẼ BIỂU ĐỒ (CHO PLANTUML / DRAW.IO)
Nếu bạn có dự định vẽ hình đồ họa cho file báo cáo:
*   Mũi tên `<<include>>`: Ví dụ Use Case `Đánh giá phim` hoặc `Thêm vào Yêu thích` bắt buộc phải `<<include>>` Use Case `Đăng nhập`. (Tức là phải đăng nhập mới làm được).
*   Mũi tên `<<extend>>`: Từ Use Case `Xem danh sách phim` có thể `<<extend>>` ra tính năng `Tìm kiếm nhanh` (Option tùy ý người dùng).