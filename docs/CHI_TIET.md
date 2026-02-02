# CHI TIẾT CHƯƠNG TRÌNH NETFLOP

> **Đồ án tốt nghiệp - Netflix mini cho video tự sản xuất**
> Generated: 02-01-2026

---

## 1. TỔNG QUAN

**Netflop** là ứng dụng xem video streaming với "Netflix vibe", bao gồm:
- 📱 Mobile App để viewer xem phim
- 🌐 Viewer Website để viewer xem phim trên web
- 🖥️ Admin Dashboard để quản lý phim/upload
- 🚀 API backend với authentication
- ⚙️ Worker để encode video MP4 → HLS

---

## 2. TECH STACK

| Component | Technology | Mô tả |
|-----------|------------|-------|
| **Monorepo** | pnpm + Turborepo | Quản lý multi-package |
| **API** | NestJS + Prisma | RESTful API, JWT auth |
| **Database** | PostgreSQL 15 | Dữ liệu quan hệ |
| **Queue** | BullMQ + Redis | Job queue cho encode |
| **Storage** | MinIO (S3-compatible) | Lưu video/HLS segments |
| **Admin** | Next.js 15 | CMS quản lý phim |
| **Web** | Next.js 15 | Website xem phim (viewer) |
| **Mobile** | Expo React Native | App xem phim |
| **Worker** | Node.js + FFmpeg | Encode HLS |

---

## 3. CẤU TRÚC DỰ ÁN

```
netflop/
├── apps/
│   ├── api/           # NestJS API (port 3000)
│   ├── admin/         # Admin Dashboard (port 3001)
│   ├── web/           # Viewer Website (port 3002)
│   ├── mobile/        # Expo React Native
│   └── worker/        # BullMQ Encode Worker
├── packages/
│   ├── shared/        # Shared types
│   └── tsconfig/      # TypeScript configs
├── docker-compose.yml
└── turbo.json
```

---

## 4. CÁC ỨNG DỤNG

### 4.1 API (apps/api)

**Port:** 3000

**Modules:**
- `AuthModule` - Register, Login, JWT, Refresh Token
- `MoviesModule` - CRUD phim, search, filter, stream URL
- `GenresModule` - Thể loại phim
- `FavoritesModule` - Danh sách yêu thích
- `WatchHistoryModule` - Lịch sử xem, resume
- `UploadModule` - Presigned URL upload
- `AdminModule` - Diagnostics, queue status

**Endpoints chính:**
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/auth/register | Đăng ký |
| POST | /api/auth/login | Đăng nhập |
| POST | /api/auth/refresh | Refresh token |
| GET | /api/auth/me | Thông tin user hiện tại |
| GET | /api/movies | Danh sách phim |
| GET | /api/movies/:id | Chi tiết phim |
| GET | /api/movies/:id/stream | Lấy URL stream HLS |
| GET | /api/genres | Danh sách thể loại |
| GET | /api/favorites | Phim yêu thích |
| GET | /api/history | Lịch sử xem |
| GET | /api/upload/presigned-url | Lấy URL upload |

---

### 4.2 Admin Dashboard (apps/admin)

**Port:** 3001

**Chức năng:**
- Đăng nhập (chỉ role admin)
- Quản lý phim (CRUD)
- Upload video/thumbnail
- Theo dõi encode status
- Publish phim

**Tech:** Next.js 15, React Query, CSS Modules

---

### 4.3 Viewer Website (apps/web)

**Port:** 3002

**Chức năng:**
- Đăng nhập (viewer + admin)
- Browse phim theo genre
- Xem chi tiết phim
- Video player HLS
- Favorites
- Watch history

**Tech:** Next.js 15, React Query, hls.js

---

### 4.4 Mobile App (apps/mobile)

**Tech:** Expo React Native

**Chức năng:**
- Đăng nhập
- Browse phim
- Video player
- Favorites
- Continue watching (resume)

---

### 4.5 Worker (apps/worker)

**Chức năng:**
- Consume job từ BullMQ queue
- Download video từ MinIO
- FFmpeg encode MP4 → HLS multi-bitrate (360p, 480p, 720p)
- Upload segments lên MinIO
- Callback API update encode status

---

## 5. DATABASE SCHEMA

### Bảng chính:

