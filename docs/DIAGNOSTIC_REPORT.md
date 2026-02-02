# Diagnostic Report: Upload & Playback Issues

> **Report Date**: 2026-01-17  
> **Issues Investigated**:  
> 1. Không xem phim song song Web + Mobile  
> 2. Upload phim không được

---

## 1. Executive Summary

**Root Cause #1 (HIGH - Parallel Viewing)**: Cấu hình `.env` có mâu thuẫn:
- `DEV_PUBLIC_HOST=localhost` (dòng 7)
- `S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/...` (dòng 42, hardcoded)
- `S3_PRESIGN_BASE_URL=http://10.0.2.2:9000` (dòng 43, hardcoded)
- `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000` (dòng 71, hardcoded)

**Kết quả**: Web nhận playbackUrl với `10.0.2.2` → không resolve được → không phát video. Mobile hoạt động vì `10.0.2.2` đúng cho Android Emulator.

**Root Cause #2 (MEDIUM - Upload)**: Không phát hiện lỗi upload cấu trúc. Nhưng nếu `S3_PRESIGN_BASE_URL` sai, presigned URL trả về cho client cũng sai host → client không PUT được tới MinIO.

**Fix nhanh**: Thống nhất `S3_PUBLIC_BASE_URL`, `S3_PRESIGN_BASE_URL` và `EXPO_PUBLIC_*` theo platform:
- **Web only**: dùng `localhost`
- **Mobile Emulator**: dùng `10.0.2.2`
- **Parallel (Web + Mobile)**: dùng IP LAN của máy (vd: `192.168.1.x`)

---

## 2. Bảng Nguyên nhân → Triệu chứng → Cách kiểm tra → Cách fix

| # | Nguyên nhân | Triệu chứng | Cách kiểm tra | Cách fix | Độ chắc chắn |
|---|-------------|-------------|---------------|----------|--------------|
| 1 | `.env` hardcode `10.0.2.2` trong `S3_PUBLIC_BASE_URL` nhưng `DEV_PUBLIC_HOST=localhost` | Web không load video, Mobile OK | Mở console Web → xem `playbackUrl` → chứa `10.0.2.2` | Sửa `.env`: set tất cả URL về IP LAN hoặc `localhost` (chọn 1) | **HIGH** |
| 2 | Presigned upload URL trả về host sai | Admin upload fail với lỗi CORS hoặc network | Inspect Network tab → PUT request → xem URL host | Sửa `S3_PRESIGN_BASE_URL` đúng host client có thể reach | **HIGH** |
| 3 | MinIO CORS chưa allow `localhost:3001` | Upload fail với CORS error | Check MinIO console → bucket settings → CORS | Add `http://localhost:3001` vào CORS allowed origins | **MEDIUM** |
| 4 | Segment URLs không signed (public mode) | Segment 403 nếu bucket không public | `curl http://<host>:9000/netflop-media/hls/<id>/master.m3u8` | Đảm bảo `minio-init` set anonymous download cho `hls/` | **LOW** |

---

## 3. Chi tiết phân tích

### 3.1 ENV & Networking

**File**: `.env`

| Biến | Giá trị hiện tại | Vấn đề |
|------|------------------|--------|
| `DEV_PUBLIC_HOST` (L7) | `localhost` | Không được sử dụng để derive các URL khác |
| `S3_PUBLIC_BASE_URL` (L42) | `http://10.0.2.2:9000/netflop-media` | **HARDCODED** - không theo `DEV_PUBLIC_HOST` |
| `S3_PRESIGN_BASE_URL` (L43) | `http://10.0.2.2:9000` | **HARDCODED** - không theo `DEV_PUBLIC_HOST` |
| `API_PUBLIC_BASE_URL` (L45) | `http://10.0.2.2:3000` | **HARDCODED** |
| `EXPO_PUBLIC_API_BASE_URL` (L71) | `http://10.0.2.2:3000` | **HARDCODED** |
| `EXPO_PUBLIC_S3_PUBLIC_BASE_URL` (L72) | `http://10.0.2.2:9000/netflop-media` | **HARDCODED** |

