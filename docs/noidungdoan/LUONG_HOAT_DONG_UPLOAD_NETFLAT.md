# LUỒNG HOẠT ĐỘNG: UPLOAD PHIM VÀ CƠ CHẾ XỬ LÝ (UPLOAD PIPELINE)

Đây là điểm làm nên sự khác biệt giữa Netflat và các mô hình quản lý Web thông thường. Vấn đề lớn nhất khi Upload tập tin đa phương tiện lên máy chủ là "tính đồng bộ (Synchronous)". Nghĩa là nếu làm theo cách bình thường, một video 2GB khi bấm tải lên thì cả hệ thống Front-end và Back-end phải dừng lại ôm chầm lấy file đó chờ xử lý xong mới trả trang về.

Để tránh bị nghẽn hệ thống (Bottleneck), Netflat sử dụng Luồng thiết kế **Idempotency Upload Pipeline (Xử lý Bất đồng bộ)** thông qua Redis Queue.

---

## 1. CÁC BƯỚC HOẠT ĐỘNG CỦA LUỒNG UPLOAD PHIM

Luồng được chia làm 2 giai đoạn (Giai đoạn Chặn (Blocking) & Giai đoạn Không chặn (Non-Blocking)) để đảm bảo UX cho Admin. 

### Bước 1: Admin tạo Phim (Metadata)
*   **Hành động Admin:** Admin điền form "Thêm mới phim" với Tên phim, đạo diễn, mô tả. 
*   **Backend NestJS:** Chỉ lưu vào CSDL PostgreSQL một dòng text (`Status = PENDING`). Đây là quá trình siêu nhẹ. 

### Bước 2: Admin tải file Video qua Form
*   **Hành động Admin:** Nhấn chọn một tệp MP4 có dung lượng lớn.
*   **API Gateway (Port 3000):** NestJS nhận lệnh Upload file dạng `multipart/form-data`.
*   **Bơm file lên MinIO:** Thay vì lưu tệp MP4 này vào đĩa cứng (Vd ổ C:/ của Server Nodejs), API tạo ra các gói Streams (Dòng chảy sự kiện rỗng) đẩy luồng byte chạy thẳng sang máy chủ MinIO vào Bucket tên là `Media`. Hành động này tốn băng thông đường truyền nhưng không chiếm dụng ổ cứng lưu trữ của Server 3000.  

### Bước 3: Đẩy "Chỉ thị" vào Hàng đợi Redis (Queue) 
*   **Backend NestJS:** Khi MinIO báo *"Tôi đã nhận file MP4 nháp xong!"*, NestJS tiếp tục thực hiện 2 việc cùng một tích tắc:
    *   Sửa trạng thái Data trong PostgreSQL thành `Status = PROCESSING`.
    *   Phát ra một tờ điều lệnh chứa ID của Video được gắn cho máy chủ `Redis` trên gói `BullMQ`: (Ví dụ lệnh `"Thằng worker nào đi vào MinIO lấy file video này ra xử lý cho tao!"`).
*   **Phản hồi Web:** NestJS LẬP TỨC trả kết quả HTTP 200 OK - 'Tải file thành công' về cho máy tính của Admin. Trình duyệt Admin được giải phóng, có thể chuyển qua màn hình khác làm việc tiếp.

### Bước 4: Chạy ngầm (Background Worker)
*   Bây giờ việc thuộc về cỗ máy xử lý nền. `BullMQ Worker` của NestJS chuyên cắm rễ đọc số thứ tự bên trong `Redis`. Nó thấy Tờ chỉ lệnh của Bước 3 liền chộp lấy.
*   **Quy trình Worker chạy:** Nó kết nối sang MinIO. Kiểm tra Video này có lỗi không, độ dài Video, các thao tác mô phỏng đóng gói Video (nếu làm thật thì cắm thêm FFmpeg để nén Encode thành HLS/M3U8).

### Bước 5: Chốt sổ (Ready to Stream)
*   Khi Worker (Code ngầm) đã báo đóng gói phim ngon nghẻ, nó quay về PostgreSQL cập nhật dữ liệu lần cuối `Status = READY`. 
*   Lúc này tính năng Polling của phía khách (Admin có thể F5 lại màn hình) sẽ thấy hiển thị "Video đã sẵn sàng để phát!". Dưới Web Client, người dùng đã thấy nút Play.

---

## 2. ƯU ĐIỂM "ĂN TIỀN" CỦA LUỒNG NÀY (CHO VIỆC BẢO VỆ)

*   **Idempotency (Tính Lặp An Toàn):** Đây là thuật ngữ kỹ thuật, nếu giữa lúc luồng đang trong **Bước 4**, nhà mạng cúp điện máy chủ, Video đang xử lý dở dang sẽ ra sao? 
    *   Với Web thông thường: Lỗi đơ phim vĩnh viễn, Admin phải vào tự xóa dữ liệu Rác upload lại.
    *   Với Netflat: Khi có điện lại, Redis vẫn còn lưu tờ lệnh bị "Miss". Nó sẽ ném lại cho Worker mới để thực thi lệnh đó. Luồng này sẽ tự động loại bỏ rác cũ và thay đồ lại mới. Đó là tính chịu lỗi đỉnh cao của Background Job.
*   **Độ Mượt Mà hệ thống:** Backend chỉ làm một tác vụ đó là Nhận - Chuyển Tiếp chứ không ôm quá trình "Nén Video". Do đó hàng trăm truy cập (Users) khác đang vào coi web không bị chậm (Do API Nodejs chỉ có cơ chế Đơn luồng).