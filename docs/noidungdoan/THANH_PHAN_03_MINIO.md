# PHÂN TÍCH THÀNH PHẦN: MINIO (OBJECT STORAGE)

## 1. MinIO là gì?
MinIO là một máy chủ lưu trữ đối tượng (Object Storage Server) mã nguồn mở siêu tốc độ, được thiết kế để tương thích 100% với chuẩn giao tiếp của Amazon S3 (AWS S3 APi). 
Khác với việc lưu trữ tệp (File Storage) theo từng thư mục nhánh cây truyền thống, Object Storage lưu mọi file dưới dạng một "đối tượng" duy nhất kèm theo ID trong các "thùng rác" (Bucket). 

## 2. Vai trò của MinIO trong Netflat
Dự án Netflat sử dụng MinIO làm Kho lưu trữ toàn bộ các Tệp Tĩnh / Dữ liệu phi cấu trúc (Unstructured Data) với dung lượng lớn. Cụ thể:
*   Mọi tệp hình ảnh: Ảnh đại diện (Avatar), Ảnh bìa phim (Poster, Thumbnail).
*   Mọi tệp Media: File Video thô do Admin định dạng MP4 chuyển lên.
*   File Video đích: Các file Video đã được trích xuất hoàn thiện chuẩn bị truyền đi (Stream) cho luồng phát video trên web cho người dùng xem. 

## 3. Cách thức hoạt động và Mối liên quan
MinIO giống như nhà kho độc lập có cửa riêng rẽ trong kiến trúc này.
*   **Mối liên quan với Backend NestJS:** Thay vì ghi tệp tin vào thư mục source code (như `public/uploads`), mọi API upload trên NestJS đều sử dụng công cụ SDK (`aws-sdk/client-s3`) mở một luồng dữ liệu (Stream) truyền các luồng byte nhận được lên thẳng MinIO. API không giữ lại chút dung lượng file nào trên máy chủ.
*   **Mối liên quan với Frontend Next.js:** Khi Frontend Next.js render (hiển thị) giao diện, đường link của ảnh bìa (Poster) sẽ lấy từ DB ra, có dạng là `http://localhost:9002/netflat-media/poster_1.jpg`. Frontend sẽ load thẳng ảnh từ máy chủ cổng 9002 (Của MinIO) chứ không chạy xuyên qua máy chủ tải cổng 3000 (Cổng của NestJS/API). 
*   **Tối ưu cho Video Streaming:** MinIO hỗ trợ hoàn hảo chuẩn HTTP Range Requests. Nghĩa là trình phát video của hệ thống có thể tùy ý gọi *"Đưa cho tôi dữ liệu từ giây thứ 10 đến giây 20 của phim này"*, MinIO sẽ cắt đúng bấy nhiêu byte để thả về cho trình duyệt. Mọi thứ được phân bổ cực kì hiệu quả và tiết kiệm băng thông.