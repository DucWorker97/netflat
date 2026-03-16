# PHÂN TÍCH THÀNH PHẦN: NEXT.JS (GIAO DIỆN / FRONTEND)

## 1. Next.js là gì?
Next.js là một Framework tiên tiến nhất hiện nay (do Vercel tạo ra) xây dựng dựa trên React library (Thư viện UI của Facebook). Khác với React truyền thống là một "Single Page Application" xử lý các thẻ code HTML bằng JavaScript trên trình duyệt của máy khách (Client-Side Rendering), Next.js cung cấp khả năng Render HTML trực tiếp từ phía máy chủ (Server-Side Rendering).

## 2. Vai trò của Next.js trong Netflat
Dự án Netflat sử dụng cùng lúc 2 ứng dụng Next.js độc lập để phục vụ 2 mục đích mặt tiền:
1.  **Client Web (Cổng 3002):** Chứa các giao diện (Layout / DOM) tối màu cực đẹp để show danh sách phim, khu vực Player phát video trực tuyến, bình luận theo thời gian thực. (UX/UI dành cho khách).
2.  **Admin Web (Cổng 3001):** Bảng điều khiển (Dashboard) mang tính thống kê. Tạo ra các hệ thống Drag & Drop form tải video phức tạp.

## 3. Cách thức hoạt động và Mối liên quan
Vì sao lại dùng 2 Nextjs độc lập? => Là vì chúng cung cấp ưu điểm tuyệt đối sau đây: 
*   **Next.js Server Side Rendering (SSR) & Search Engine:** Đối với các cổng xem Video online như Netflat cần kiếm view và share lên Facebook, thì việc link phim được hiện ảnh Thumbnail khi gửi qua Messenger là cực quan trọng. Máy chủ Next.js App Web sẽ chủ động gọi vào `Cổng 3000 NestJS API` để lấy ra Text Tên phim và Link Poster -> Tiến hành Render ra chuỗi mã HTML nhét các thẻ `og:image` vào thẻ `head` -> Phóng ngược về màn hình các công cụ Crawl của Google và Facebook. Tốc độ xuất hiện cực nhanh.
*   **Hỗ trợ tính năng Đa ngôn ngữ (i18n):** Tích hợp công cụ dịch ngôn ngữ từ file `.json`. Đổi văn bản Tiếng Anh thành văn bản Tiếng Việt trên giao diện Client và Admin ở thời gian tức thì.
*   **Mối liên đới trong Pipeline Video:** Bảng điều khiển Admin sử dụng Next.js Router để cung cấp trải nghiệm chuyển trang siêu tốc, điều hướng công nghệ Form-Action để nhét file đẩy thẳng các biến Buffer (tệp Mp4 nặng) về phía API NestJS mà không bị vỡ lỗi bộ nhớ RAM (Memory Leak). Kết hợp các thư viện React Hook Form giúp rà soát định dạng text của form tại chỗ.