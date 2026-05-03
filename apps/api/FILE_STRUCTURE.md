# 📁 Cấu Trúc Dự Án Netflat API

> Tài liệu mô tả chức năng từng file và thư mục trong dự án Netflat API (NestJS).

---

## 📌 Giải thích các loại file (NestJS Convention)

| Loại file | Hậu tố | Chức năng |
|---|---|---|
| **Module** | `.module.ts` | Đăng ký và kết nối các thành phần (controller, service, guard) thành một nhóm chức năng. Mỗi feature có 1 module riêng. |
| **Controller** | `.controller.ts` | Định nghĩa các **route API** (endpoint). Nhận request HTTP từ client, gọi service xử lý, trả response. Controller **KHÔNG** chứa logic nghiệp vụ. |
| **Service** | `.service.ts` | Chứa **logic nghiệp vụ chính** (business logic). Tương tác với database (qua Prisma), S3, Redis, v.v. Được inject vào controller. |
| **DTO** | `.dto.ts` | **Data Transfer Object** — định nghĩa cấu trúc dữ liệu đầu vào (request body/query). Dùng `class-validator` để tự động validate input. |
| **Guard** | `.guard.ts` | **Bảo vệ route** — kiểm tra quyền truy cập trước khi request tới controller (xác thực JWT, phân quyền role, BOLA protection). |
| **Strategy** | `.strategy.ts` | Chiến lược xác thực của Passport.js — giải mã token, tìm user trong DB. |
| **Decorator** | `.decorator.ts` | **Custom decorator** — annotation gắn lên controller/method để thêm metadata (VD: `@Roles('admin')`, `@CurrentUser()`). |
| **Filter** | `.filter.ts` | Bộ lọc exception — bắt lỗi, chuẩn hóa format response lỗi trả về client. |
| **Middleware** | `.middleware.ts` | Xử lý request/response trước khi tới controller (VD: gắn request ID, logging). |
| **Processor** | `.processor.ts` | **BullMQ Worker** — xử lý job nền trong hàng đợi (VD: encode video FFmpeg). |
| **Constants** | `.constants.ts` | Định nghĩa các hằng số, cấu hình dùng chung trong module. |
| **Spec** | `.spec.ts` | File test (unit test). |

---

## 🏗️ Cấu trúc thư mục tổng quan

```
apps/api/
├── prisma/                    # Cơ sở dữ liệu (schema, migrations, seed)
├── scripts/                   # Script tiện ích (import dữ liệu, reset password)
├── src/                       # ← MÃ NGUỒN CHÍNH
│   ├── main.ts                # Điểm khởi chạy ứng dụng
│   ├── app.module.ts          # Module gốc (kết nối tất cả module)
│   ├── admin/                 # Quản trị hệ thống
│   ├── auth/                  # Xác thực (đăng ký, đăng nhập, JWT)
│   ├── common/                # Guards, decorators, utils dùng chung
│   ├── config/                # Cấu hình môi trường & bảo mật
│   ├── encode/                # Mã hóa video FFmpeg → HLS
│   ├── favorites/             # Danh sách phim yêu thích
│   ├── genres/                # Thể loại phim
│   ├── health/                # Health check endpoint
│   ├── history/               # Lịch sử & tiến trình xem phim
│   ├── mail/                  # Gửi email (quên mật khẩu)
│   ├── movies/                # Quản lý phim (CRUD, streaming)
│   ├── prisma/                # Prisma ORM service
│   ├── ratings/               # Đánh giá & bình luận phim
│   ├── upload/                # Upload file lên S3/MinIO
│   └── users/                 # Quản lý người dùng
├── Dockerfile                 # Docker build config
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript config
└── nest-cli.json              # NestJS CLI config
```

---

## 📂 Chi tiết từng thư mục

---

### 📁 `src/` — File gốc

| File | Chức năng |
|------|-----------|
| `main.ts` | **Điểm khởi chạy**. Tạo NestJS app, cấu hình CORS, Helmet (bảo mật HTTP headers), ValidationPipe (validate input), Request ID middleware, Exception Filter, và lắng nghe port. |
| `app.module.ts` | **Module gốc**. Import và kết nối tất cả 15 module con. Cấu hình: `ConfigModule` (biến .env), `BullModule` (Redis queue), `ThrottlerModule` (rate limiting 20 req/60s). |

---

### 📁 `src/auth/` — Xác thực người dùng

