# Observability Guide

**Logging, Monitoring, and Debugging for NETFLAT**

---

## 1. Request ID Tracking

Every API request is assigned a unique `requestId` (UUID).

### Headers

- **Request**: `x-request-id` (optional, will be generated if not provided)
- **Response**: `x-request-id` (always returned)

### Example

```bash
curl -i http://localhost:3000/health
# HTTP/1.1 200 OK
# x-request-id: 550e8400-e29b-41d4-a716-446655440000
```

### Propagation

The `requestId` flows from API â†’ Worker:
1. API receives request with `x-request-id` header (or generates one)
2. When enqueuing encode job, `requestId` is included in job data
3. Worker logs include `requestId` for correlation

---

## 2. Log Format

All logs are JSON-structured for easy parsing.

### HTTP Request Logs

```json
{
  "type": "http",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/api/movies",
  "status": 200,
  "durationMs": 45
}
```

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": { "field": "email" },
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Worker Job Logs

```json
{
  "type": "job",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "jobId": "encode:abc-123",
  "movieId": "abc-123",
  "status": "started",
  "attempt": 1
}
```

```json
{
  "type": "job",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "jobId": "encode:abc-123",
  "movieId": "abc-123",
  "status": "completed",
  "durationMs": 25430
}
```

### Log Hygiene (Redaction)

Sensitive data is **never logged**:
- `authorization` header
- `password` field
- `refreshToken` field
- `cookie` header
- **Presigned URLs** (full query string with signature)

> [!CAUTION]
> **NEVER log full presigned URLs.** They contain signatures (`X-Amz-Signature`) that grant access to S3 resources.
> Use `maskPresignedUrl()` from `common/utils/logging.ts` to mask URLs for logging.

#### Safe Logging Example

```typescript
import { maskPresignedUrl } from '../common/utils/logging';

// âŒ WRONG - exposes signature
console.log(`Upload URL: ${presignedUrl}`);

// âœ… CORRECT - masks query string
console.log(`Upload URL: ${maskPresignedUrl(presignedUrl)}`);
// Output: "Upload URL: https://minio:9000/bucket/key?[MASKED]"
```

---

## 3. Rate Limiting

Auth endpoints are protected by rate limiting to prevent abuse.

### Configuration

TTL values are in **milliseconds** (NestJS Throttler standard).

| Endpoint | Limit | Window (ms) | Env Override |
|----------|-------|-------------|--------------|
| `/api/auth/register` | 5 | 60000 | - |
| `/api/auth/login` | 10 | 60000 | - |
| `/api/auth/refresh` | 30 | 60000 | - |

### Response

When limit exceeded:
```http
HTTP/1.1 429 Too Many Requests
x-request-id: abc-123
```

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

### Testing Rate Limit

```bash
# Spam login endpoint (should see 429 after ~10 requests)
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

---

## 4. Admin Diagnostics Endpoints

All admin endpoints require JWT auth with `admin` role.

### GET /api/admin/diagnostics

Checks system connectivity.

```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/api/admin/diagnostics
```

Response:
```json
{
  "data": {
    "timestamp": "2026-01-01T12:00:00.000Z",
    "database": { "status": "connected" },
    "redis": { "status": "connected" },
    "storage": { "status": "connected", "bucket": "NETFLAT-media" }
  }
}
```

### GET /api/admin/encode-jobs

Get encode status for movies.

```bash
curl -H "Authorization: Bearer <admin-token>" \
  "http://localhost:3000/api/admin/encode-jobs?movieId=abc-123"
```

### GET /api/admin/queue/encode/summary

Get queue counts using BullMQ `queue.getJobCounts()`.

```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/api/admin/queue/encode/summary
```

Response:
```json
{
  "data": {
    "queue": "encode",
    "timestamp": "2026-01-01T12:00:00.000Z",
    "counts": {
      "waiting": 0,
      "active": 1,
      "completed": 50,
      "failed": 2,
      "delayed": 0,
      "paused": 0
    }
  }
}
```

---

## 5. MinIO Policy Verification

### Verify HLS Public Access

Using minio-init container (minio/mc image):

```bash
# Check bucket exists
docker exec NETFLAT-minio-init mc ls local/NETFLAT-media

# Check anonymous policy
docker exec NETFLAT-minio-init mc anonymous get local/NETFLAT-media/hls

# Expected output: "download" for hls prefix
```

### Manual curl verification (after encode complete):

```bash
# Test master playlist
curl -i "http://localhost:9000/NETFLAT-media/hls/<movieId>/master.m3u8"
# Expect: HTTP 200

# Test segment
curl -I "http://localhost:9000/NETFLAT-media/hls/<movieId>/v0/seg_000.ts"
# Expect: HTTP 200
```

### Fix 403 on HLS

```bash
# Re-apply public policy via minio-init
docker compose -f deploy/docker-compose.staging.yml up -d minio-init

# Or manually
docker run --rm --network host minio/mc:latest \
  sh -c "mc alias set local http://localhost:9000 minioadmin minioadmin && \
         mc anonymous set download local/NETFLAT-media/hls && \
         mc anonymous set download local/NETFLAT-media/posters && \
         mc anonymous set download local/NETFLAT-media/thumbnails && \
         mc anonymous set download local/NETFLAT-media/subtitles"
```

---

## 6. Debugging Encode Pipeline

### Step 1: Check API received upload-complete

Look for log:
```json
{"type":"upload_complete","requestId":"xxx","movieId":"abc","jobId":"1"}
```

### Step 2: Check queue summary

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/admin/queue/encode/summary
```

- `waiting > 0`: Job queued but worker not picking up
- `active > 0`: Worker is processing

### Step 3: Check Worker logs

```bash
docker compose logs worker | grep "abc-123"
```

Look for:
```
[Worker] Job started: requestId=xxx jobId=1 movieId=abc attempt=1
```

### Step 4: Check encode completion

Look for:
```
[Worker] Job completed: jobId=1 durationMs=25430
```

Or failure:
```
[Worker] Job failed: jobId=1 attempt=1 error="FFmpeg error..."
```

### Step 5: Verify HLS files

```bash
curl -I http://localhost:9000/NETFLAT-media/hls/<movieId>/master.m3u8
```

---

## 7. Common Issues

### Rate limited unexpectedly

- Default limits are per IP
- Testing from same IP hits limit quickly
- Restart API to reset in-memory state (development only)

### Job stuck in waiting

1. Check worker is running: `docker compose ps worker`
2. Check Redis connection in worker logs
3. Verify queue name matches (`encode`)

### 403 on HLS segments

- MinIO policy not set for `hls/` prefix
- Run minio-init service or manually set policy

---

## 8. Job Cleanup Settings

BullMQ jobs are cleaned up automatically:
- **Completed jobs**: Keep last 100
- **Failed jobs**: Keep last 50

This prevents Redis from growing unbounded.
