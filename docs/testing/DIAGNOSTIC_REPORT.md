# Diagnostic Report: Upload & Playback Issues

> **Report Date**: 2026-01-17  
> **Issues Investigated**:  
> 1. KhĂ´ng xem phim song song Web + Mobile  
> 2. Upload phim khĂ´ng Ä‘Æ°á»£c

---

## 1. Executive Summary

**Root Cause #1 (HIGH - Parallel Viewing)**: Cáº¥u hĂ¬nh `.env` cĂ³ mĂ¢u thuáº«n:
- `DEV_PUBLIC_HOST=localhost` (dĂ²ng 7)
- `S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/...` (dĂ²ng 42, hardcoded)
- `S3_PRESIGN_BASE_URL=http://10.0.2.2:9000` (dĂ²ng 43, hardcoded)
- `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000` (dĂ²ng 71, hardcoded)

**Káº¿t quáº£**: Web nháº­n playbackUrl vá»›i `10.0.2.2` â†’ khĂ´ng resolve Ä‘Æ°á»£c â†’ khĂ´ng phĂ¡t video. Mobile hoáº¡t Ä‘á»™ng vĂ¬ `10.0.2.2` Ä‘Ăºng cho Android Emulator.

**Root Cause #2 (MEDIUM - Upload)**: KhĂ´ng phĂ¡t hiá»‡n lá»—i upload cáº¥u trĂºc. NhÆ°ng náº¿u `S3_PRESIGN_BASE_URL` sai, presigned URL tráº£ vá» cho client cÅ©ng sai host â†’ client khĂ´ng PUT Ä‘Æ°á»£c tá»›i MinIO.

**Fix nhanh**: Thá»‘ng nháº¥t `S3_PUBLIC_BASE_URL`, `S3_PRESIGN_BASE_URL` vĂ  `EXPO_PUBLIC_*` theo platform:
- **Web only**: dĂ¹ng `localhost`
- **Mobile Emulator**: dĂ¹ng `10.0.2.2`
- **Parallel (Web + Mobile)**: dĂ¹ng IP LAN cá»§a mĂ¡y (vd: `192.168.1.x`)

---

## 2. Báº£ng NguyĂªn nhĂ¢n â†’ Triá»‡u chá»©ng â†’ CĂ¡ch kiá»ƒm tra â†’ CĂ¡ch fix

| # | NguyĂªn nhĂ¢n | Triá»‡u chá»©ng | CĂ¡ch kiá»ƒm tra | CĂ¡ch fix | Äá»™ cháº¯c cháº¯n |
|---|-------------|-------------|---------------|----------|--------------|
| 1 | `.env` hardcode `10.0.2.2` trong `S3_PUBLIC_BASE_URL` nhÆ°ng `DEV_PUBLIC_HOST=localhost` | Web khĂ´ng load video, Mobile OK | Má»Ÿ console Web â†’ xem `playbackUrl` â†’ chá»©a `10.0.2.2` | Sá»­a `.env`: set táº¥t cáº£ URL vá» IP LAN hoáº·c `localhost` (chá»n 1) | **HIGH** |
| 2 | Presigned upload URL tráº£ vá» host sai | Admin upload fail vá»›i lá»—i CORS hoáº·c network | Inspect Network tab â†’ PUT request â†’ xem URL host | Sá»­a `S3_PRESIGN_BASE_URL` Ä‘Ăºng host client cĂ³ thá»ƒ reach | **HIGH** |
| 3 | MinIO CORS chÆ°a allow `localhost:3001` | Upload fail vá»›i CORS error | Check MinIO console â†’ bucket settings â†’ CORS | Add `http://localhost:3001` vĂ o CORS allowed origins | **MEDIUM** |
| 4 | Segment URLs khĂ´ng signed (public mode) | Segment 403 náº¿u bucket khĂ´ng public | `curl http://<host>:9000/NETFLAT-media/hls/<id>/master.m3u8` | Äáº£m báº£o `minio-init` set anonymous download cho `hls/` | **LOW** |

---

## 3. Chi tiáº¿t phĂ¢n tĂ­ch

### 3.1 ENV & Networking

**File**: `.env`