Quản lý đăng ký, đăng nhập, JWT token, refresh token, quên/đổi mật khẩu.

| File | Chức năng |
|------|-----------|
| `auth.module.ts` | Đăng ký module Auth: cấu hình Passport (JWT), JwtModule (secret + TTL), import UsersModule. |
| `auth.service.ts` | **Logic xác thực**: `register()` (tạo tài khoản + hash bcrypt), `login()` (xác thực + chống timing attack), `refresh()` (token rotation), `logout()`, `forgotPassword()` (gửi email reset), `resetPassword()` (xác minh token + đổi MK). |
| `auth.controller.ts` | **API endpoints**: `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `GET /auth/me`. Có rate limiting riêng. |

#### 📁 `src/auth/dto/`
| File | Chức năng |
|------|-----------|
| `register.dto.ts` | Validate input đăng ký: `email` (email hợp lệ), `password` (min 8, có chữ + số). |
| `login.dto.ts` | Validate input đăng nhập: `email`, `password`. |
| `refresh.dto.ts` | Validate input refresh: `refreshToken` (string bắt buộc). |
| `forgot-password.dto.ts` | Validate input quên MK: `email`. |
| `reset-password.dto.ts` | Validate input reset MK: `token`, `newPassword`. |

#### 📁 `src/auth/guards/`
| File | Chức năng |
|------|-----------|
| `jwt-auth.guard.ts` | **Guard bắt buộc JWT**. Route có guard này yêu cầu header `Authorization: Bearer <token>`. Nếu không có/sai → 401. |
| `optional-jwt-auth.guard.ts` | **Guard JWT tùy chọn**. Nếu có token → gắn user vào request. Nếu không → request vẫn đi tiếp (user = null). Dùng cho route public nhưng cần biết ai đang request. |

#### 📁 `src/auth/strategies/`
| File | Chức năng |
|------|-----------|
| `jwt.strategy.ts` | **Chiến lược Passport JWT**. Giải mã JWT từ header → trích `sub` (userId) → tìm user trong DB → gắn vào `request.user`. |

---

### 📁 `src/movies/` — Quản lý phim

Module cốt lõi: CRUD phim, tìm kiếm, xuất bản, streaming HLS, dọn dẹp file S3.

| File | Chức năng |
|------|-----------|
| `movies.module.ts` | Đăng ký module Movies, import UploadModule (cho upload-complete). |
| `movies.service.ts` | **Logic nghiệp vụ phim**: `create()` (tạo phim + liên kết genre), `findAll()` (phân trang + tìm kiếm), `findById()`, `update()` (đổi title/genre/actors), `delete()` (xóa DB + dọn S3), `publish()` (xuất bản/bỏ xuất bản), `getStreamUrl()` (tạo URL HLS), `cleanupMovieFiles()` (xóa file trên S3). |
| `movies.controller.ts` | **API endpoints**: `GET /movies` (public, tìm kiếm), `POST /movies` (admin), `GET/PUT/DELETE /movies/:id`, `PATCH /movies/:id/publish`, `POST /movies/:id/upload-complete`, `GET /movies/:id/stream`, `GET /movies/:id/progress`. |
| `movies.service.hls.spec.ts` | Unit test cho chức năng HLS streaming. |

#### 📁 `src/movies/dto/`
| File | Chức năng |
|------|-----------|
| `create-movie.dto.ts` | Validate tạo phim: `title`, `description`, `releaseYear`, `durationSeconds`, `genreIds[]`, `actors[]`, `posterUrl`. |
| `update-movie.dto.ts` | Validate cập nhật phim (tất cả trường optional, dùng `PartialType`). |
| `list-movies.dto.ts` | Validate query tìm kiếm: `page`, `limit`, `q` (từ khóa). |
| `publish.dto.ts` | Validate xuất bản: `published` (boolean). |

---

### 📁 `src/upload/` — Upload file lên S3/MinIO

Quản lý presigned URL upload + ghi nhận upload hoàn tất.

| File | Chức năng |
|------|-----------|
| `upload.module.ts` | Đăng ký module Upload, đăng ký BullMQ queue "encode". |
| `upload.service.ts` | **Logic upload**: `getPresignedUrl()` (tạo URL tạm để client upload trực tiếp lên S3), `uploadComplete()` (ghi nhận upload → nếu video: trigger encode job vào BullMQ, nếu thumbnail: cập nhật posterUrl), `ensureBucketExists()` (tự tạo bucket nếu chưa có). |
| `upload.controller.ts` | **API endpoints** (admin only): `GET /upload/presigned-url`, `POST /upload/complete/:movieId`. |

#### 📁 `src/upload/dto/`
| File | Chức năng |
|------|-----------|
| `upload-complete.dto.ts` | Validate xác nhận upload: `objectKey`, `fileType` (`video` / `thumbnail`). |

---

### 📁 `src/encode/` — Mã hóa video FFmpeg → HLS

Worker xử lý nền: download video gốc → encode FFmpeg → upload HLS lên S3.

| File | Chức năng |
|------|-----------|
| `encode.module.ts` | Đăng ký module Encode, đăng ký BullMQ queue "encode" + processor. |
| `encode.constants.ts` | **Hằng số**: tên queue (`encode`), tên job (`encode-hls`), interface `EncodeJobData`, **HLS_PROFILES** (480p: 854×480/1Mbps, 720p: 1280×720/2.5Mbps). |
| `encode.processor.ts` | **Worker BullMQ** (concurrency=1). Luồng: Download S3 → Encode từng profile bằng FFmpeg (H.264 + AAC → HLS segments .ts + playlist .m3u8) → Tạo master.m3u8 → Upload HLS lên S3 → Cập nhật DB (`encodeStatus=ready`, `playbackUrl`). Tự dọn file tạm. |

---

### 📁 `src/users/` — Quản lý người dùng

| File | Chức năng |
|------|-----------|
| `users.module.ts` | Đăng ký module Users. |
| `users.service.ts` | **Logic user**: `findByEmail()`, `findById()`, `create()` (dùng bởi auth), `getProfile()`, `updateProfile()` (đổi tên, avatar), `changePassword()` (yêu cầu MK cũ), `findAll()` (admin, phân trang), `toggleUserStatus()` (admin vô hiệu hóa/kích hoạt tài khoản). |
| `users.controller.ts` | **API endpoints**: `GET /users/profile`, `PUT /users/profile`, `POST /users/change-password`. |

---

### 📁 `src/favorites/` — Danh sách phim yêu thích

| File | Chức năng |
|------|-----------|
| `favorites.module.ts` | Đăng ký module Favorites. |
| `favorites.service.ts` | **Logic favorites**: `addFavorite()` (kiểm tra phim published+ready trước khi thêm), `removeFavorite()`, `getFavorites()` (phân trang), `isFavorite()` (kiểm tra đã thích chưa). |
| `favorites.controller.ts` | **API endpoints**: `POST /favorites/:movieId`, `DELETE /favorites/:movieId`, `GET /favorites`, `GET /favorites/:movieId/check`. |

---

### 📁 `src/history/` — Lịch sử & tiến trình xem phim

| File | Chức năng |
|------|-----------|
| `history.module.ts` | Đăng ký module History. |
| `history.service.ts` | **Logic history**: `upsertProgress()` (lưu/cập nhật giây đã xem, tự đánh dấu hoàn thành ≥90%), `getProgress()`, `getHistory()` (phân trang), `getContinueWatching()` (phim chưa xem xong, tối đa 10), `removeHistory()`. |
| `history.controller.ts` | **API endpoints**: `POST /history/:movieId/progress`, `GET /history/:movieId/progress`, `GET /history`, `GET /history/continue-watching`, `DELETE /history/:movieId`. |

---

### 📁 `src/ratings/` — Đánh giá & bình luận phim

| File | Chức năng |
|------|-----------|
| `ratings.module.ts` | Đăng ký module Ratings. |
| `ratings.service.ts` | **Logic ratings**: `createOrUpdate()` (upsert: 1 user chỉ 1 đánh giá/phim), `getRating()`, `getMovieRatings()` (phân trang), `getStats()` (điểm trung bình + tổng lượt), `deleteRating()`. |
| `ratings.controller.ts` | **API endpoints**: `POST /ratings/:movieId`, `GET /ratings/:movieId`, `GET /ratings/:movieId/all`, `GET /ratings/:movieId/stats`, `DELETE /ratings/:movieId`. |

#### 📁 `src/ratings/dto/`
| File | Chức năng |
|------|-----------|
| `rate-movie.dto.ts` | Validate đánh giá: `score` (1-5), `comment` (optional). |

---

### 📁 `src/genres/` — Thể loại phim

| File | Chức năng |
|------|-----------|
| `genres.module.ts` | Đăng ký module Genres. |
| `genres.service.ts` | **Logic genres**: `create()` (tạo + auto-slug: "Hành Động" → "hanh-dong"), `findAll()` (kèm số phim/thể loại), `findById()` (kèm danh sách phim), `update()`, `delete()` (cascade xóa liên kết MovieGenre). |
| `genres.controller.ts` | **API endpoints**: `POST /genres` (admin), `GET /genres` (public), `GET /genres/:id`, `PUT /genres/:id` (admin), `DELETE /genres/:id` (admin). |

---

### 📁 `src/admin/` — Quản trị hệ thống

| File | Chức năng |
|------|-----------|
| `admin.module.ts` | Đăng ký module Admin. |
| `admin.service.ts` | **Logic admin**: `getDiagnostics()` (health check 3 hệ thống: Database/PostgreSQL, Redis, S3/MinIO — chạy song song, đo latency), `getUsers()`, `toggleUserStatus()`. |
| `admin.controller.ts` | **API endpoints** (admin only): `GET /admin/diagnostics`, `GET /admin/users`, `PATCH /admin/users/:id/status`. |

#### 📁 `src/admin/dto/`
| File | Chức năng |
|------|-----------|
| `create-user.dto.ts` | Validate tạo user (admin): `email`, `password`, `role`. |
| `update-user.dto.ts` | Validate cập nhật user (admin): `displayName`, `isActive`, v.v. |

---

### 📁 `src/common/` — Thành phần dùng chung

Module toàn cục (`@Global()`) chứa guards, decorators, utils, filters, middleware.

| File | Chức năng |
|------|-----------|
| `common.module.ts` | Module toàn cục — export `PolicyGuard` và `RolesGuard` cho toàn app. |

#### 📁 `src/common/guards/`
| File | Chức năng |
|------|-----------|
| `policy.guard.ts` | **Guard BOLA Protection** (OWASP API1:2023). Kiểm tra quyền truy cập tài nguyên theo 4 loại policy: `MovieRead` (viewer chỉ xem phim published+ready), `MovieWrite` (admin only), `MovieVisible` (kiểm tra visibility), `UserOwned` (sở hữu tài nguyên). Truy vấn DB để kiểm tra. |
| `roles.guard.ts` | **Guard phân quyền Role**. Đọc metadata `@Roles()` → kiểm tra `user.role` có nằm trong danh sách yêu cầu không. |

#### 📁 `src/common/decorators/`
| File | Chức năng |
|------|-----------|
| `check-policy.decorator.ts` | Decorator gắn metadata policy: `@MovieReadPolicy('id')`, `@MovieVisiblePolicy('movieId')`, `@MovieWritePolicy()`, `@UserOwnedPolicy()`. PolicyGuard đọc metadata này. |
| `current-user.decorator.ts` | Decorator `@CurrentUser()` — lấy user đang đăng nhập từ `request.user`. Hỗ trợ lấy field cụ thể: `@CurrentUser('id')`. |
| `roles.decorator.ts` | Decorator `@Roles('admin', 'viewer')` — gắn danh sách role yêu cầu. RolesGuard đọc metadata này. |

#### 📁 `src/common/filters/`
| File | Chức năng |
|------|-----------|
| `http-exception.filter.ts` | **Bộ lọc lỗi toàn cục** (`@Catch()`). Bắt tất cả exception → chuẩn hóa thành format: `{ error: { code, message, details, requestId } }`. Xử lý đặc biệt: lỗi class-validator (mảng message → `VALIDATION_FAILED`). |

#### 📁 `src/common/middleware/`
| File | Chức năng |
|------|-----------|
| `request-id.middleware.ts` | Gắn UUID cho mỗi request (đọc từ header `x-request-id` hoặc tự tạo). Trả ID trong response header. Log structured JSON khi response hoàn tất (method, path, status, duration). Bỏ qua `/health`. |

#### 📁 `src/common/utils/`
| File | Chức năng |
|------|-----------|
| `security.ts` | Hàm tiện ích bảo mật: `normalizeEmail()` (trim + lowercase), `assertStrongPassword()` (≥8 ký tự, có chữ + số). |
| `storage-url.ts` | Chuẩn hóa URL file S3: `buildS3PublicUrl()` (base + key → URL đầy đủ), `normalizeS3AssetUrl()` (nhận URL bất kỳ format → URL công khai thống nhất). |
| `logging.ts` | Log an toàn: `maskPresignedUrl()` (ẩn chữ ký S3 trong log), `maskObjectKey()` (rút gọn key dài), `maskObjectForLogging()` (đệ quy mask URL trong object). |

---

### 📁 `src/config/` — Cấu hình

| File | Chức năng |
|------|-----------|
| `security.config.ts` | Cấu hình bảo mật: CORS origins, JWT access TTL, refresh TTL, password policy. Đọc từ biến `.env`. |
| `env.validation.ts` | Validate biến môi trường khi khởi chạy: kiểm tra tất cả biến bắt buộc (DATABASE_URL, JWT_SECRET, ...) có tồn tại không → crash sớm nếu thiếu. |
| `config-parsers.ts` | Hàm parse biến .env: `parseBoolean()`, `parseInt()`, `parseCorsOrigins()` (chuỗi CSV → mảng). |

---

### 📁 `src/mail/` — Gửi email

| File | Chức năng |
|------|-----------|
| `mail.module.ts` | Đăng ký module Mail. |
| `mail.service.ts` | Gửi email qua SMTP: `sendPasswordResetEmail()` (gửi link đặt lại mật khẩu). Đọc cấu hình SMTP từ .env. |

---

### 📁 `src/health/` — Health check

| File | Chức năng |
|------|-----------|
| `health.controller.ts` | Endpoint `GET /health` (không có prefix /api). Trả `{ status: 'ok' }`. Dùng cho monitoring/load balancer kiểm tra server sống. |

---

### 📁 `src/prisma/` — Prisma ORM Service

| File | Chức năng |
|------|-----------|
| `prisma.module.ts` | Đăng ký module Prisma (`@Global()`) — PrismaService dùng ở mọi nơi. |
| `prisma.service.ts` | Wrapper quanh PrismaClient: tự kết nối DB khi khởi tạo (`onModuleInit`), tự ngắt khi tắt (`onModuleDestroy`). |

---

### 📁 `prisma/` — Database Schema & Migrations

| File | Chức năng |
|------|-----------|
| `schema.prisma` | **Schema database**: định nghĩa tất cả bảng (User, Movie, Genre, MovieGenre, Favorite, WatchHistory, Rating, Upload, RefreshToken, PasswordResetToken, Notification). Quan hệ, index, enum. |
| `seed.ts` | Script seed dữ liệu mẫu: tạo admin, genres, movies mẫu. Chạy: `pnpm prisma db seed`. |
| `seed-reviews.ts` | Script seed đánh giá mẫu cho phim. |
| `migrations/` | Thư mục chứa các file migration SQL (lịch sử thay đổi schema DB). |

---

### 📁 `scripts/` — Script tiện ích

| File | Chức năng |
|------|-----------|
| `import-tmdb.ts` | Import dữ liệu phim từ **TMDb API** (The Movie Database): tải phim phổ biến, poster, thể loại, diễn viên → lưu vào DB. |
| `import-tmdb.js` | Phiên bản compiled JavaScript của script trên. |
| `seed-shared.ts` | Hàm seed dùng chung: tạo genres, movies mẫu (được gọi bởi seed.ts). |
| `seed-test-users.ts` | Tạo user test: admin + viewer mẫu. |
| `reset-admin-password.ts` | Reset mật khẩu admin về giá trị mặc định. |
| `migrate-poster-urls.ts` | Script migration: chuẩn hóa posterUrl cũ trong DB sang format mới. |

---

## 🔄 Luồng dữ liệu chính

### 1. Đăng ký/Đăng nhập
```
Client → AuthController → AuthService → UsersService → Prisma → PostgreSQL
                                       ↓
                                  JwtService (ký token)
```

### 2. Upload & Encode Video
```
Client → UploadController → UploadService → S3 (presigned URL)
                                           ↓
Client ────────────────────────────→ S3 (upload trực tiếp)
                                           ↓
        UploadService.uploadComplete() → BullMQ Queue
                                           ↓
        EncodeProcessor (Worker) → Download S3 → FFmpeg → Upload HLS → Update DB
```

### 3. Xem phim (Streaming)
```
Client → MoviesController → MoviesService → getStreamUrl()
                                           ↓
                              Trả playbackUrl (master.m3u8)
                                           ↓
Client → HLS.js → S3 (tải segments .ts trực tiếp)
```

### 4. Luồng bảo vệ Route
```
Request → RequestIdMiddleware → JwtAuthGuard → RolesGuard → PolicyGuard → Controller
           (gắn UUID)         (giải mã JWT)   (kiểm role)  (kiểm BOLA)   (xử lý)
```
