# Audit Mismatch Report

> **Generated:** 2026-01-15  
> **Purpose:** Document discrepancies between PRD, Architecture, OpenAPI, and Code

---

## Summary

| Category | Mismatches Found |
|----------|-----------------|
| Features in Code but NOT in PRD | 6 |
| Features in PRD but NOT implemented | 3 |
| Architecture/OpenAPI Discrepancies | 2 |
| Documentation Gaps | 4 |

---

## 1. Features in Code but NOT in PRD (Scope Creep Risk)

| Feature | Location | PRD Status | Risk |
|---------|----------|------------|------|
| **AI Curator** | `apps/ai-curator/` | Nice-to-have (US-N3) mentions "simple recommendations" | 🟡 Low - Separate service, can be disabled |
| **Billing/Subscription** | `apps/api/src/billing/` | **WON'T DO** (Section 3.4) | 🔴 High - Explicitly excluded from MVP |
| **Profiles** | `apps/api/src/profiles/` | **COULD** (US-N1 = C-01) | 🟡 Low - Optional feature |
| **Ratings** | `apps/api/src/ratings/` | **COULD** (US-N6 = C-03) | 🟡 Low - Optional feature |
| **Rails Config** | `apps/api/src/rails/` | Not mentioned | 🟢 Low - UI enhancement |
| **Play Events** | Prisma `PlayEvent` model | Not mentioned (analytics?) | 🟢 Low - Observability feature |

### Action Items:
- [ ] Decide: Keep or remove `billing` module (conflicts with PRD Section 3.4)
- [ ] Document `ai-curator`, `profiles`, `ratings` as bonus features
- [ ] Add `rails`, `playEvents` to Architecture doc

---

## 2. Features in PRD but NOT (or Partially) Implemented

| PRD Feature | PRD Section | Implementation Status | Gap |
|-------------|-------------|----------------------|-----|
| **Forgot Password** | Implied in Auth | ❌ Not found in `apps/api/src/auth/` | Missing endpoint |
| **Email Verification** | Security best practice | ❌ Not found | Missing |
| **Subtitles (VTT)** | S-01 (SHOULD) | ❌ No VTT endpoint in OpenAPI | Not implemented |
| **Quality Selector** | S-02 (SHOULD) | ⚠️ HLS variants exist, UI unclear | Verify mobile UI |
| **Stream Ticket/Signed URL** | S-05 (SHOULD) | ✅ Implemented in `/movies/{id}/stream` | OK |

### Action Items:
- [ ] Add to INCOMPLETE_INFO: Forgot Password, Email Verification
- [ ] Verify Subtitles implementation status
- [ ] Confirm Quality Selector in Mobile UI

---

## 3. Architecture vs OpenAPI vs Code Discrepancies

### 3.1 Endpoints Mismatch

| OpenAPI Endpoint | Code Exists | Notes |
|-----------------|-------------|-------|
| `POST /api/movies/{id}/upload-complete` | ✅ Yes | Canonical (alias: `/api/upload/complete/{movieId}`, deprecated) |
| `GET /api/movies/{id}/progress` | ✅ Yes | Part of History module |
| `GET /api/history` | ✅ Yes | `apps/api/src/history/` |
| `POST /api/history/:movieId` | ✅ Yes | Upsert progress |
| `GET /api/rails` | ⚠️ Exists in code | NOT in OpenAPI |
| `GET /api/recommendations` | ⚠️ Exists in code | NOT in OpenAPI |
| `POST /api/ratings/:movieId` | ⚠️ Exists in code | NOT in OpenAPI |

### 3.2 Schema Discrepancies

| Entity | PRD/Architecture | Prisma Schema | OpenAPI | Mismatch |
|--------|-----------------|---------------|---------|----------|
| `Movie.movieStatus` | `draft`/`published` | ✅ Enum `MovieStatus` | ✅ Match | OK |
| `Movie.encodeStatus` | `pending`/`processing`/`ready`/`failed` | ✅ Enum `EncodeStatus` | ✅ Match | OK |
| `User.role` | `viewer`/`admin` | ✅ Enum `UserRole` | ✅ Match | OK |
| `Profile` | COULD (C-01) | ✅ Exists | ❌ Not in OpenAPI | Gap |
| `Rating` | COULD (C-03) | ✅ Exists | ❌ Not in OpenAPI | Gap |
| `Subscription` | WON'T DO | ⚠️ Exists | ❌ Not in OpenAPI | Conflict |

---

## 4. Documentation Gaps

| Document | Issue | Action |
|----------|-------|--------|
| **README.md** | ❌ Missing from root | Create with quickstart |
| **feature_status.md** | ❌ Missing | Create tracking table |
| **docs/INDEX.md** | ❌ Missing | Create navigation doc |
| **ARCHITECTURE.md** | Does not mention `ai-curator`, `profiles`, `ratings`, `billing` | Update |
| **OpenAPI** | Missing endpoints for `rails`, `recommendations`, `ratings` | Add or remove from code |

---

## 5. Visibility Rules Consistency

| Rule | PRD Definition | Architecture | Code Check |
|------|----------------|--------------|------------|
| Viewer sees movie when... | `published` AND `ready` (BR-01) | ✅ Matches | ✅ `MoviesService` filters correctly |
| Continue Watching shows... | `progress > 0` AND `completed = false` (BR-02) | ✅ Matches | ✅ History module logic |
| Completed when... | `progress >= 0.9 * duration` (BR-03) | ✅ Matches | ✅ Prisma `WatchHistory` |

---

## 6. Follow-up PR Recommendations

| PR | Priority | Description |
|----|----------|-------------|
| **PR-DOC-001** | P0 | This PR - Sync docs and create feature_status.md |
| **PR-CODE-001** | P1 | Remove or isolate `billing` module (conflicts with PRD) |
| **PR-API-001** | P2 | Add `rails`, `recommendations`, `ratings` to OpenAPI or remove from code |
| **PR-AUTH-001** | P2 | Implement Forgot Password / Email Verification |
| **PR-MOBILE-001** | P3 | Verify Subtitles and Quality Selector UI |

---

## Appendix: File References

- PRD: [`docs/PRD.md`](file:///c:/Users/ducwo/Downloads/Netflop/docs/PRD.md)
- Architecture: [`docs/ARCHITECTURE.md`](file:///c:/Users/ducwo/Downloads/Netflop/docs/ARCHITECTURE.md)
- OpenAPI: [`OPENAPI.yaml`](file:///c:/Users/ducwo/Downloads/Netflop/OPENAPI.yaml)
- Prisma Schema: [`apps/api/prisma/schema.prisma`](file:///c:/Users/ducwo/Downloads/Netflop/apps/api/prisma/schema.prisma)
- API Source: [`apps/api/src/`](file:///c:/Users/ducwo/Downloads/Netflop/apps/api/src/)