| Bảng | Mô tả |
|------|-------|
| `users` | Người dùng (viewer/admin) |
| `refresh_tokens` | JWT refresh tokens |
| `movies` | Thông tin phim |
| `genres` | Thể loại |
| `movie_genres` | Liên kết movie-genre |
| `favorites` | Phim yêu thích |
| `watch_history` | Lịch sử xem + progress |
| `uploads` | Tracking file upload |
| `encode_jobs` | Tracking encode status |

### Enums:

- `user_role`: viewer, admin
- `movie_status`: draft, published
- `encode_status`: pending, processing, ready, failed

---

## 6. LUỒNG HOẠT ĐỘNG

### 6.1 Upload & Encode Flow

```
Admin Upload Video:
1. Admin tạo movie (draft)
2. Admin request presigned URL
3. Admin upload MP4 trực tiếp lên MinIO
4. Admin gọi `POST /api/movies/:id/upload-complete` (alias deprecated: `/api/upload/complete/:movieId`)
5. API enqueue encode job
6. Worker consume job, encode HLS
7. Worker upload HLS lên MinIO
8. Worker update DB: encode_status = ready
9. Admin publish phim
```

### 6.2 Viewer Playback Flow

```
Viewer xem phim:
1. Viewer login → nhận JWT token
2. Viewer browse movies (GET /api/movies)
3. Viewer chọn phim → GET /api/movies/:id
4. Viewer request stream → GET /api/movies/:id/stream
5. API trả playbackUrl (public hoặc presigned) cho master.m3u8
6. Player load HLS và stream segments
7. Viewer xem, progress được save định kỳ
8. Viewer thoát, quay lại → resume từ progress
```

---

## 7. INFRASTRUCTURE (Docker Compose)

| Service | Port | Mô tả |
|---------|------|-------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Queue + Cache |
| MinIO (API) | 9000 | Object Storage |
| MinIO (Console) | 9001 | Web UI |

---

## 8. TÀI KHOẢN MẶC ĐỊNH

| Email | Password | Role | Dùng ở đâu |
|-------|----------|------|------------|
| admin@netflop.local | admin123 | Admin | Admin Dashboard |
| viewer@netflop.local | viewer123 | Viewer | Web + Mobile |

---

## 9. COMMANDS

```bash
# Install dependencies
pnpm install

# Start infrastructure (Docker)
docker compose up -d

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start all dev servers
pnpm dev

# Build all
pnpm build

# Lint all
pnpm lint

# Typecheck all
pnpm typecheck
```

---

## 10. URLS DEVELOPMENT

| Service | URL |
|---------|-----|
| API Health | http://localhost:3000/health |
| Admin Dashboard | http://localhost:3001 |
| Viewer Website | http://localhost:3002 |
| MinIO Console | http://localhost:9001 |

---

## 11. ENVIRONMENT VARIABLES (.env)

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/netflop

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_PRESIGN_BASE_URL=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=netflop-media
S3_PUBLIC_BASE_URL=http://localhost:9000/netflop-media

# CORS
CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:19006
```

---

## 12. TÍNH NĂNG BẢO MẬT

| Feature | Implementation |
|---------|----------------|
| Password | bcrypt hash (10 rounds) |
| Authentication | JWT Bearer Token |
| Authorization | @Roles decorator + RolesGuard |
| CORS | Whitelist origins |
| Rate Limiting | @nestjs/throttler |
| Input Validation | class-validator |

---

## 13. QUAN SÁT (Observability)

- **Request ID**: Mỗi request có unique ID trong header `x-request-id`
- **Structured Logging**: HTTP logs với method, path, status, duration
- **Queue Monitoring**: Admin endpoint `/api/admin/queue-summary`
- **Job Cleanup**: Tự động xóa jobs cũ (BullMQ)

---

## 14. FILES TÀI LIỆU

| File | Nội dung |
|------|----------|
| README.md | Quick start guide |
| PRD.md | Product Requirements |
| ARCHITECTURE.md | System architecture |
| DATABASE_SCHEMA.md | Database design |
| OPENAPI.yaml | API specification |
| OBSERVABILITY.md | Monitoring/logging |
| DEPLOY_STAGING.md | Deployment guide |

---

> **Note:** Đây là đồ án tốt nghiệp với scope giới hạn. Production deployment cần thêm CDN, DRM, và scaling infrastructure.
