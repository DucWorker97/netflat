# Feature Status Matrix

> **Last Updated:** 2026-03-13  
> **Purpose:** Single source of truth for feature implementation status  
> **Legend:** ✅ Done | ⚠️ Partial | ❌ Not Done | ➖ N/A

---

## MVP Features (MUST)

### Viewer - Web App

| ID | Feature | API | Web | Admin | Notes |
|----|---------|-----|-----|-------|-------|
| M-V01 | Login / Register | ✅ | ✅ | ✅ | JWT auth + rate limiting |
| M-V02 | Home - Hero Banner | ✅ | ✅ | ➖ | |
| M-V03 | Home - Genre Rails | ✅ | ✅ | ➖ | |
| M-V04 | Search | ✅ | ✅ | ➖ | Keyword + genre suggestions |
| M-V05 | Movie Detail | ✅ | ✅ | ➖ | |
| M-V06 | HLS Player | ✅ | ✅ | ➖ | hls.js adaptive |
| M-V07 | Watch History & Resume | ✅ | ✅ | ➖ | Auto-saves progress every 10s |
| M-V08 | Continue Watching Rail | ✅ | ✅ | ➖ | |
| M-V09 | My List / Favorites | ✅ | ✅ | ➖ | |
| M-V10 | Loading/Empty/Error States | ➖ | ✅ | ✅ | |

### Admin - CMS

| ID | Feature | API | Admin | Notes |
|----|---------|-----|-------|-------|
| M-A01 | Admin Login | ✅ | ✅ | Role check |
| M-A02 | Movie List | ✅ | ✅ | Pagination |
| M-A03 | Create/Edit Movie | ✅ | ✅ | |
| M-A04 | Upload Thumbnail | ✅ | ✅ | Presigned URL |
| M-A05 | Upload Video (MP4) | ✅ | ✅ | Progress bar |
| M-A06 | Encode Status | ✅ | ✅ | Polling |
| M-A07 | Publish/Unpublish | ✅ | ✅ | |
| M-A08 | User Disable/Enable | ✅ | ✅ | With reason |

### Backend API

| ID | Feature | Implemented | Notes |
|----|---------|-------------|-------|
| M-B01 | Auth - Register/Login/Refresh/Me | ✅ | Rate-limited |
| M-B02 | Movies - List/Search/Detail | ✅ | |
| M-B03 | Genres - List | ✅ | |
| M-B04 | Favorites - CRUD | ✅ | |
| M-B05 | Watch History - Upsert/List/Continue | ✅ | |
| M-B06 | Admin - Movie CRUD | ✅ | |
| M-B07 | Upload - Presigned URL | ✅ | |
| M-B08 | Upload - Complete → Encode Queue | ✅ | BullMQ |
| M-B09 | Stream URL (HLS) | ✅ | Real HLS URLs |
| M-B10 | Ratings - CRUD + Stats | ✅ | |
| M-B11 | Actors - Suggest | ✅ | |
| M-B12 | Forgot/Reset Password | ✅ | Requires MAIL_ENABLED=true |

### Pipeline (HLS Encode)

| ID | Feature | Implemented | Notes |
|----|---------|-------------|-------|
| M-P01 | Job Queue | ✅ | BullMQ with Redis |
| M-P02 | FFmpeg Encode | ✅ | 480p + 720p |
| M-P03 | Output Storage | ✅ | MinIO hls/{id}/ |
| M-P04 | Status Update | ✅ | processing → ready/failed |

---

## SHOULD Features

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| S-01 | Subtitles (VTT) | ❌ | Not implemented |
| S-02 | Quality Selector | ✅ | HLS adaptive + manual select |
| S-03 | 480p Variant | ✅ | 480p + 720p profiles |
| S-04 | Speed Controls | ✅ | 0.5x–2x |

---

## Out of Scope

| Feature | Notes |
|---------|-------|
| Mobile App | Removed — web-only |
| Billing/Subscription | Removed |
| DRM / Live Streaming | Not planned |
| AI Curator | Removed |

---

## Missing from PRD but Implemented

| Feature | Code Location | OpenAPI | Recommendation |
|---------|--------------|---------|----------------|
| Rails API | `apps/api/src/rails/` | ❌ | Add to OpenAPI or document |
| Recommendations API | `apps/api/src/recommendations/` | ❌ | Add to OpenAPI or document |
| Ratings API | `apps/api/src/ratings/` | ❌ | Add to OpenAPI or document |
| Actors | `apps/api/src/actors/` | ❌ | Add to OpenAPI or document |
| Events (Analytics) | `apps/api/src/events/` | ❌ | Add to OpenAPI or document |
| Health Check | `apps/api/src/health/` | ❌ | Add to OpenAPI |

---

## Action Items (Follow-up PRs)

| Priority | PR | Description | Status |
|----------|-----|-------------|--------|
| P0 | PR-DOC-001 | Sync docs, create INDEX.md | 🔄 In Progress |
| P1 | PR-CODE-001 | Remove/isolate billing module | ⏳ TODO |
| P2 | PR-API-001 | Add missing endpoints to OpenAPI | ⏳ TODO |
| P2 | PR-AUTH-001 | Implement Forgot Password | ⏳ TODO |
| P3 | PR-MOBILE-001 | Add Subtitles support | ⏳ TODO |
| P3 | PR-MOBILE-002 | Add Quality Selector UI | ⏳ TODO |

---

## Verification Checklist

- [x] CI gates pass (verify + smoke)
- [x] API health check returns 200
- [x] Admin can login and CRUD movies
- [x] Video upload triggers encode
- [x] Encode completes successfully
- [x] Viewer can play HLS video
- [x] Watch progress saves and resumes
- [x] Favorites add/remove works
- [ ] Subtitles display (not implemented)
- [ ] Quality selector works (partial)
