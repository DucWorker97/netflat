# PRD – netflop (Netflix Mini)

> **Phiên bản:** 1.0  
> **Ngày tạo:** 01-01-2026  
> **Tác giả:** Product Manager / Tech Lead  
> **Trạng thái:** Draft → Review

---

## Mục lục

1. [Tổng quan sản phẩm](#1-tổng-quan-sản-phẩm)
2. [Đối tượng người dùng & use cases](#2-đối-tượng-người-dùng--use-cases)
3. [Phạm vi & tính năng (MoSCoW)](#3-phạm-vi--tính-năng-moscow)
4. [Luồng trải nghiệm (UX Flows)](#4-luồng-trải-nghiệm-ux-flows)
5. [Danh sách màn hình & yêu cầu UI](#5-danh-sách-màn-hình--yêu-cầu-ui)
6. [Dữ liệu & quy tắc nghiệp vụ](#6-dữ-liệu--quy-tắc-nghiệp-vụ)
7. [Yêu cầu phi chức năng (NFR)](#7-yêu-cầu-phi-chức-năng-nfr)
8. [Acceptance Criteria (Definition of Done)](#8-acceptance-criteria-definition-of-done)
9. [Kế hoạch 8 tuần (Milestones)](#9-kế-hoạch-8-tuần-milestones)
10. [Kịch bản demo cuối kỳ](#10-kịch-bản-demo-cuối-kỳ)
11. [Tiêu chí chấm điểm (Scoring Rubric)](#11-tiêu-chí-chấm-điểm-scoring-rubric)
12. [Rủi ro & phương án giảm thiểu](#12-rủi-ro--phương-án-giảm-thiểu)
13. [Tóm tắt & next steps](#13-tóm-tắt--next-steps)

---

# 1. Tổng quan sản phẩm

## 1.1 Tên sản phẩm

**netflop** — Netflix mini cho video tự sản xuất.

## 1.2 Vấn đề & cơ hội

| Vấn đề | Cơ hội |
|--------|--------|
| Người dùng (content creator / sinh viên) muốn xem nội dung video tự sản xuất trên điện thoại nhưng thiếu nền tảng streaming chuyên nghiệp. | Xây dựng trải nghiệm "Netflix vibe" (tìm kiếm, rails theo thể loại, xem tiếp, danh sách yêu thích) cho video tự làm. |
| Quản lý nội dung (upload, encode, publish) phức tạp, không có admin UI. | CMS web giúp admin upload, theo dõi tiến trình encode HLS và publish nội dung dễ dàng. |
| Demo đồ án thiếu kiến trúc streaming rõ ràng (encode → HLS → playback). | Triển khai pipeline: MP4 → FFmpeg encode multi-bitrate HLS → lưu storage → playback trên mobile. |

## 1.3 Mục tiêu (Goals)

### Product goals (trải nghiệm)
- **PG-1:** Viewer có thể duyệt phim theo thể loại / collection trực quan, tìm kiếm, xem trailer/video, **resume** vị trí đã xem.
- **PG-2:** Viewer có thể lưu phim vào danh sách yêu thích và xem lại qua "My List".
- **PG-3:** Admin có thể upload video, theo dõi encode status, publish/unpublish mà không cần dùng CLI.

### Technical goals (kỹ thuật)
- **TG-1:** Streaming video chuẩn HLS (m3u8) với ≥ 2 variant (360p + 720p).
- **TG-2:** Encode pipeline tự động: upload MP4 → job queue → FFmpeg → output HLS → callback API.
- **TG-3:** API RESTful, phân quyền JWT, database quan hệ với migration.
- **TG-4:** Mobile app cross-platform (Expo React Native) chạy iOS & Android.

### Success metrics (demo đồ án)

| Metric | Mục tiêu |
|--------|----------|
| Time-to-first-frame (TTFF) trên WiFi LAN | ≤ 3 giây |
| Tỉ lệ lỗi playback (crash/buffer stall) trong demo | < 5 % |
| Độ chính xác resume (sai lệch) | ≤ 5 giây |
| Thời gian encode 1 phút video (720p) | ≤ 2 phút trên máy dev |
| Số bước demo end-to-end (upload → viewer play) | ≤ 10 bước |

## 1.4 Không nằm trong phạm vi (Out of scope)

- **DRM thương mại** (Widevine, FairPlay license server) — chỉ bảo vệ nhẹ bằng auth + signed URL.
- **Recommendation ML phức tạp** (collaborative filtering, deep learning).
- **Multi-device sync cấp độ production** (xem trên TV tiếp tục trên điện thoại real-time).
- **Hệ thống thanh toán / subscription billing**.
- **Live streaming** (chỉ hỗ trợ VOD).
- **Offline download** (cache local).
- **Multi-tenant** (chỉ 1 tenant).

---

# 2. Đối tượng người dùng & use cases

## 2.1 Persona

### Viewer (người xem)
| Thuộc tính | Mô tả |
|------------|-------|
| Vai trò | Sinh viên, bạn bè, người quan tâm nội dung tự sản xuất. |
| Thiết bị | Điện thoại Android/iOS (chủ yếu), có thể mở rộng web. |
| Mục tiêu | Xem video nhanh, mượt; lưu lại những phim thích; tiếp tục xem dở. |
| Pain point | Không muốn nhớ vị trí xem; khó tìm video trong danh sách dài. |

### Admin / Content Manager
| Thuộc tính | Mô tả |
|------------|-------|
| Vai trò | Người upload, quản lý nội dung (thường là chủ sản phẩm hoặc thành viên team). |
| Thiết bị | Desktop browser (Chrome, Edge). |
| Mục tiêu | Upload nhanh, biết khi nào encode xong, publish/unpublish linh hoạt. |
| Pain point | Phải chờ encode lâu; không biết lỗi ở đâu nếu encode fail. |

## 2.2 User stories (MVP)

| # | Role | Story | Acceptance hint |
|---|------|-------|-----------------|
| US-01 | Viewer | As a viewer, I want to **register & login** with email/password so that I can access content securely. | Đăng ký thành công, nhận JWT, lưu session. |
| US-02 | Viewer | As a viewer, I want to see a **Home screen with hero banner and genre rails** so that I can browse content visually. | Tối thiểu 1 hero + 3 rails (Trending, Action, Comedy…). |
| US-03 | Viewer | As a viewer, I want to **search movies by keyword** so that I can quickly find what I want. | Search trả về kết quả có title/description chứa keyword. |
| US-04 | Viewer | As a viewer, I want to view **movie detail** (poster, synopsis, genres, duration) so that I know if I want to watch. | Hiển thị đầy đủ thông tin; nút Play + Add to My List. |
| US-05 | Viewer | As a viewer, I want to **play HLS video**, control play/pause/seek, and adjust quality if available, so that I can watch smoothly. | Player hiển thị controls; seek hoạt động; quality switch (nếu có). |
| US-06 | Viewer | As a viewer, I want my **watch progress saved** automatically so that I can resume later. | Progress lưu mỗi 5s hoặc khi pause/exit. |
| US-07 | Viewer | As a viewer, I want a **"Continue Watching"** rail on Home so that I can quickly resume movies. | Hiển thị phim có progress > 0 và chưa hoàn thành. |
| US-08 | Viewer | As a viewer, I want to **add/remove movies to My List** so that I can save favorites. | Nút toggle; My List screen hiển thị đúng danh sách. |
| US-09 | Viewer | As a viewer, I want to see **loading, empty, and error states** clearly so that I understand what is happening. | Skeleton loader, empty message, error retry. |
| US-10 | Admin | As an admin, I want to **login** to CMS so that only authorized people manage content. | Trang login riêng; chỉ user role=admin mới vào được CMS page. |
| US-11 | Admin | As an admin, I want to **CRUD movies** (title, description, genres, status) so that I can manage catalog. | Tạo, sửa, xóa, list với pagination. |
| US-12 | Admin | As an admin, I want to **upload MP4 and thumbnail**, track **encode status** (pending/processing/ready/failed), and **publish/unpublish** so that movies become available to viewers. | Upload qua presigned URL; status cập nhật real-time hoặc polling; publish toggle. |

## 2.3 User stories (Nice-to-have)

| # | Role | Story | Priority |
|---|------|-------|----------|
| US-N1 | Viewer | As a viewer, I want to switch between **multiple profiles** so that family members have their own history. | COULD |
| US-N2 | Viewer | As a viewer, I want to see **subtitles (VTT)** in my language so that I can understand foreign content. | SHOULD |
| US-N3 | Viewer | As a viewer, I want **simple recommendations** ("Because you watched X") so that I discover new content. | COULD |
| US-N4 | Admin | As an admin, I want a **dashboard with basic analytics** (views, top movies) so that I monitor content performance. | COULD |
| US-N5 | Admin | As an admin, I want to **bulk upload** subtitles (VTT files) so that multilingual content is easier. | SHOULD |
| US-N6 | Viewer | As a viewer, I want to **rate movies** (like/dislike or 1-5 stars) so that I can express my opinion. | COULD |
| US-N7 | Viewer | As a viewer, I want a **Recently Added** rail so that I see new uploads first. | SHOULD |
| US-N8 | Admin | As an admin, I want to **reorder rails / feature movies** so that I control home layout. | COULD |

---

# 3. Phạm vi & tính năng (MoSCoW)

## 3.1 MUST (bắt buộc cho demo)

### Viewer (Mobile App)

| ID | Tính năng | Mô tả ngắn |
|----|-----------|------------|
| M-V01 | Login / Register | Email + password, JWT auth. |
| M-V02 | Home – Hero Banner | Slider hoặc random featured movie. |
| M-V03 | Home – Genre Rails | Horizontal scroll rails theo genre / collection. |
| M-V04 | Search | Input keyword → kết quả list. |
| M-V05 | Movie Detail | Poster, title, synopsis, genres, duration, Play, My List button. |
| M-V06 | HLS Player | Play/pause, seek bar, buffer indicator. |
| M-V07 | Watch History & Resume | Lưu progress, resume khi mở lại. |
| M-V08 | Continue Watching Rail | Hiển thị phim đang xem dở. |
| M-V09 | My List / Favorites | Add/remove, xem danh sách riêng. |
| M-V10 | Loading / Empty / Error States | Skeleton, empty illustration, retry button. |

### Admin Web (CMS)

| ID | Tính năng | Mô tả ngắn |
|----|-----------|------------|
| M-A01 | Admin Login | Riêng biệt với viewer; role check. |
| M-A02 | Movie List | Bảng pagination, filter status. |
| M-A03 | Create / Edit Movie | Form: title, description, genres (multi-select), status draft/published. |
| M-A04 | Upload Thumbnail | Chọn file ảnh, preview. |
| M-A05 | Upload Video (MP4) | Presigned URL upload; progress bar. |
| M-A06 | Encode Status | Hiển thị pending/processing/ready/failed; polling hoặc websocket. |
| M-A07 | Publish / Unpublish | Toggle publish; viewer chỉ thấy published + ready. |

### Backend API

| ID | Tính năng | Mô tả ngắn |
|----|-----------|------------|
| M-B01 | Auth – Register / Login / Refresh / Me | JWT access + refresh token. |
| M-B02 | Movies – List / Search / Detail | Pagination, filter genre, search keyword. |
| M-B03 | Genres – List | Trả về danh sách genres. |
| M-B04 | Favorites – Add / Remove / List | CRUD yêu thích. |
| M-B05 | Watch History – Upsert / List | Lưu & lấy progress. |
| M-B06 | Admin – Movie CRUD | Chỉ role admin. |
| M-B07 | Upload – Presigned URL | Tạo presigned PUT URL cho S3/MinIO. |
| M-B08 | Upload – Complete callback | Trigger encode job khi client báo upload xong. |
| M-B09 | Stream URL | Trả m3u8 URL (có thể signed / ticket). |

### Pipeline (HLS Encode)

| ID | Tính năng | Mô tả ngắn |
|----|-----------|------------|
| M-P01 | Job Queue | BullMQ / Redis nhận job encode. |
| M-P02 | FFmpeg Encode | MP4 → HLS master playlist + variants 360p, 720p. |
| M-P03 | Output Storage | Lưu segments + m3u8 lên MinIO / S3. |
| M-P04 | Callback API | Cập nhật encode_status + playback_url về DB. |

---

## 3.2 SHOULD (nên có, nếu kịp)

| ID | Phần | Tính năng |
|----|------|-----------|
| S-01 | Mobile | Subtitles (VTT) toggle on/off. |
| S-02 | Mobile | Quality selector (360/720 switcher). |
| S-03 | Mobile | Pull-to-refresh Home. |
| S-04 | Admin | Subtitle upload (VTT). |
| S-05 | API | Stream ticket / signed URL TTL (bảo vệ nhẹ). |
| S-06 | Pipeline | Thêm variant 480p. |

## 3.3 COULD (nice-to-have, bonus)

| ID | Phần | Tính năng |
|----|------|-----------|
| C-01 | Mobile | Multiple profiles per account. |
| C-02 | Mobile | Simple recommendation ("Vì bạn đã xem X"). |
| C-03 | Mobile | Rate movie (like/dislike). |
| C-04 | Admin | Dashboard analytics (views, top 10). |
| C-05 | Admin | Reorder home rails. |
| C-06 | Pipeline | Thumbnail auto-generate từ video. |
| C-07 | API | Push notification khi phim mới publish. |

## 3.4 WON'T (không làm trong MVP)

| Tính năng | Lý do |
|-----------|-------|
| DRM thương mại (Widevine L1/L3, FairPlay) | Phức tạp license server, chi phí. |
| Live streaming | Out of scope – chỉ VOD. |
| Offline download | Cần DRM + cache phức tạp. |
| Multi-tenant | Chỉ 1 tenant cho đồ án. |
| Social login (Google, Facebook) | Có thể thêm sau, không ưu tiên MVP. |
| Payment / Subscription | Không cần cho demo. |

---

# 4. Luồng trải nghiệm (UX Flows)

## 4.1 Viewer flow – Browse & Play (bắt buộc)

```
┌─────────┐      ┌──────────┐      ┌─────────────┐      ┌────────┐      ┌───────────────────┐
│  Login  │ ───► │   Home   │ ───► │ Movie Detail│ ───► │ Player │ ───► │ Exit / Pause      │
└─────────┘      └──────────┘      └─────────────┘      └────────┘      └───────────────────┘
                                                                                  │
                                                                                  ▼
                                                          ┌───────────────────────────────────┐
                                                          │ Home → Continue Watching → Resume │
                                                          └───────────────────────────────────┘
```

**Chi tiết:**
1. Viewer mở app → Splash → nếu chưa login chuyển Login / Register.
2. Đăng nhập thành công → Home (hero + rails).
3. Chọn poster → Movie Detail (thông tin chi tiết).
4. Nhấn **Play** → Player (HLS stream).
5. Xem 30 giây → Thoát (progress 30s saved).
6. Mở app lại → Home → rail "Continue Watching" → chọn phim → Resume từ ~30s.

## 4.2 Viewer flow – Search & My List

```
┌────────┐      ┌─────────────┐      ┌─────────────┐      ┌──────────┐
│  Home  │ ───► │   Search    │ ───► │ Movie Detail│ ───► │ Add List │
└────────┘      └─────────────┘      └─────────────┘      └──────────┘
                                                                 │
                                                                 ▼
                              ┌─────────────────────────────────────────────┐
                              │ My List screen → Select movie → Play       │
                              └─────────────────────────────────────────────┘
```

**Chi tiết:**
1. Từ Home, nhấn icon Search (hoặc tab).
2. Nhập keyword → kết quả danh sách.
3. Chọn 1 phim → Detail → nhấn **Add to My List** (icon bookmark/heart).
4. Vào screen My List → danh sách đã lưu → nhấn Play.

## 4.3 Admin flow – Upload & Encode

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐     ┌─────────────┐
│ Admin Login │ ──► │ Create Movie │ ──► │ Upload MP4    │ ──► │ Processing   │ ──► │ Ready       │
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘     └─────────────┘
                                                                                            │
                                                                                            ▼
                                                                      ┌───────────────────────────────┐
                                                                      │ Publish → Viewer sees on Home │
                                                                      └───────────────────────────────┘
```

**Chi tiết:**
1. Admin login CMS (role check).
2. Nhấn **Create Movie** → điền title, description, genres → Save (draft).
3. Vào trang edit → Upload Thumbnail + Upload MP4.
4. Sau upload MP4, API trigger encode job → status = `processing`.
5. Worker encode xong → callback → status = `ready`.
6. Admin nhấn **Publish** → `movie_status = published`.
7. Viewer mở app → Phim hiển thị trên Home (vì published + ready).

---

# 5. Danh sách màn hình & yêu cầu UI

## 5.1 Mobile screens

| # | Screen | Mô tả | UI Highlights |
|---|--------|-------|---------------|
| 1 | Splash | Logo + loading animation (optional). | Dark background, logo center. |
| 2 | Login / Register | Form email, password; toggle login ↔ register. | Dark theme, Netflix-style red accent, input validation. |
| 3 | Home | Hero banner (carousel/auto-slide), rails (Continue Watching, Trending, Genre X…). | Poster 2:3 hoặc 16:9, horizontal scroll, skeleton loading. |
| 4 | Search | Search bar, real-time hoặc debounce, grid/list kết quả. | Keyboard auto-focus, empty state "Không tìm thấy". |
| 5 | Movie Detail | Backdrop image, poster, title, meta (year, duration, genres), synopsis, buttons (Play, My List, Share). | Gradient overlay, parallax scroll (optional). |
| 6 | Player | Full-screen, controls: play/pause, seek bar, time, quality (optional), back. | Auto-hide controls sau 3s, orientation landscape. |
| 7 | My List | List / grid các phim đã bookmark. | Remove button, empty state. |
| 8 | Settings / Profile | Logout, version, (optional) profile switch. | Simple list. |

**Yêu cầu chung:**
- **Dark theme**: background `#0d0d0d` hoặc tương đương; text trắng/xám.
- **Poster rails**: horizontal `FlatList` hoặc `ScrollView`, poster rounded corners.
- **Skeleton loading**: placeholder shimmer khi tải dữ liệu.
- **Responsive**: hoạt động cả Android & iOS (Expo managed workflow).

## 5.2 Admin screens

| # | Screen | Mô tả |
|---|--------|-------|
| 1 | Login | Form username/password, redirect nếu đã có session. |
| 2 | Movie List | Table: thumbnail nhỏ, title, status (draft/published), encode_status badge, actions (edit, delete). Pagination. |
| 3 | Movie Create / Edit | Form fields: title, description, genres (multi-select), status select. Sau save chuyển qua tab Upload. |
| 4 | Upload & Status | Dropzone thumbnail, dropzone video; progress bar; badge encode_status realtime. Nút Publish/Unpublish. |
| 5 | Dashboard (optional) | Cards: tổng phim, tổng views, top 5 phim. Chart đơn giản (optional). |

**Yêu cầu chung:**
- **Framework**: Next.js (App Router) + shadcn/ui hoặc Ant Design.
- **Dark theme** preferred (hoặc tuỳ chọn).
- **Responsive** ít nhất tablet + desktop.

---

# 6. Dữ liệu & quy tắc nghiệp vụ

## 6.1 Entities & fields (mức PRD)

> Chi tiết schema xem `DATABASE_SCHEMA.md`. Dưới đây là tổng quan.

### User
| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| email | string | unique |
| password_hash | string | bcrypt |
| role | enum | `viewer` / `admin` |
| created_at | timestamp | |

### Movie
| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| title | string | |
| description | text | |
| poster_url | string | URL thumbnail |
| backdrop_url | string | optional hero image |
| duration_seconds | int | tổng thời lượng video |
| release_year | int | optional |
| movie_status | enum | `draft` / `published` |
| encode_status | enum | `pending` / `processing` / `ready` / `failed` |
| playback_url | string | m3u8 URL khi ready |
| created_at | timestamp | |
| updated_at | timestamp | |

### Genre
| Field | Type |
|-------|------|
| id | UUID |
| name | string |
| slug | string |

### MovieGenre (join table)
| Field | Type |
|-------|------|
| movie_id | UUID FK |
| genre_id | UUID FK |

### Favorite
| Field | Type |
|-------|------|
| id | UUID |
| user_id | UUID FK |
| movie_id | UUID FK |
| created_at | timestamp |

### WatchHistory
| Field | Type | Note |
|-------|------|------|
| id | UUID | |
| user_id | UUID FK | |
| movie_id | UUID FK | |
| progress_seconds | int | vị trí đã xem |
| duration_seconds | int | tổng thời lượng (denormalize) |
| completed | boolean | đã xem xong? |
| updated_at | timestamp | |

### Upload (optional tracking)
| Field | Type |
|-------|------|
| id | UUID |
| movie_id | UUID FK |
| file_key | string |
| file_type | enum | `video` / `thumbnail` |
| status | enum | `uploading` / `uploaded` / `failed` |
| created_at | timestamp |

### EncodeJob (optional)
| Field | Type |
|-------|------|
| id | UUID |
| movie_id | UUID FK |
| input_key | string |
| output_prefix | string |
| status | enum | `pending` / `processing` / `completed` / `failed` |
| started_at | timestamp |
| completed_at | timestamp |
| error_message | text |

## 6.2 Business rules

| # | Rule |
|---|------|
| BR-01 | **Viewer chỉ thấy phim** khi `movie_status = 'published'` **AND** `encode_status = 'ready'`. |
| BR-02 | **Continue Watching** hiển thị phim có `progress_seconds > 0` **AND** `completed = false`. |
| BR-03 | **Hoàn thành (completed)** khi `progress_seconds >= 0.9 * duration_seconds` (90%). |
| BR-04 | **Cập nhật progress**: client gửi progress mỗi **5 giây** hoặc khi **pause / exit**. |
| BR-05 | **Favorites không trùng**: mỗi user + movie chỉ có 1 record; thêm lại thì ignore hoặc error. |
| BR-06 | **Xóa phim (admin)**: soft delete hoặc không cho xóa nếu đang published (tuỳ impl). |
| BR-07 | **Upload presigned URL** chỉ cấp khi user có role admin và movie thuộc quyền. |
| BR-08 | **Encode job** chỉ trigger khi upload video hoàn thành (client gọi `POST /movies/:id/upload-complete`; alias deprecated: `/upload/complete/:movieId`). |

---

# 7. Yêu cầu phi chức năng (NFR)

## 7.1 Hiệu năng

| Metric | Mục tiêu | Ghi chú |
|--------|----------|---------|
| Home load time | ≤ 2 s (warm cache) | Sử dụng React Query / SWR cache. |
| API response (list) | ≤ 500 ms p95 | Pagination, index DB. |
| Time-to-first-frame (TTFF) | ≤ 3 s WiFi | Player buffer settings. |
| Adaptive streaming | Buffer ≥ 10 s trước khi play | Pre-buffer segment. |

**Caching:**
- Mobile: cache danh sách movies, genres (TTL 5 phút).
- API: response cache (Redis hoặc in-memory) cho public endpoints.

## 7.2 Tin cậy & lỗi

- **Không crash khi mất mạng**: detect network offline, hiển thị banner "Không có kết nối".
- **Retry hợp lý**: API call retry 2–3 lần với exponential backoff (react-query built-in).
- **Graceful degradation**: nếu hero API fail, vẫn render rails; nếu rail fail, hiển thị error inline.
- **Encode fail**: job retry 1 lần; nếu vẫn fail, status = `failed`, admin có thể re-trigger.

## 7.3 Bảo mật (mức đồ án)

| Hạng mục | Cách xử lý |
|----------|------------|
| Authentication | JWT access token (15–60 phút) + refresh token (7 ngày). Lưu secure storage trên mobile. |
| Authorization | Middleware check role: `admin` mới gọi được CMS endpoints. |
| Password | Hash bcrypt, không lưu plain text. |
| Upload presigned | Validate `Content-Type` (video/mp4, image/*), max size (e.g., 2 GB video, 5 MB thumbnail). |
| Stream "bảo vệ nhẹ" | Chỉ user login mới gọi được `/stream/:movieId`; trả về signed URL với TTL 1–2 giờ hoặc stream ticket. |
| CORS | Chỉ cho phép origin CMS domain. |
| Rate limit | Cơ bản 100 req/min per IP (optional). |

## 7.4 Logging / Observability (mức đồ án)

| Loại | Nội dung log |
|------|--------------|
| API error | requestId, userId, path, status, error message. |
| Encode job | jobId, movieId, start time, end time, duration, status, error (nếu có). |
| Auth events | login success/fail, refresh, logout. |
| Playback (optional) | play/pause/seek event (analytics purpose). |

Công cụ gợi ý: `pino` logger, Logto/Seq/CloudWatch (deploy), hoặc đơn giản console JSON log.

---

# 8. Acceptance Criteria (Definition of Done)

## 8.1 Viewer – Auth

| AC | Tiêu chí |
|----|----------|
| AC-AUTH-01 | Đăng ký với email hợp lệ + password ≥ 6 ký tự thành công; lưu JWT. |
| AC-AUTH-02 | Đăng nhập sai password → hiển thị lỗi, không crash. |
| AC-AUTH-03 | Token hết hạn → tự refresh; nếu refresh fail → logout về Login screen. |

## 8.2 Viewer – Home & Browse

| AC | Tiêu chí |
|----|----------|
| AC-HOME-01 | Home hiển thị hero banner lấy từ featured movie. |
| AC-HOME-02 | Có tối thiểu 3 rails (Continue Watching nếu có, Trending / Genre X / Genre Y). |
| AC-HOME-03 | Nhấn poster → chuyển Detail screen, dữ liệu đúng. |

## 8.3 Viewer – Search

| AC | Tiêu chí |
|----|----------|
| AC-SEARCH-01 | Nhập keyword → kết quả hiển thị trong 1 s (hoặc loading state). |
| AC-SEARCH-02 | Kết quả = 0 → hiển thị "Không tìm thấy phim nào". |

## 8.4 Viewer – Detail & Play

| AC | Tiêu chí |
|----|----------|
| AC-DETAIL-01 | Hiển thị poster, title, synopsis, genres, duration, Play button. |
| AC-DETAIL-02 | Nhấn Play → Player mở, stream bắt đầu trong ≤ 3 s (WiFi). |
| AC-PLAY-01 | Play/pause/seek hoạt động chính xác. |
| AC-PLAY-02 | Xem 30 s → thoát → mở lại → resume gần đúng vị trí (sai lệch ≤ 5 s). |

## 8.5 Viewer – Continue Watching & My List

| AC | Tiêu chí |
|----|----------|
| AC-CW-01 | Phim xem dở (progress > 0 & chưa complete) xuất hiện trong rail "Continue Watching". |
| AC-CW-02 | Phim xem xong (≥ 90 %) không xuất hiện ở Continue Watching. |
| AC-LIST-01 | Add movie vào My List → danh sách My List có phim đó. |
| AC-LIST-02 | Remove movie khỏi My List → biến mất khỏi danh sách, không lỗi. |
| AC-LIST-03 | Add trùng movie → không duplicate, có thể toast "Đã có trong danh sách". |

## 8.6 Viewer – Error / Loading

| AC | Tiêu chí |
|----|----------|
| AC-ERR-01 | Mất mạng khi load Home → hiển thị error state + Retry button. |
| AC-ERR-02 | Playback lỗi (404 m3u8) → hiển thị lỗi, không crash. |

## 8.7 Admin – Movie Management

| AC | Tiêu chí |
|----|----------|
| AC-ADMIN-01 | Login với role viewer → redirect hoặc 403. |
| AC-ADMIN-02 | Tạo movie draft thành công, xuất hiện trong list. |
| AC-ADMIN-03 | Edit movie → save → dữ liệu update đúng. |
| AC-ADMIN-04 | Delete movie → xoá / ẩn khỏi list (tuỳ soft delete). |

## 8.8 Admin – Upload & Encode

| AC | Tiêu chí |
|----|----------|
| AC-UPLOAD-01 | Upload video → progress bar hiển thị → hoàn thành → encode_status = `pending` rồi `processing`. |
| AC-UPLOAD-02 | Encode xong → encode_status = `ready`, playback_url có giá trị. |
| AC-UPLOAD-03 | Encode fail → encode_status = `failed`, hiển thị message. |
| AC-PUB-01 | Publish movie (draft + ready) → viewer thấy trên Home. |
| AC-PUB-02 | Unpublish → viewer không thấy nữa (filter lại). |

---

# 9. Kế hoạch 8 tuần (Milestones)

| Tuần | Mục tiêu | Deliverables | Checkpoint |
|------|----------|--------------|------------|
| **1** | Khởi tạo repo, thiết kế DB, setup CI | Monorepo (pnpm + Turborepo), Prisma schema, migration chạy. ERD hoàn chỉnh. | DB migrate thành công, seed data. |
| **2** | API core + Admin UI skeleton | Auth endpoints, Movie CRUD API, Admin login + list page. | Postman test API, Admin list hiển thị dữ liệu seed. |
| **3** | Upload flow + Encode worker skeleton | Presigned URL API, MinIO setup, Worker consume job (chưa encode thật). | Upload file thành công lên MinIO, job log nhận. |
| **4** | FFmpeg encode + HLS output | Worker encode MP4 → HLS (360p, 720p), lưu output, callback status. | Encode 1 file demo, copy m3u8 link mở được trên browser. |
| **5** | Mobile app – Auth + Home + Search | Expo setup, Login/Register, Home (hero + rails), Search. | App chạy Expo Go, login, thấy danh sách rails, search hoạt động. |
| **6** | Mobile – Detail + Player + Resume | Detail screen, HLS player (expo-av hoặc react-native-video), progress save & resume. | Play video, thoát, resume đúng vị trí. |
| **7** | My List + Polish UI/UX + Bug fix | Favorites, Continue Watching rail sắp xếp lại, skeleton loaders, error states. | Flow hoàn chỉnh end-to-end: upload → encode → publish → viewer play + resume. |
| **8** | Ổn định, deploy, docs, demo | Deploy (Railway / Render / VPS), README, ARCHITECTURE.md, video demo, báo cáo. | Demo 5 phút thành công, báo cáo nộp. |

---

# 10. Kịch bản demo cuối kỳ (3–5 phút)

> Mục tiêu: Chứng minh luồng **upload → encode → publish → viewer play → resume**.

### Phần 1: Admin tạo & upload (1.5 phút)

1. Mở browser → CMS login (admin@netflop.local).
2. Nhấn **Create Movie** → điền title "Demo Video", description, chọn genres.
3. Save → chuyển tab Upload.
4. Chọn file `demo_video.mp4` (30 giây), upload → progress bar → xong.
5. Màn hình hiển thị `encode_status = processing` (hoặc chờ vài giây thấy chuyển `ready`).
6. Nhấn **Publish**.

### Phần 2: Viewer xem & resume (2 phút)

1. Mở app Expo Go trên điện thoại (hoặc simulator).
2. Login (`viewer@netflop.local`).
3. Home → thấy "Demo Video" xuất hiện ở rail Trending (hoặc hero).
4. Nhấn → Detail → nhấn **Play**.
5. Xem ~15 giây → nhấn **Back**.
6. Về Home → rail **Continue Watching** xuất hiện "Demo Video".
7. Nhấn lại → Player resume từ ~15 s.

### Phần 3: Bonus (nếu còn thời gian)

- Search "Demo" → kết quả hiển thị.
- Add to My List → vào My List xác nhận.
- Hiển thị subtitles (nếu có).

---

# 11. Tiêu chí chấm điểm (Scoring Rubric)

## Rubric chính – Tổng 100 điểm

| Hạng mục | Điểm | Tiêu chí chi tiết |
|----------|------|-------------------|
| **UX/UI "Netflix vibe"** | 20 | Dark theme, poster rails, skeleton loaders, hero banner, chuyển cảnh mượt mà, error/empty states đẹp. |
| **Tính năng cốt lõi MVP** | 30 | Login, Home, Search, Detail, Play, Resume, Continue Watching, My List hoạt động đầy đủ theo AC. |
| **Streaming HLS + Encode Pipeline** | 25 | Encode MP4 → HLS multi-bitrate thành công, playback mượt, buffer hợp lý, quality switch (nếu có). |
| **Backend API + DB + Phân quyền** | 15 | RESTful chuẩn, JWT auth, RBAC admin/viewer, migration, seed data, logging cơ bản. |
| **Chất lượng triển khai** | 10 | Error handling, logging, docs (README, ARCHITECTURE), deploy (local hoặc cloud), code sạch. |
| **Tổng** | **100** | |

## Bonus – Tối đa +10 điểm

| Bonus | Điểm | Điều kiện |
|-------|------|-----------|
| Subtitles (VTT) | +2 | Upload VTT, hiển thị toggle on/off trong player. |
| Multiple profiles | +2 | Switch profile, history/favorites tách biệt. |
| Simple recommendation | +2 | Rail "Vì bạn đã xem X" dựa trên genre. |
| Analytics dashboard | +2 | Admin xem views, top 10 movies. |
| CI/CD pipeline | +2 | GitHub Actions build + test + deploy tự động. |
| **Tổng bonus** | **+10 max** | |

---

# 12. Rủi ro & phương án giảm thiểu

| # | Rủi ro | Khả năng | Ảnh hưởng | Phương án giảm thiểu |
|---|--------|----------|-----------|----------------------|
| R-01 | **FFmpeg encode lỗi / lâu** | Trung bình | Cao – không có video để play | Sử dụng preset `fast` hoặc `veryfast`, giảm bitrate. Test video ngắn 30 s. Thêm retry job 1 lần. |
| R-02 | **HLS playback khác nhau iOS/Android** | Trung bình | Trung bình | Dùng thư viện cross-platform (`expo-av` hoặc `react-native-video`). Test cả 2 platform sớm. |
| R-03 | **Networking Expo – localhost vs IP LAN** | Cao (dev) | Thấp | Dùng `EXPO_PUBLIC_API_URL` env, chạy API trên IP LAN hoặc tunnel (ngrok). |
| R-04 | **Storage permissions (Android)** | Thấp | Thấp | Streaming không cần quyền storage; nếu download thì xin permission. |
| R-05 | **Presigned URL hết hạn giữa upload** | Thấp | Trung bình | TTL presigned = 15–30 phút đủ cho file ≤ 2 GB. Retry presigned nếu fail. |
| R-06 | **Team nhỏ (1–3 người), deadline gấp** | Cao | Cao | Tuân thủ MoSCoW; cut SHOULD/COULD nếu thiếu thời gian. Daily sync 15 phút. |
| R-07 | **MinIO / Redis crash local** | Thấp | Trung bình | Docker compose restart policy; dev test docker-compose up trước. |

---

# 13. Tóm tắt & next steps

## Tóm tắt

**netflop** là ứng dụng xem video tự sản xuất với trải nghiệm "Netflix vibe" dành cho demo đồ án tốt nghiệp.  
MVP bao gồm:
- **Mobile app** (Expo React Native): login, home rails, search, detail, HLS player, resume, continue watching, my list.
- **Admin CMS** (Next.js): movie CRUD, upload, theo dõi encode, publish.
- **Backend API** (NestJS + Prisma + PostgreSQL): RESTful, JWT, RBAC.
- **Encode pipeline** (BullMQ + FFmpeg): MP4 → HLS 360p/720p, lưu MinIO.

Thời gian triển khai 8 tuần với checkpoint rõ ràng. Scoring rubric 100 điểm + 10 bonus đảm bảo đánh giá khách quan.

## Next steps

1. **Tạo `ARCHITECTURE.md`**: sơ đồ hệ thống, tech stack chi tiết, luồng encode.
2. **Tạo `DATABASE_SCHEMA.md`**: ERD, Prisma schema.
3. **Tạo `OPENAPI.yaml`**: spec API endpoints.
4. **Khởi tạo monorepo**: `pnpm init`, Turborepo config, workspace packages.
5. **Thiết lập CI**: lint + typecheck + test (GitHub Actions).

---

> **Ghi chú:** Tài liệu này là phiên bản 1.0, có thể cập nhật khi có feedback từ giảng viên hoặc thay đổi scope.
