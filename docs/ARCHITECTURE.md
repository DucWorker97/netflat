# ARCHITECTURE.md – netflop

> **Phiên bản:** 1.0  
> **Ngày tạo:** 01-01-2026  
> **Tác giả:** System Architect

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Sơ đồ kiến trúc](#2-sơ-đồ-kiến-trúc)
3. [Luồng nghiệp vụ End-to-End](#3-luồng-nghiệp-vụ-end-to-end)
4. [Thiết kế Streaming HLS](#4-thiết-kế-streaming-hls)
5. [Module Breakdown (NestJS)](#5-module-breakdown-nestjs)
6. [Queue/Worker Design (BullMQ)](#6-queueworker-design-bullmq)
7. [Environment Variables & Local Dev Runbook](#7-environment-variables--local-dev-runbook)
8. [NFR (Non-Functional Requirements)](#8-nfr-non-functional-requirements)

---

# 1. Tổng quan hệ thống

## 1.1 Thành phần chính

| Thành phần | Công nghệ | Trách nhiệm | Port (local) |
|------------|-----------|-------------|--------------|
| **Mobile App (Viewer)** | Expo React Native | Giao diện người dùng xem phim: browse, search, play HLS, resume, favorites | Expo Go / Dev Client |
| **Admin Web (CMS)** | Next.js 14 (App Router) | Quản trị nội dung: CRUD movies, upload video/thumbnail, theo dõi encode, publish | `3001` |
| **API Service** | NestJS + Prisma | RESTful API: auth, movies, genres, favorites, history, upload, admin RBAC | `3000` |
| **Encode Worker** | Node.js TS + FFmpeg | Consume job từ queue, encode MP4 → HLS multi-bitrate, upload output lên storage | N/A (background) |
| **PostgreSQL** | PostgreSQL 15+ | Lưu trữ dữ liệu quan hệ: users, movies, genres, favorites, watch_history, encode_jobs | `5432` |
| **Redis** | Redis 7+ | Queue (BullMQ) + Cache (optional) | `6379` |
| **Object Storage** | MinIO (local) / S3 / R2 | Lưu originals, posters, HLS segments | `9000` (API) / `9001` (Console) |
| **CDN (Deploy)** | CloudFront / Cloudflare (optional) | Cache & deliver HLS segments tới viewer | N/A |

## 1.2 Giao tiếp giữa các thành phần

```
Mobile App  ────┐
                │──► API Service ◄──── Admin Web
                │         │
                │         ├──► PostgreSQL (data)
                │         ├──► Redis (queue + cache)
                │         └──► Object Storage (presigned URLs)
                │
                └──► Object Storage (stream HLS trực tiếp / qua CDN)
                
Encode Worker ◄──── Redis (BullMQ) ◄──── API Service (enqueue)
      │
      ├──► Object Storage (read original, write HLS)
      └──► API Service (callback update encode_status)
```

---

# 2. Sơ đồ kiến trúc

## 2.1 System / Container Overview

```mermaid
C4Context
    title netflop - System Context Diagram

    Person(viewer, "Viewer", "Người xem phim trên mobile")
    Person(admin, "Admin", "Quản trị nội dung trên web")

    System_Boundary(netflop, "netflop Platform") {
        Container(mobile, "Mobile App", "Expo React Native", "Browse, search, play HLS, resume")
        Container(adminWeb, "Admin Web", "Next.js", "CRUD movies, upload, publish")
        Container(api, "API Service", "NestJS", "REST API, auth, RBAC")
        Container(worker, "Encode Worker", "Node.js + FFmpeg", "Encode MP4 → HLS")
        ContainerDb(postgres, "PostgreSQL", "Database", "Users, Movies, Genres, History")
        ContainerDb(redis, "Redis", "Queue + Cache", "BullMQ jobs")
        Container(storage, "Object Storage", "MinIO / S3", "Videos, Posters, HLS")
    }

    Rel(viewer, mobile, "Uses")
    Rel(admin, adminWeb, "Uses")
    Rel(mobile, api, "REST API", "HTTPS")
    Rel(adminWeb, api, "REST API", "HTTPS")
    Rel(api, postgres, "Prisma ORM")
    Rel(api, redis, "BullMQ / Cache")
    Rel(api, storage, "Presigned URLs")
    Rel(worker, redis, "Consume jobs")
    Rel(worker, storage, "Read/Write")
    Rel(worker, api, "Callback", "HTTP")
    Rel(mobile, storage, "Stream HLS", "HTTPS")
```

## 2.2 Data Flow: Upload → Encode → Playback

```mermaid
flowchart TB
    subgraph Admin["Admin Web"]
        A1[Create Movie Draft]
        A2[Request Presigned URL]
        A3[Upload MP4 to Storage]
        A4[Call upload-complete API]
    end

    subgraph API["API Service"]
        B1[Generate Presigned URL]
        B2[Enqueue Encode Job]
        B3[Update encode_status]
        B4[Return Stream URL]
    end

    subgraph Worker["Encode Worker"]
        C1[Consume Job from Queue]
        C2[Download Original MP4]
        C3[FFmpeg Encode HLS]
        C4[Upload HLS to Storage]
        C5[Callback API: ready/failed]
    end

    subgraph Storage["Object Storage"]
        D1[originals/movieId/original.mp4]
        D2[hls/movieId/master.m3u8]
        D3[hls/movieId/v0/...]
        D4[hls/movieId/v1/...]
        D5[hls/movieId/v2/...]
    end

    subgraph Mobile["Mobile App"]
        E1[Request Stream URL]
        E2[Play HLS master.m3u8]
    end

    A1 --> A2
    A2 --> B1
    B1 --> A3
    A3 --> D1
    A3 --> A4
    A4 --> B2
    B2 --> C1
    C1 --> C2
    C2 --> D1
    C2 --> C3
    C3 --> C4
    C4 --> D2
    C4 --> D3
    C4 --> D4
    C5 --> B3
    C4 --> C5

    E1 --> B4
    B4 --> E2
    E2 --> D2
```

---

# 3. Luồng nghiệp vụ End-to-End

## 3.1 Viewer Flow: Login → Home → Play → Resume

```mermaid
sequenceDiagram
    autonumber
    participant V as Viewer (Mobile)
    participant API as API Service
    participant DB as PostgreSQL
    participant S as Object Storage

    V->>API: POST /api/auth/login {email, password}
    API->>DB: Verify credentials
    DB-->>API: User record
    API-->>V: {accessToken, refreshToken, user}

    V->>API: GET /api/movies?page=1
    API->>DB: Query published + ready movies
    DB-->>API: Movies list
    API-->>V: {data: [...], meta: {page, total}}

    V->>API: GET /api/movies/:id
    API->>DB: Get movie detail
    DB-->>API: Movie
    API-->>V: {data: movie}

    V->>API: GET /api/movies/:id/stream
    API->>DB: Check user authenticated
    API->>S: Generate signed URL (TTL 1h)
    S-->>API: Playback URL (public or signed)
    API-->>V: {playbackUrl}

    V->>S: GET master.m3u8 (signed)
    S-->>V: HLS Playlist
    V->>S: GET segments (v2/seg_000.ts, ...)
    S-->>V: Video segments

    Note over V: Viewer watches 30 seconds
    V->>API: POST /api/history/:movieId {progressSeconds: 30, durationSeconds: 120}
    API->>DB: Upsert watch_history
    DB-->>API: OK
    API-->>V: 200 OK

    Note over V: Viewer exits app, reopens later
    V->>API: GET /api/movies?continueWatching=true
    API->>DB: Query watch_history (progress > 0, not completed)
    DB-->>API: Continue watching movies
    API-->>V: {data: [...]}

    V->>API: GET /api/movies/:id/progress
    API->>DB: Get progress for user + movie
    DB-->>API: {progressSeconds: 30}
    API-->>V: {progressSeconds: 30}

    Note over V: Player resumes from 30s
```

## 3.2 Admin Flow: Upload → Encode → Publish

```mermaid
sequenceDiagram
    autonumber
    participant A as Admin (CMS)
    participant API as API Service
    participant DB as PostgreSQL
    participant Q as Redis (BullMQ)
    participant W as Encode Worker
    participant S as Object Storage

    A->>API: POST /api/auth/login {email, password}
    API->>DB: Verify admin role
    API-->>A: {accessToken, user: {role: admin}}

    A->>API: POST /api/movies {title, description, genreIds}
    API->>DB: Insert movie (draft, pending)
    DB-->>API: Movie created
    API-->>A: {data: movie}

    A->>API: GET /api/upload/presigned-url {fileName, contentType, sizeBytes}
    API->>S: Create presigned PUT URL
    S-->>API: {uploadUrl, objectKey}
    API-->>A: {uploadUrl, objectKey}

    A->>S: PUT uploadUrl (upload MP4)
    S-->>A: 200 OK

    A->>API: POST /api/movies/:id/upload-complete {objectKey}
    API->>DB: Update movie.original_key
    API->>Q: Enqueue ENCODE_HLS job
    Q-->>API: Job ID
    API->>DB: Update encode_status = pending
    API-->>A: {jobId, encodeStatus: pending}

    Q->>W: Consume job
    W->>DB: Update encode_status = processing
    W->>S: Download original MP4
    S-->>W: MP4 file
    W->>W: FFmpeg encode (360p, 480p, 720p)
    W->>S: Upload master.m3u8, v0/, v1/, v2/
    S-->>W: OK
    W->>API: POST /internal/encode-callback {movieId, status: ready, playbackUrl}
    API->>DB: Update encode_status = ready, playback_url
    API-->>W: OK

    A->>API: GET /api/movies/:id (polling)
    API-->>A: {encodeStatus: ready}

    A->>API: PATCH /api/movies/:id/publish {published: true}
    API->>DB: Update movie_status = published
    API-->>A: {data: movie}

    Note over A: Movie now visible to viewers
```

---

# 4. Thiết kế Streaming HLS

## 4.1 Output Format

| Item | Mô tả |
|------|-------|
| Master Playlist | `master.m3u8` - chứa links tới variant playlists |
| Variant 360p | `v0/prog_index.m3u8` + segments `seg_*.ts` (640x360, ~800kbps) |
| Variant 480p | `v1/prog_index.m3u8` + segments `seg_*.ts` (854x480, ~1400kbps) |
| Variant 720p | `v2/prog_index.m3u8` + segments `seg_*.ts` (1280x720, ~2800kbps) |
| Segment duration | 6 giây |

## 4.2 Quy ước đường dẫn Storage

```
bucket/
├── posters/
│   └── {movieId}/
│       └── poster.jpg
├── thumbnails/
│   └── {movieId}/
│       └── thumb.jpg
├── subtitles/
│   └── {movieId}/
│       └── track.vtt
├── originals/
│   └── {movieId}/
│       └── original.mp4
└── hls/
    └── {movieId}/
        ├── master.m3u8
        ├── v0/
        │   ├── prog_index.m3u8
        │   ├── seg_000.ts
        │   ├── seg_001.ts
        │   └── ...
        ├── v1/
        │   ├── prog_index.m3u8
        │   ├── seg_000.ts
        │   └── ...
        └── v2/
            ├── prog_index.m3u8
            ├── seg_000.ts
            └── ...
```

## 4.3 FFmpeg Command Template

```bash
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]split=3[v0][v1][v2]; \
    [v0]scale=640:360[v0out]; \
    [v1]scale=854:480[v1out]; \
    [v2]scale=1280:720[v2out]" \
  -map "[v0out]" -map 0:a? -map "[v1out]" -map 0:a? -map "[v2out]" -map 0:a? \
  -f hls -hls_time 4 -hls_playlist_type vod -hls_flags independent_segments \
  -master_pl_name master.m3u8 \
  -hls_segment_filename "v%v/seg_%03d.ts" \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
  v%v/prog_index.m3u8
```

Sau đó generate `master.m3u8`:

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
v0/prog_index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
v1/prog_index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
v2/prog_index.m3u8
```

## 4.4 Chính sách "Bảo vệ nhẹ"

| Hạng mục | Cách xử lý |
|----------|------------|
| **Endpoint bảo vệ** | `GET /api/movies/:id/stream` yêu cầu Bearer token hợp lệ |
| **Playback URL** | Public URL khi `S3_PUBLIC_BASE_URL` được set; nếu không sẽ dùng presigned URL |
| **Segment access (dev/staging)** | `hls/`, `posters/`, `thumbnails/`, `subtitles/` được public để player load segments |
| **Segment access (prod)** | Có thể chuyển sang signed playlist/segment hoặc proxy streaming |
| **Alternative: Stream ticket** | API trả về 1-time ticket, client gửi kèm query param `?ticket=xxx` |

> **Lưu ý:** Đây không phải DRM, nội dung vẫn có thể bị download nếu có signed URL. Chỉ đủ cho demo "bảo vệ nhẹ".

---

# 5. Module Breakdown (NestJS)

## 5.1 Danh sách Modules

```
src/
├── app.module.ts
├── common/
│   ├── decorators/       # @CurrentUser, @Roles
│   ├── filters/          # HttpExceptionFilter
│   ├── guards/           # JwtAuthGuard, RolesGuard
│   ├── interceptors/     # LoggingInterceptor, TransformInterceptor
│   └── pipes/            # ValidationPipe config
├── config/
│   └── config.module.ts  # Environment validation
├── prisma/
│   └── prisma.module.ts  # PrismaService
├── auth/
│   └── auth.module.ts
├── users/
│   └── users.module.ts
├── movies/
│   └── movies.module.ts
├── genres/
│   └── genres.module.ts
├── favorites/
│   └── favorites.module.ts
├── watch-history/
│   └── watch-history.module.ts
├── upload/
│   └── upload.module.ts
└── encode/
    └── encode.module.ts  # BullMQ producer + internal callback
```

## 5.2 Chi tiết từng Module

### AuthModule

| Item | Mô tả |
|------|-------|
| **Controllers** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me` |
| **Services** | `AuthService`: hash password (bcrypt), generate JWT, verify refresh token |
| **DTOs** | `RegisterDto`, `LoginDto`, `RefreshDto` (class-validator) |
| **Exceptions** | `UnauthorizedException`, `ConflictException` (email exists) |

### UsersModule

| Item | Mô tả |
|------|-------|
| **Controllers** | Internal use (không expose public) |
| **Services** | `UsersService`: findByEmail, findById, create |
| **Exports** | `UsersService` cho AuthModule |

### MoviesModule

| Item | Mô tả |
|------|-------|
| **Controllers** | `GET /api/movies` (list, search, filter), `GET /api/movies/:id`, `GET /api/movies/:id/stream`, `GET /api/movies/:id/progress` |
| **Admin endpoints** | `POST /api/movies`, `PUT /api/movies/:id`, `DELETE /api/movies/:id`, `PATCH /api/movies/:id/publish` |
| **Services** | `MoviesService`: CRUD, search (ILIKE), filter by genre, generate stream URL |
| **DTOs** | `CreateMovieDto`, `UpdateMovieDto`, `QueryMoviesDto` (pagination, filters) |
| **Guards** | `@Roles('admin')` cho admin endpoints |

### GenresModule

| Item | Mô tả |
|------|-------|
| **Controllers** | `GET /api/genres` |
| **Admin (optional)** | CRUD genres |
| **Services** | `GenresService`: findAll |

### FavoritesModule

| Item | Mô tả |
|------|-------|
| **Controllers** | `GET /api/favorites`, `POST /api/favorites/:movieId`, `DELETE /api/favorites/:movieId` |
| **Services** | `FavoritesService`: add, remove, list (với movie details) |
| **Business rule** | Unique constraint user + movie |

### WatchHistoryModule

| Item | Mô tả |
|------|-------|
| **Controllers** | `GET /api/history`, `POST /api/history/:movieId` |
| **Services** | `WatchHistoryService`: upsert progress, list continue watching |
| **Business rule** | `completed = true` khi `progressSeconds >= 0.9 * durationSeconds` |
| **DTOs** | `UpdateProgressDto { progressSeconds, durationSeconds }` |

### UploadModule

| Item | Mô tả |
|------|-------|
| **Controllers** | `GET /api/upload/presigned-url`, `POST /api/movies/:id/upload-complete` (alias: `/api/upload/complete/:movieId`) |
| **Services** | `UploadService`: generate presigned PUT (MinIO/S3 SDK), validate file type/size |
| **Guards** | Admin only |
| **Trigger** | Enqueue encode job sau upload-complete |

### EncodeModule

| Item | Mô tả |
|------|-------|
| **BullMQ Producer** | Enqueue `ENCODE_HLS` job |
| **Internal Controller** (optional) | `POST /internal/encode-callback` (worker gọi khi xong) |
| **Services** | `EncodeService`: updateStatus |

## 5.3 DTO / Validation Strategy

- Sử dụng `class-validator` + `class-transformer`
- Global `ValidationPipe` với `whitelist: true, transform: true`
- DTOs extend `PartialType`, `PickType` từ `@nestjs/mapped-types`

## 5.4 Error Convention

```typescript
// Standard error response
{
  "error": {
    "code": "MOVIE_NOT_FOUND",
    "message": "Movie with id xxx not found",
    "details": null,
    "requestId": "uuid"
  }
}
```

| HTTP Status | Code prefix | Ví dụ |
|-------------|-------------|-------|
| 400 | `VALIDATION_*` | `VALIDATION_FAILED` |
| 401 | `AUTH_*` | `AUTH_INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN_*` | `FORBIDDEN_ADMIN_ONLY` |
| 404 | `*_NOT_FOUND` | `MOVIE_NOT_FOUND` |
| 409 | `*_CONFLICT` | `EMAIL_ALREADY_EXISTS` |
| 500 | `INTERNAL_*` | `INTERNAL_SERVER_ERROR` |

---

# 6. Queue/Worker Design (BullMQ)

## 6.1 Queue Configuration

| Item | Value |
|------|-------|
| Queue name | `encode` |
| Connection | Redis (same instance) |
| Concurrency | 1–2 (tuỳ CPU/RAM máy dev) |
| Default job options | `attempts: 3, backoff: { type: 'exponential', delay: 5000 }` |

## 6.2 Job Type

```typescript
interface EncodeHlsJobData {
  movieId: string;
  inputKey: string;       // e.g., "originals/{movieId}/original.mp4"
  outputPrefix: string;   // e.g., "hls/{movieId}"
  renditions: Array<{
    name: string;         // "v0", "v1", "v2"
    width: number;
    height: number;
    bitrate: string;      // "800k", "2800k"
  }>;
}
```

## 6.3 Job Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: Job enqueued
    pending --> processing: Worker picks up
    processing --> ready: Encode success
    processing --> failed: Encode error (after retries)
    ready --> [*]
    failed --> [*]
```

| Status | DB `encode_status` | Khi nào |
|--------|---------------------|---------|
| `pending` | `pending` | Job vừa enqueue |
| `processing` | `processing` | Worker bắt đầu xử lý |
| `ready` | `ready` | Encode thành công, `playback_url` có giá trị |
| `failed` | `failed` | Hết retry, lưu `error_message` |

## 6.4 Retry Policy

- **Attempts:** 3
- **Backoff:** Exponential (5s, 10s, 20s)
- **On final failure:** Update `encode_status = failed`, lưu error message
- **Admin re-trigger:** Gọi lại `POST /api/movies/:id/upload-complete` (alias: `/api/upload/complete/:movieId`) để enqueue job mới

## 6.5 Idempotency

- Worker xoá `outputPrefix` folder trước khi encode (cleanup)
- Hoặc overwrite existing segments
- Không tạo dữ liệu rác khi retry

## 6.6 Worker Process

```
apps/
└── worker/
    ├── src/
    │   ├── main.ts           # Worker entrypoint
    │   ├── encode.processor.ts
    │   ├── ffmpeg.service.ts
    │   └── storage.service.ts
    └── package.json
```

Worker là process riêng (không chạy trong API NestJS) để tránh block event loop.

---

# 7. Environment Variables & Local Dev Runbook

## 7.1 Environment Variables

```bash
# .env.example

# ─────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/netflop?schema=public"

# ─────────────────────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ─────────────────────────────────────────────────────────────
# JWT
# ─────────────────────────────────────────────────────────────
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_REFRESH_EXPIRES_IN="7d"

# ─────────────────────────────────────────────────────────────
# Object Storage (MinIO / S3)
# ─────────────────────────────────────────────────────────────
S3_ENDPOINT="http://localhost:9000"
S3_PRESIGN_BASE_URL="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="netflop"
S3_REGION="us-east-1"
S3_PUBLIC_BASE_URL="http://localhost:9000/netflop"

# ─────────────────────────────────────────────────────────────
# Upload / Stream
# ─────────────────────────────────────────────────────────────
UPLOAD_MAX_SIZE_MB=2048
UPLOAD_PRESIGNED_TTL_SECONDS=1800
STREAM_URL_TTL_SECONDS=3600

# ─────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────
CORS_ORIGINS="http://localhost:3001,exp://192.168.1.100:8081"

# ─────────────────────────────────────────────────────────────
# Worker (FFmpeg path nếu cần)
# ─────────────────────────────────────────────────────────────
FFMPEG_PATH="/usr/bin/ffmpeg"

# ─────────────────────────────────────────────────────────────
# API URL (cho Worker callback)
# ─────────────────────────────────────────────────────────────
API_INTERNAL_URL="http://localhost:3000"
```

## 7.2 Local Dev Runbook

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker + Docker Compose
- FFmpeg installed locally (hoặc trong Docker)

### Step-by-step

```bash
# 1. Clone repo
git clone https://github.com/your-org/netflop.git
cd netflop

# 2. Install dependencies
pnpm install

# 3. Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d postgres redis minio

# 4. Copy env
cp .env.example .env
# Edit .env if needed (ports, secrets)

# 5. Create MinIO bucket (first time)
# Open http://localhost:9001, login minioadmin/minioadmin
# Create bucket "netflop", set public read policy for /hls/, /posters/, /thumbnails/, /subtitles/ (optional)

# 6. Run Prisma migrations
pnpm --filter @netflop/api prisma migrate dev

# 7. Seed database
pnpm --filter @netflop/api prisma db seed

# 8. Start all services (Turborepo)
pnpm dev

# This runs concurrently:
# - API:    http://localhost:3000
# - Admin:  http://localhost:3001
# - Worker: background process
# - Mobile: Expo Dev Server

# 9. Smoke check
# - Open http://localhost:3000/api/health -> {"status":"ok"}
# - Open http://localhost:3001 -> Admin login page
# - Open Expo Go, scan QR -> Mobile app

# 10. Test upload flow
# - Login Admin (admin@netflop.local / admin123)
# - Create movie, upload short video
# - Check worker logs for encode progress
# - Publish, verify on mobile
```

### Docker Compose (docker-compose.yml)

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: netflop
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

---

# 8. NFR (Non-Functional Requirements)

## 8.1 Logging

### API Logging

```typescript
// Request log format (pino)
{
  "level": "info",
  "time": 1704067200000,
  "requestId": "uuid",
  "method": "GET",
  "path": "/api/movies",
  "statusCode": 200,
  "duration": 45,
  "userId": "uuid-or-null"
}
```

### Encode Worker Logging

```typescript
{
  "level": "info",
  "jobId": "bull-job-id",
  "movieId": "uuid",
  "event": "encode:start" | "encode:progress" | "encode:complete" | "encode:failed",
  "duration": 12345,  // ms, for complete
  "error": "..."      // for failed
}
```

## 8.2 Error Format (thống nhất)

```typescript
interface ErrorResponse {
  error: {
    code: string;      // e.g., "MOVIE_NOT_FOUND"
    message: string;   // Human-readable
    details?: any;     // Validation errors, etc.
    requestId: string; // For tracing
  };
}
```

## 8.3 Security Checklist (mức đồ án)

| Hạng mục | Triển khai |
|----------|------------|
| Password hashing | bcrypt (rounds = 10) |
| JWT validation | RS256 hoặc HS256 với secret đủ dài |
| RBAC | `@Roles('admin')` decorator + `RolesGuard` |
| Input validation | `class-validator` whitelist, max lengths |
| Upload validation | Check Content-Type, max size |
| Rate limiting | `@nestjs/throttler` (100 req/min IP) |
| CORS | Whitelist origins |
| SQL injection | Prisma parameterized queries |
| XSS | React auto-escape, CSP headers (admin) |

## 8.4 Performance Targets

| Metric | Target | Cách đo |
|--------|--------|---------|
| API cold start | < 3s | First request sau deploy |
| API response (list) | < 500ms p95 | Với 1000 movies, indexed |
| DB connection pool | 10 connections | Prisma config |
| Redis connection | Pool 5 | ioredis |
| HLS TTFF | < 3s | Expo video player on WiFi |

---

> **Ghi chú:** Tài liệu này là baseline architecture. Có thể điều chỉnh khi triển khai thực tế.
