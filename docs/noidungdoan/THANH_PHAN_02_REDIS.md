# PHÂN TÍCH THÀNH PHẦN: REDIS (IN-MEMORY CACHE & MESSAGE QUEUE)

## 1. Redis là gì?
Redis (Remote Dictionary Server) là một hệ thống lưu trữ cấu trúc dữ liệu trên bộ nhớ RAM (In-memory data structure store). Vì trên RAM, tốc độ đọc/ghi của Redis nhanh gấp hàng vạn lần so với ổ đĩa cứng hoặc cơ sở dữ liệu truyền thống. 

## 2. Vai trò của Redis trong Netflat
Redis đóng vai trò là "Nhà điều phối các tác vụ ngầm" (Background Job Broker) vô cùng quan trọng, giúp hệ thống không bị sập khi thực hiện việc mã hóa (Encode) Video, cũng như được dùng làm bộ nhớ đệm (Cache) nếu cần.

Hai nhiệm vụ lớn nhất của Redis trong Netflat:
1.  **Hàng đợi Công việc (Message Queue / Job Queue):** Được ứng dụng kết hợp với thư viện `BullMQ` (trên NestJS). Nó giống như hệ thống máy lấy số thứ tự tại ngân hàng. Khi có hàng trăm Video cần upload, Redis sẽ bắt chúng xếp hàng và chia cho nhân viên làm dần.
2.  **Sự trơn tru (Non-blocking):** Nhờ có Redis, Admin sau khi ấn nút "Upload Video", hệ thống sẽ chỉ ném nhiệm vụ đó cho Redis nhớ, rồi phản hồi lại ngay lập tức "Upload Thành Công!", trình duyệt không hề bị treo. 

## 3. Cách thức hoạt động và Mối liên quan trong quy trình lưu Video
Đây chính là chìa khóa của "Video Pipeline". Mối quan hệ được trình bày như sau:
*   **Với Giao diện Admin:** Admin upload File -> Web gọi qua NestJS API.
*   **Với NestJS API (Người tạo việc - Producer):** NestJS nhận lệnh, nó không tự mình đi mã hóa phim luôn. Thay vào đó, API chạy hàm `queue.add('process-video', { videoId: 123 })` bắn dữ liệu này sang nhét vào RAM của máy chủ Redis.
*   **Với NestJS Worker (Người làm việc - Consumer):** Các luồng worker chạy ngầm của máy chủ sẽ liên tục "hỏi" Redis: *"Có việc gì không?"*. Redis trả về cái công việc `videoId: 123` đang bị xếp hàng. Worker nhận lấy đem đi xử lý thành một file chuẩn và đẩy sang MinIO.
*   **Tại sao lại cần Redis?** Nếu mất điện, Worker (Nhân viên) đứt kết nối hoặc sập ứng dụng, thì mẩu giấy dán ghi công việc `videoId: 123` VẪN CÒN trên Redis. Lúc có điện, Worker lên mạng và lại lấy công việc đó làm tiếp (Khả năng chịu lỗi - Fault tolerance).