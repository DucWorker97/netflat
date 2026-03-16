# GỢI Ý VIẾT NỘI DUNG CHƯƠNG 1: TỔNG QUAN VỀ HỆ THỐNG VIDEO VOD

Tài liệu này cung cấp các đoạn văn mẫu, ý tưởng và gạch đầu dòng chi tiết để bạn có thể copy/paste hoặc dựa vào đó viết Chương 1 cho Báo cáo Đồ án.

---

## 1.1. Hiện trạng và xu hướng của các hệ thống Video Streaming

**Ý tưởng cho mục 1.1.1: Sự bùng nổ của dịch vụ VOD**
*   **Mở bài:** Trong kỷ nguyên chuyển đổi số hiện nay, phương thức tiêu thụ nội dung giải trí của con người đã thay đổi hoàn toàn. Thay vì lệ thuộc vào lịch phát sóng cố định của truyền hình truyền thống, khán giả chuyển sang các nền tảng VOD (Video On Demand - Video theo yêu cầu).
*   **Ví dụ thực tế:** Sự thành công của Netflix, Amazon Prime hay Disney+ minh chứng cho việc người dùng sẵn sàng chi trả cho trải nghiệm xem phim không quảng cáo, chất lượng cao và có thể xem mọi lúc, mọi nơi.
*   **Dẫn dắt vào đề tài:** Nhận thấy tiềm năng và sự thú vị nhưng cũng đầy thách thức về mặt kỹ thuật của nền tảng VOD, đề tài "Nghiên cứu và xây dựng hệ thống cung cấp dịch vụ Video Streaming" (Netflat) được lựa chọn để thực hiện. Dù chỉ là phiên bản thu nhỏ so với hệ thống thực tế tỷ đô, đề tài vẫn áp dụng các chuẩn kiến trúc hiện đại nhất.

**Ý tưởng cho mục 1.1.2: Các thách thức kỹ thuật trong việc phân phối nội dung đa phương tiện**
*   **Nêu vấn đề:** Truyền tải văn bản (Text) hoặc hình ảnh (Image) rất đơn giản, nhưng truyền tải file Video lên tới hàng Gigabyte là một câu chuyện hoàn toàn khác.
*   **Độ trễ và Băng thông:** Phải giải bài toán làm sao người dùng có thể bấm "Play" là xem được ngay mà không cần tải nguyên cả một file video dung lượng khổng lồ.
*   **Quá tải Server:** Tích hợp tính năng Upload Video cho Admin mà không làm "treo" (blocking) Server. Phải dùng cơ chế xử lý nền (Background Job).
*   **Lưu trữ:** File video rất tốn dung lượng ổ cứng, không thể lưu chung trong Database hay thư mục gốc của Source code.

---

## 1.2. Khảo sát nghiệp vụ hệ thống Netflat

**Ý tưởng cho mục 1.2.1: Nghiệp vụ đối với Người dùng (Client / User)**
*Phân tích như một người dùng thông thường bước vào rạp chiếu phim online.*
*   **Đăng nhập/Đăng ký:** Bảo mật với chuẩn JWT.
*   **Khám phá nội dung:** Trang chủ hiển thị danh sách phim theo thể loại, phim mới ra mắt, xu hướng.
*   **Trải nghiệm xem:** Trình phát video (Video Player) có khả năng Stream video mượt mà hỗ trợ tua nhanh, tua lại.
*   **Tương tác cộng đồng:** Để lại đánh giá (Review/Rating) trực tiếp, lưu lại danh mục phim yêu thích (Favorites).

**Ý tưởng cho mục 1.2.2: Nghiệp vụ đối với Quản trị viên (Admin)**
*Đóng vai trò là nhà mạng cung cấp phim.*
*   **Quản lý Metadata:** Thêm mới, chỉnh sửa thông tin mô tả, năm phát hành, đạo diễn, thể loại phim.
*   **Quy trình tải Media (Media Pipeline):** Đây là nghiệp vụ cốt lõi. Upload Poster (ảnh bìa) và Upload Video gốc.
*   **Giám sát trạng thái mã hóa:** Theo dõi được tiến trình file Video đang ở trạng thái nào (Đang tải lên -> Đang chờ mã hóa -> Đang xử lý -> Sẵn sàng phát).

---

## 1.3. Đánh giá về lựa chọn kiến trúc phần mềm

**Ý tưởng cho mục 1.3.1: Nhược điểm của kiến trúc Monolith (Nguyên khối) trong hệ thống Video**
*   **Khái niệm Monolith:** Trong các đồ án web thông thường (như web bán hàng), Front-end, Backend và nơi lưu file thường được đặt trên cùng một máy chủ (Server).
*   **Tại sao lại thất bại đối với VOD?** 
    *   Tham chiếu tài nguyên lớn: Khi có hàng ngàn User tải video cùng lúc, CPU và RAM của Server Backend sẽ bị ăn cạn kiệt, dẫn đến sập web.
    *   Lưu file cục bộ: Phim tải lên thư mục `public/uploads` của mã nguồn sẽ làm kích thước dự án phình to, khó khăn khi chuyển máy chủ (Clone/Scale).
    *   Xử lý đồng bộ (Synchronous): Khi tài khoản Admin bấm Upload tệp 2GB, trình duyệt sẽ xoay vòng vòng chờ phản hồi từ Server. Server bận ghi file nên không thể phục vụ User khác.

**Ý tưởng cho mục 1.3.2: Đề xuất mô hình phân tán nghiệp vụ cho Netflat**
*Chốt lại cách giải quyết bằng hệ thống của bạn.*
*   **Tách Frontend và Backend:** API (NestJS) và Giao diện (Next.js) nằm ở các Port riêng biệt.
*   **Thuê kho chứa riêng (MinIO):** Áp dụng Object Storage. Video và hình ảnh được đẩy thẳng sang máy chủ MinIO, giảm tải 100% dung lượng lưu trữ cho máy chủ API.
*   **Tuyển công nhân làm ban đêm (Redis & Message Queue):** Áp dụng kiến trúc luồng xử lý bất đồng bộ. Khi upload, API báo "Thành công" lập tức và đẩy công việc nén/lưu video sang cho một hệ thống chạy ngầm (Worker) làm việc từ từ. Đảm bảo UI luôn mượt mà.
