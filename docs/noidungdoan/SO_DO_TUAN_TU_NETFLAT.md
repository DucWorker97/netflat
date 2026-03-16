# CÁC BIỂU ĐỒ TUẦN TỰ (SEQUENCE DIAGRAMS) HỆ THỐNG NETFLAT

Tài liệu này cung cấp mã nguồn dạng PlantUML/Mermaid để vẽ Biểu đồ Tuần tự (Sequence Diagram). Bạn có thể copy mã nguồn này dán vào các trang web như `planttext.com` hoặc `mermaid.live` để render ra hình ảnh biểu đồ chèn vào file Word báo cáo đồ án.

---

## 1. Biểu đồ Tuần tự: Quy trình Xác thực & Đăng nhập (Auth Flow)
Biểu đồ này mô tả cách JWT Token được sinh ra và cấp phép cho người dùng truy cập an toàn.

**Đoạn mã Mermaid:**
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant Web as Next.js Web (Client)
    participant API as NestJS API (Backend)
    participant DB as PostgreSQL (Database)

    User->>Web: Nhập Email & Password
    Web->>API: POST /api/auth/login (email, password)
    API->>DB: Lấy User bằng Email
    DB-->>API: Trả về User (kèm Hash mật khẩu)
    
    alt Email không tồn tại hoặc Mật khẩu sai
        API-->>Web: 401 Unauthorized (Sai thông tin)
        Web-->>User: Hiển thị thông báo lỗi
    else Thông tin hợp lệ
        API->>API: Generate JWT Token (Ký bằng Secret Key)
        API-->>Web: 200 OK (Trả về AccessToken)
        Web->>Web: Lưu Token vào Cookie/Local Storage
        Web-->>User: Chuyển hướng vào Trang chủ thành công
    end
```

---

## 2. Biểu đồ Tuần tự: Quy trình Admin Upload File & Xử lý Nền (Upload Pipeline)
Đây là biểu đồ quan trọng nhất thể hiện sức mạnh kiến trúc bất đồng bộ (Asynchronous) của Netflat.

**Đoạn mã Mermaid:**
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant AdminWeb as Next.js Admin
    participant API as NestJS API
    participant MinIO as MinIO Storage
    participant DB as PostgreSQL
    participant Redis as Redis Job Queue
    participant Worker as Background Worker

    Admin->>AdminWeb: Chọn File MP4 và bấm Upload
    AdminWeb->>API: POST multipart/form-data (File Stream)
    
    rect rgb(200, 220, 240)
        note right of API: BƯỚC NON-BLOCKING (BẤT ĐỒNG BỘ)
        API->>MinIO: Pipe (Bơm byte liên tục) qua S3 Client (Bucket Draft)
        MinIO-->>API: Xác nhận Upload thành công (Trả URL tạm)
        API->>DB: Cập nhật Movie.status = PROCESSING
        API->>Redis: queue.add('video-job', { movieId })
        API-->>AdminWeb: 200 OK (Video đang xử lý)
        AdminWeb-->>Admin: Hiển thị thanh trạng thái "Đang xử lý"
    end
    
    rect rgb(230, 240, 200)
        note right of Worker: BƯỚC RẼ NHÁNH XỬ LÝ NỀN CHẠY ĐỘC LẬP
        Worker->>Redis: Listen() nhận Job { movieId }
        Worker->>MinIO: Lấy Video tạm xuống Local Buffer
        Worker->>Worker: Mô phỏng Check format / Mã hóa (Encode)
        Worker->>MinIO: Upload Video đích (Bucket ChiNHTHhUC)
        Worker->>DB: Cập nhật Movie.status = READY + videoUrl
        Worker->>Redis: Xóa Job (Hoàn thành)
    end
```

---

## 3. Biểu đồ Tuần tự: Quy trình Stream (Xem phim)
Biểu đồ này giải thích cách người dùng stream phân đoạn bằng giao thức `HTTP 206 Partial Content`.

**Đoạn mã Mermaid:**
```mermaid
sequenceDiagram
    autonumber
    actor User as Khán giả
    participant Client as Trình phát Video (Browser)
    participant Web as Next.js Web
    participant MinIO as MinIO Storage

    User->>Web: Bấm vào Phim "Sao Hỏa Ngục"
    Web-->>User: Tải UI, có thẻ <video src="http://minio/phim.mp4">
    User->>Client: Ấn PLAY
    
    note right of Client: STREAMING QUA HTTP RANGE
    Client->>MinIO: HTTP GET Header: Range: bytes=0-1000000 (Xin 1MB đầu)
    MinIO-->>Client: HTTP 206 Partial Content (Kèm 1MB dữ liệu)
    Client->>Client: Play hình ảnh ra màn hình
    
    note over User, Client: Dựa vào tốc độ mạng, Client liên tục xin thêm!
    Client->>MinIO: HTTP GET Header: Range: bytes=1000001-2000000 
    MinIO-->>Client: HTTP 206 Partial Content
    
    User->>Client: TUA NHANH TỚI PHÚT THỨ 60
    Client->>MinIO: HTTP GET Header: Range: bytes=15000000-... (Bỏ qua đoạn giữa)
    MinIO-->>Client: HTTP 206 Partial Content (Đoạn byte ở phút 60)
    Client->>Client: Ghép byte và tiếp tục phát
```

---

## 4. Biểu đồ Tuần tự: Đánh giá phim (Review Inline)
Quy trình gửi nhận xét và cập nhật trạng thái làm tươi ngay dưới trình phát chiếu của ứng dụng.

**Đoạn mã PlantUML (nếu cần vẽ bằng Text truyền thống):**
Mã này dành cho công cụ PlantUML (Dùng cú pháp khác xíu so với Mermaid).
```plantuml
@startuml
actor User
participant "Giao diện Video" as UI
participant "API Server" as API
participant "PostgreSQL" as DB

User -> UI : Gõ Text + Chọn 5 Sao
UI -> API : POST /api/movies/{id}/reviews (Token, text, sao)
API -> API : Parse JWT xác thực danh tính
API -> DB : Check: User đã review phim này chưa?
alt Đã từng Review
    DB --> API : Báo tồn tại
    API --> UI : 400 Error (Bạn đã review rồi)
else Lần đầu Review
    API -> DB : Chèn bản ghi Review mới
    DB --> API : Success
    API --> UI : 201 Created (Trả object mới)
    UI -> UI : Update Inline React State (Hiện thẳng bình luận)
end
@enduml
```