**Code sinh playbackUrl**: `apps/api/src/movies/movies.service.ts#L204-210`
```typescript
const s3PublicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL');
if (s3PublicBaseUrl) {
    playbackUrl = `${s3PublicBaseUrl}/${masterKey}`;
}
```
→ Nếu `S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/...`, Web browser không resolve được `10.0.2.2`.

---

### 3.2 Upload Flow

**Endpoints**:
| Endpoint | Method | Guards | File |
|----------|--------|--------|------|
| `/api/upload/presigned-url` | GET | Admin | `upload.controller.ts#L28` |
| `/api/movies/:id/upload-complete` (alias: `/api/upload/complete/:movieId`) | POST | Admin | `movies.controller.ts#L111` |

**Presigned URL Config** (`upload.service.ts#L52-125`):
- **Method**: PUT (S3 presigned)
- **Host**: `S3_PRESIGN_BASE_URL` (public endpoint for client upload)
- **Content-Type**: Validated (video/* hoặc image/*)
- **Max Size**: `UPLOAD_MAX_MB` (default 500MB, hiện 2000MB)
- **TTL**: `UPLOAD_PRESIGNED_TTL_SECONDS` (1800s = 30 phút)
- **Key Naming**: `originals/{movieId}/{uuid}-{sanitized_filename}`
- **Overwrite**: Không conflict (UUID unique)

**Error Codes**:
| HTTP | Code | Điều kiện |
|------|------|-----------|
| 404 | `MOVIE_NOT_FOUND` | Movie ID không tồn tại |
| 400 | `FILE_TOO_LARGE` | Vượt `maxSizeBytes` |
| 400 | `INVALID_CONTENT_TYPE` | `contentType` không match `fileType` |

---

### 3.3 Encode/Queue/Worker

**BullMQ Config** (`upload.service.ts#L277-307`):
| Setting | Value |
|---------|-------|
| Queue name | `encode` |
| Job ID | `encode_{encodeJobId}` (dedup by DB UUID) |
| Attempts | 3 |
| Backoff | Exponential: 10s, 20s, 40s |
| removeOnComplete | { count: 100, age: 86400 } |
| removeOnFail | { count: 50, age: 604800 } |

**Idempotency Mechanism**:
1. **Upload.objectKey**: `@unique` constraint (`schema.prisma#L240`)
2. **EncodeJob.inputKey**: `@unique` constraint (`schema.prisma#L255`)
3. **Worker idempotency** (`processor.ts#L73-83`):
   - Skip if `encodeStatus === 'ready'`
   - Skip if `encodeStatus === 'processing'`
   - Atomic claim với `claimJob()`

**HLS Output Convention**:
```
hls/{movieId}/
├── master.m3u8
├── v0/prog_index.m3u8  (360p)
├── v1/prog_index.m3u8  (480p)
└── v2/prog_index.m3u8  (720p)
```

---

### 3.4 Playback (Web vs Mobile)

| Đặc điểm | Web | Mobile |
|----------|-----|--------|
| **Player** | `hls.js` | `expo-av` |
| **Fetch playbackUrl** | `GET /api/movies/:id/stream` | Same |
| **Auth Header** | Bearer token (via cookie/context) | Bearer token (via SecureStore) |
| **Segment loading** | `hls.js` auto-loads from URL | `expo-av` auto-loads from URL |
| **Network host** | Resolves `localhost` | Needs `10.0.2.2` or LAN IP |

---

### 3.5 Storage (MinIO)

**Policy** (`docker-compose.yml#L57-58`):
```sh
mc anonymous set download local/netflop-media/hls || true;
mc anonymous set download local/netflop-media/posters || true;
mc anonymous set download local/netflop-media/thumbnails || true;
mc anonymous set download local/netflop-media/subtitles || true;
```
→ `hls/`, `posters/`, `thumbnails/`, `subtitles/` là **public download** (không cần signed URL cho segments).

---

### 3.6 Observability

**x-request-id Propagation**:
1. API: `request-id.middleware.ts#L20` - tạo/đọc từ header
2. Queue: `upload.service.ts#L284` - truyền vào job data
3. Worker: `processor.ts#L43` - đọc từ job data

**Log Locations**:
- API: Terminal chạy `pnpm dev:core` (stdout)
- Worker: Same terminal (stdout)
- MinIO: `docker logs netflop-minio`

---

## 4. Repro Steps & Curl Commands

### Case A: Web không xem được, Mobile OK

**Repro**:
1. Set `.env`: `S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/netflop-media`
2. Start `pnpm dev:core`
3. Web: Login → Open movie → Play → **FAIL** (network error to 10.0.2.2)
4. Mobile (Emulator): Login → Open movie → Play → **OK**

### Case B: Upload fail

**Repro**:
1. Set `.env`: `S3_PRESIGN_BASE_URL=http://10.0.2.2:9000`
2. Open Admin (`localhost:3001`) → Create movie → Upload video
3. Inspect Network → PUT request → URL contains `10.0.2.2`
4. Browser cannot reach `10.0.2.2` → **CORS/network error**

### Curl Commands

```powershell
# Test master.m3u8
curl -v http://localhost:9000/netflop-media/hls/{movieId}/master.m3u8

# Test segment
curl -v http://localhost:9000/netflop-media/hls/{movieId}/v0/seg_000.ts

# Test presigned upload (cần token admin)
curl -X GET "http://localhost:3000/api/upload/presigned-url?movieId={id}&fileName=test.mp4&contentType=video/mp4&sizeBytes=1000" \
  -H "Authorization: Bearer {token}"
```

---

## 5. Patch Plan (Ưu tiên)

### Priority 1: Fix Host Configuration ⚠️ CRITICAL

**File**: `.env`

**Option A** - Web only dev:
```diff
- S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/netflop-media
+ S3_PUBLIC_BASE_URL=http://localhost:9000/netflop-media
- S3_PRESIGN_BASE_URL=http://10.0.2.2:9000
+ S3_PRESIGN_BASE_URL=http://localhost:9000
- API_PUBLIC_BASE_URL=http://10.0.2.2:3000
+ API_PUBLIC_BASE_URL=http://localhost:3000
- EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
+ EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
- EXPO_PUBLIC_S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/netflop-media
+ EXPO_PUBLIC_S3_PUBLIC_BASE_URL=http://localhost:9000/netflop-media
```

**Option B** - Parallel Web + Mobile (RECOMMENDED):
```diff
# Thay 192.168.1.x bằng IP LAN thực của máy bạn
- S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/netflop-media
+ S3_PUBLIC_BASE_URL=http://192.168.1.x:9000/netflop-media
- S3_PRESIGN_BASE_URL=http://10.0.2.2:9000
+ S3_PRESIGN_BASE_URL=http://192.168.1.x:9000
- API_PUBLIC_BASE_URL=http://10.0.2.2:3000
+ API_PUBLIC_BASE_URL=http://192.168.1.x:3000
- EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
+ EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000
- EXPO_PUBLIC_S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/netflop-media
+ EXPO_PUBLIC_S3_PUBLIC_BASE_URL=http://192.168.1.x:9000/netflop-media
```

### Priority 2: Add Dynamic Host Derivation (Future)

Sửa code để derive `S3_PUBLIC_BASE_URL` từ `DEV_PUBLIC_HOST` thay vì hardcode.

---

## 6. Files Liên quan

| File | Mô tả |
|------|-------|
| `.env` | Cấu hình chính - chứa hardcoded URLs |
| `apps/api/src/movies/movies.service.ts#L204-210` | Sinh playbackUrl từ `S3_PUBLIC_BASE_URL` |
| `apps/api/src/upload/upload.service.ts#L52-120` | Presign dùng `S3_PRESIGN_BASE_URL` (không rewrite host) |
| `apps/mobile/src/lib/env.ts` | Mobile env config với EXPO_PUBLIC vars |
| `docker-compose.yml#L57` | MinIO init - set public policy cho hls/ |
| `apps/api/prisma/schema.prisma#L240,255` | Unique constraints cho idempotency |
| `apps/worker/src/lib/processor.ts` | Worker idempotency logic |
| `apps/api/src/common/middleware/request-id.middleware.ts` | x-request-id propagation |
