# Netflop Upload & Playback Flow (Web + Mobile)

> **Tài liệu tổng hợp**: Chi tiết luồng xử lý video từ lúc Admin upload đến lúc Viewer xem song song trên Web và Mobile App.

---

## 1. Tổng quan hệ thống (Parallel Architecture)

Hệ thống Netflop cho phép xem phim đồng bộ trên cả **Web** và **Mobile** nhờ vào kiến trúc API tập trung và Streaming chuẩn HLS.

```mermaid
graph TD
    Admin[Admin Web] -->|Upload MP4| S3[MinIO Storage]
    S3 -->|Encode Job| Worker[Encode Worker]
    Worker -->|HLS Output| S3
    
    API[Back-end API] -->|Presigned URL| Admin
    Admin -->|Upload Complete| API
    Worker -->|Status Callback| API
    
    ViewerW[Web Viewer] -->|Get Stream URL| API
    ViewerM[Mobile Viewer] -->|Get Stream URL| API
    
    API -->|Playback URL (public or signed)| ViewerW
    API -->|Playback URL (public or signed)| ViewerM
    
    ViewerW -->|Stream HLS| S3
    ViewerM -->|Stream HLS| S3
```

---

## 2. Quy trình Upload (Admin Side)

**Mục tiêu**: Đưa file `mp4` gốc lên storage và kích hoạt encode.

### B1. Lấy Presigned URL
Admin Web gọi API để xin quyền upload trực tiếp lên Storage, tránh tắc nghẽn API server.

- **Endpoint**: `GET /api/upload/presigned-url`
- **Request**:
  ```json
  { 
    "movieId": "uuid", 
    "fileName": "avatar.mp4", 
    "contentType": "video/mp4",
    "sizeBytes": 1024000
  }
  ```
- **Response**:
  ```json
  {
    "uploadUrl": "http://localhost:9000/netflop/originals/...?signature=...",
    "objectKey": "originals/uuid/avatar.mp4"
  }
  ```
  - Host của `uploadUrl` lấy từ `S3_PRESIGN_BASE_URL`.

### B2. Upload Binary
Browser gửi `PUT` request trực tiếp tới `uploadUrl` với body là file binary.

### B3. Xác nhận hoàn tất (Trigger Encode)
Sau khi upload xong 100%, Admin Web báo cho API biết để bắt đầu xử lý.
- **Endpoint**: `POST /api/movies/:id/upload-complete` (alias deprecated: `/api/upload/complete/:movieId`)
- **Body**: `{ "objectKey": "...", "fileType": "video" }`
- **Hệ thống xử lý**:
  1. Cập nhật `movie.original_key`.
  2. Chuyển `encode_status` -> `pending`.
  3. Đẩy job vào hàng đợi `encode` (Redis BullMQ).

---

## 3. Quy trình Xử lý (Encode Worker)

Worker chạy ngầm (background) để chuyển đổi video.

1. **Nhận Job**: Worker nhận task từ Redis. `encode_status` -> `processing`.
2. **Download**: Tải file gốc từ MinIO về máy.
3. **Transcode (FFmpeg)**:
   - Tạo các bản `360p`, `720p` (HLS format).
   - Tự động cắt video thành các file nhỏ (`.ts`) dài 6s.
   - Tạo file `master.m3u8` chứa danh sách các độ phân giải.
4. **Upload Output**: Đẩy toàn bộ folder HLS ngược lại MinIO (`hls/{movieId}/*`).
5. **Callback**: Gọi API để báo xong. `encode_status` -> `ready`.

---

## 4. Quy trình Playback (Parallel Viewing)

Cả Web và Mobile đều sử dụng chung một cơ chế lấy link, nhưng khác nhau về player và cấu hình mạng (đặc biệt khi chạy local/dev).

### B1. Authenticate & Get Stream URL
Client gọi API để lấy link xem phim. Link này có thể là **public URL** (dev/staging) hoặc **Signed URL** (có thời hạn) để bảo vệ nội dung.

- **Endpoint**: `GET /api/movies/:id/stream`
- **Auth**: Header `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "data": {
      "playbackUrl": "http://192.168.1.5:9000/netflop/hls/uuid/master.m3u8?signature=..."
    }
  }
  ```

### B2. Client Implementation

| Đặc điểm | **Web App** (`apps/web`) | **Mobile App** (`apps/mobile`) |
|----------|--------------------------|--------------------------------|
| **Player Lib** | `hls.js` (hoặc Safari native) | `expo-av` (`Video` component) |
| **File** | `VideoPlayer.tsx` | `app/player/[id].tsx` |
| **Network** | `localhost:3000` | **IP LAN** (vd: `10.0.2.2` hoặc `192.168.x.x`) |
| **Lưu Progress** | Mỗi 10 giây (`timeupdate`) | Mỗi 5 giây + khi App background |
| **Quality** | `hls.js` tự động (ABR) | Auto hoặc chọn thủ công (UI custom) |

### ⚠️ Lưu ý quan trọng về Môi trường (Parallel Dev)

Để xem được song song trên Web và Mobile Emulator/Physical Device:

1. **Host Configuration**:
   - File `.env` gốc phải set `DEV_PUBLIC_HOST` là **IP LAN** máy bạn (hoặc `10.0.2.2` nếu chỉ dùng emulator), **KHÔNG DÙNG** `localhost`.
   - Ví dụ: `DEV_PUBLIC_HOST=192.168.1.10`.

2. **Tại sao?**
   - **Web**: Chạy trên máy tính, hiểu `localhost`.
   - **Mobile**: Là thiết bị riêng biệt. Nếu API trả về link `http://localhost:9000/...`, điện thoại sẽ tìm server "trên chính nó" và lỗi kết nối.
   - **Giải pháp**: API sẽ trả về link dựa trên `DEV_PUBLIC_HOST` để cả 2 thiết bị đều truy cập được MinIO.

---

## 5. Dữ liệu đồng bộ (Sync)

Do dùng chung Backend, trạng thái xem được đồng bộ giữa 2 nền tảng:

1. **Watch History**:
   - Web xem đến phút 10 -> API lưu `progressSeconds: 600`.
   - Mở Mobile -> App gọi `GET /progress` -> Nhận `600` -> Player seek tới phút 10.
   - **Kết quả**: Seamless experience (trải nghiệm liền mạch).

2. **My List (Yêu thích)**:
   - Web thêm vào "My List".
   - Mobile reload -> Thấy phim đó trong danh sách yêu thích.

---

## Tóm tắt kỹ thuật

- **Upload**: Direct-to-S3 (Presigned URL) -> High Performance.
- **Encode**: Async Queue -> Non-blocking API.
- **Stream**: HLS (Adaptive Bitrate) -> Tối ưu băng thông cho Mobile/Web.
- **Sync**: Centralized DB (Postgres) -> Dữ liệu xem liên thông.
