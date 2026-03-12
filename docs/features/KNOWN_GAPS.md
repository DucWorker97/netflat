# Known Gaps

> **Last Updated:** 2026-03-13  
> **Purpose:** Track known gaps and remaining work

---

## 1. Remaining Gaps

| Feature | Status | Notes |
|---------|--------|-------|
| **Subtitles (VTT)** | ❌ | No upload or playback support |
| **Email Verification** | ❌ | Registration doesn't verify email |
| **Auto-generate Thumbnail** | ❌ | Could use FFmpeg frame extraction |

---

## 2. API/OpenAPI Sync

Endpoints in code but not in OPENAPI.yaml:

| Endpoint | Module |
|----------|--------|
| `GET /api/rails` | rails |
| `POST /api/ratings/:movieId` | ratings |
| `GET /api/actors` | actors |
| `GET /health` | health |

---

## 3. Security

| Item | Status | Notes |
|------|--------|-------|
| Rate limiting | ✅ Done | `@nestjs/throttler` — auth endpoints throttled |
| Presigned URL TTL | ✅ Done | 1h TTL |
| Email verification | ❌ | Not implemented |
| JWT refresh rotation | ⚠️ | Consider for hardening |

---

## 4. Resolved (Sprint 1–3)

| Item | Resolution |
|------|-----------|
| Forgot Password | ✅ Implemented (auth module) |
| 480p Variant | ✅ Pipeline encodes 480p + 720p |
| Quality Selector UI | ✅ Manual + adaptive in web player |
| Watch History / Resume | ✅ Auto-saves every 10s, resume on reload |
| Speed Controls | ✅ 0.5x–2x in web player |
| MinIO CORS | ✅ Auto-applied via docker-compose minio-init |
| playbackUrl in API | ✅ formatMovie returns playbackUrl |
| Rate Limiting | ✅ ThrottlerModule + per-endpoint limits on auth |
| seed.ts / import-tmdb.ts | ✅ Fixed to use String[] actors (no MovieActor) |
| S3 port fallbacks | ✅ All changed to 9002 for netflat stack |
| .env.example | ✅ Ports updated for netflat (5433/6380/9002) |
| useVideoUpload env var | ✅ Fixed NEXT_PUBLIC_API_BASE_URL |
| Billing module removed | ✅ No billing code or schema |
| Mobile app removed | ✅ Web-only project |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-13 | Major rewrite — resolved items from Sprint 1–3, removed stale entries |
| 2026-01-15 | Restructured document, added action items |
| 2026-01-14 | Initial gap analysis |