| Biáº¿n | GiĂ¡ trá»‹ hiá»‡n táº¡i | Váº¥n Ä‘á» |
|------|------------------|--------|
| `DEV_PUBLIC_HOST` (L7) | `localhost` | KhĂ´ng Ä‘Æ°á»£c sá»­ dá»¥ng Ä‘á»ƒ derive cĂ¡c URL khĂ¡c |
| `S3_PUBLIC_BASE_URL` (L42) | `http://10.0.2.2:9000/NETFLAT-media` | **HARDCODED** - khĂ´ng theo `DEV_PUBLIC_HOST` |
| `S3_PRESIGN_BASE_URL` (L43) | `http://10.0.2.2:9000` | **HARDCODED** - khĂ´ng theo `DEV_PUBLIC_HOST` |
| `API_PUBLIC_BASE_URL` (L45) | `http://10.0.2.2:3000` | **HARDCODED** |
| `EXPO_PUBLIC_API_BASE_URL` (L71) | `http://10.0.2.2:3000` | **HARDCODED** |
| `EXPO_PUBLIC_S3_PUBLIC_BASE_URL` (L72) | `http://10.0.2.2:9000/NETFLAT-media` | **HARDCODED** |

**Code sinh playbackUrl**: `apps/api/src/movies/movies.service.ts#L204-210`
```typescript
const s3PublicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL');
if (s3PublicBaseUrl) {
    playbackUrl = `${s3PublicBaseUrl}/${masterKey}`;
}
```
â†’ Náº¿u `S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/...`, Web browser khĂ´ng resolve Ä‘Æ°á»£c `10.0.2.2`.

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
- **Content-Type**: Validated (video/* hoáº·c image/*)
- **Max Size**: `UPLOAD_MAX_MB` (default 500MB, hiá»‡n 2000MB)
- **TTL**: `UPLOAD_PRESIGNED_TTL_SECONDS` (1800s = 30 phĂºt)
- **Key Naming**: `originals/{movieId}/{uuid}-{sanitized_filename}`
- **Overwrite**: KhĂ´ng conflict (UUID unique)

**Error Codes**:
| HTTP | Code | Äiá»u kiá»‡n |
|------|------|-----------|
| 404 | `MOVIE_NOT_FOUND` | Movie ID khĂ´ng tá»“n táº¡i |
| 400 | `FILE_TOO_LARGE` | VÆ°á»£t `maxSizeBytes` |
| 400 | `INVALID_CONTENT_TYPE` | `contentType` khĂ´ng match `fileType` |

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
   - Atomic claim vá»›i `claimJob()`

**HLS Output Convention**:
```
hls/{movieId}/
â”œâ”€â”€ master.m3u8
â”œâ”€â”€ v0/prog_index.m3u8  (360p)
â”œâ”€â”€ v1/prog_index.m3u8  (480p)
â””â”€â”€ v2/prog_index.m3u8  (720p)
```

---

### 3.4 Playback (Web vs Mobile)

| Äáº·c Ä‘iá»ƒm | Web | Mobile |
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
mc anonymous set download local/NETFLAT-media/hls || true;
mc anonymous set download local/NETFLAT-media/posters || true;
mc anonymous set download local/NETFLAT-media/thumbnails || true;
mc anonymous set download local/NETFLAT-media/subtitles || true;
```
â†’ `hls/`, `posters/`, `thumbnails/`, `subtitles/` lĂ  **public download** (khĂ´ng cáº§n signed URL cho segments).

---

### 3.6 Observability

**x-request-id Propagation**:
1. API: `request-id.middleware.ts#L20` - táº¡o/Ä‘á»c tá»« header
2. Queue: `upload.service.ts#L284` - truyá»n vĂ o job data
3. Worker: `processor.ts#L43` - Ä‘á»c tá»« job data

**Log Locations**:
- API: Terminal cháº¡y `pnpm dev:core` (stdout)
- Worker: Same terminal (stdout)
- MinIO: `docker logs NETFLAT-minio`

---

## 4. Repro Steps & Curl Commands

### Case A: Web khĂ´ng xem Ä‘Æ°á»£c, Mobile OK

**Repro**:
1. Set `.env`: `S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/NETFLAT-media`
2. Start `pnpm dev:core`
3. Web: Login â†’ Open movie â†’ Play â†’ **FAIL** (network error to 10.0.2.2)
4. Mobile (Emulator): Login â†’ Open movie â†’ Play â†’ **OK**

### Case B: Upload fail

**Repro**:
1. Set `.env`: `S3_PRESIGN_BASE_URL=http://10.0.2.2:9000`
2. Open Admin (`localhost:3001`) â†’ Create movie â†’ Upload video
3. Inspect Network â†’ PUT request â†’ URL contains `10.0.2.2`
4. Browser cannot reach `10.0.2.2` â†’ **CORS/network error**

### Curl Commands

```powershell
# Test master.m3u8
curl -v http://localhost:9000/NETFLAT-media/hls/{movieId}/master.m3u8

# Test segment
curl -v http://localhost:9000/NETFLAT-media/hls/{movieId}/v0/seg_000.ts

# Test presigned upload (cáº§n token admin)
curl -X GET "http://localhost:3000/api/upload/presigned-url?movieId={id}&fileName=test.mp4&contentType=video/mp4&sizeBytes=1000" \
  -H "Authorization: Bearer {token}"
```

---

## 5. Patch Plan (Æ¯u tiĂªn)

### Priority 1: Fix Host Configuration â ï¸ CRITICAL

**File**: `.env`

**Option A** - Web only dev:
```diff
- S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/NETFLAT-media
+ S3_PUBLIC_BASE_URL=http://localhost:9000/NETFLAT-media
- S3_PRESIGN_BASE_URL=http://10.0.2.2:9000
+ S3_PRESIGN_BASE_URL=http://localhost:9000
- API_PUBLIC_BASE_URL=http://10.0.2.2:3000
+ API_PUBLIC_BASE_URL=http://localhost:3000
- EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
+ EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
- EXPO_PUBLIC_S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/NETFLAT-media
+ EXPO_PUBLIC_S3_PUBLIC_BASE_URL=http://localhost:9000/NETFLAT-media
```

**Option B** - Parallel Web + Mobile (RECOMMENDED):
```diff
# Thay 192.168.1.x báº±ng IP LAN thá»±c cá»§a mĂ¡y báº¡n
- S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/NETFLAT-media
+ S3_PUBLIC_BASE_URL=http://192.168.1.x:9000/NETFLAT-media
- S3_PRESIGN_BASE_URL=http://10.0.2.2:9000
+ S3_PRESIGN_BASE_URL=http://192.168.1.x:9000
- API_PUBLIC_BASE_URL=http://10.0.2.2:3000
+ API_PUBLIC_BASE_URL=http://192.168.1.x:3000
- EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
+ EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000
- EXPO_PUBLIC_S3_PUBLIC_BASE_URL=http://10.0.2.2:9000/NETFLAT-media
+ EXPO_PUBLIC_S3_PUBLIC_BASE_URL=http://192.168.1.x:9000/NETFLAT-media
```

### Priority 2: Add Dynamic Host Derivation (Future)

Sá»­a code Ä‘á»ƒ derive `S3_PUBLIC_BASE_URL` tá»« `DEV_PUBLIC_HOST` thay vĂ¬ hardcode.

---

## 6. Files LiĂªn quan

| File | MĂ´ táº£ |
|------|-------|
| `.env` | Cáº¥u hĂ¬nh chĂ­nh - chá»©a hardcoded URLs |
| `apps/api/src/movies/movies.service.ts#L204-210` | Sinh playbackUrl tá»« `S3_PUBLIC_BASE_URL` |
| `apps/api/src/upload/upload.service.ts#L52-120` | Presign dĂ¹ng `S3_PRESIGN_BASE_URL` (khĂ´ng rewrite host) |
| `apps/mobile/src/lib/env.ts` | Mobile env config vá»›i EXPO_PUBLIC vars |
| `docker-compose.yml#L57` | MinIO init - set public policy cho hls/ |
| `apps/api/prisma/schema.prisma#L240,255` | Unique constraints cho idempotency |
| `apps/worker/src/lib/processor.ts` | Worker idempotency logic |
| `apps/api/src/common/middleware/request-id.middleware.ts` | x-request-id propagation |
