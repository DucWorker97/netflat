# QA Functional Report - NETFLAT Web

## Executive Summary
- **Date**: 2026-01-09
- **Tester**: AI Lead QA
- **Environment**: Local (`localhost:3002` + `localhost:3000`), Chrome, Windows
- **Status**: **PARTIAL PASS** (Core flows verified, but infrastructure instability blocks full testing)

## 1. Module Status Matrix

| Module | Status | Notes |
|--------|--------|-------|
| **A. Global** | **PASS** | Navbar/Footer render correctly. Logo/Navigation works. |
| **B. Browse/Home** | **PASS** (when API up) | Hero Banner with real movie. "Recently Added" rail populated. |
| **C. Catalog/Genre** | **NOT TESTED** | Blocked by API downtime during test session. |
| **D. Search** | **NOT TESTED** | Displays "No movies found" when API down. |
| **E. Detail** | **PARTIAL PASS** | Works **after login**. Shows "Movie not found" for guests (BUG-001). |
| **F. Player** | **PASS** | Video player visible and functional on detail page. |
| **G. Auth** | **PASS** | Login with `viewer@NETFLAT.local / viewer123` successful. |
| **H. Favorites/History** | **NOT TESTED** | Blocked by auth session + API connectivity. |

## 2. Bug Backlog

| ID | Severity | Description | Steps to Reproduce | Expected | Actual |
|----|----------|-------------|--------------------|----------|--------|
| BUG-001 | **HIGH** | Detail page shows "Movie not found" for guests | 1. Visit `/` unauthenticated. 2. Click a movie card. | Prompt to login OR "Access Denied". | Shows "Movie not found" (confusing). |
| BUG-002 | **MEDIUM** | Movie description missing on Detail page | 1. Login. 2. Navigate to Detail page. | See movie synopsis/description. | No description visible in UI/DOM. |
| BUG-003 | **LOW** | Seed data title appears duplicated | 1. Load Home page. | Clean movie titles. | Title "Test MovieTest Movie 2" concatenated. |
| BUG-004 | **CRITICAL** | API crashes when Docker Redis is down | 1. Stop Docker. 2. Restart API. | Graceful error handling/retry. | API exits with P1001 ECONNREFUSED. |

## 3. Infrastructure Issue (Blocking)
- **Problem**: The API server crashes immediately when Docker containers (especially Redis on port 6379) are not running.
- **Error**: `PrismaClientInitializationError: Can't reach database server... connect ECONNREFUSED 127.0.0.1:6379`
- **Fix Needed**: Ensure Docker Desktop is running and containers are started (`docker-compose up -d`) before launching API.

## 4. Evidence

| Screenshot | Description |
|------------|-------------|
| `movie_detail_page_*.png` | Detail page with player and "More Like This" rail after login. |
| `home_page_mocked_*.png` | Home page showing "Failed to load movies" (API down). |
| `qa_full_e2e_real_data_*.webp` | Recording of E2E session with working backend. |
| `qa_search_favorites_retry_*.webp` | Recording showing blocked state. |

## 5. Recommendations

1. **Fix BUG-001 (Auth Guard)**: Modify Detail page to show login prompt for unauthenticated users.
2. **Fix BUG-002 (Missing Description)**: Ensure `description` field is rendered in Detail page UI.
3. **Clean Seed Data (BUG-003)**: Review `prisma/seed.ts` for title concatenation issue.
4. **Add Startup Health Check (BUG-004)**: Add Redis connectivity check in API `main.ts` with retry logic.

## 6. Next Actions

- [ ] Ensure Docker is running before QA sessions.
- [ ] Complete Catalog (Genre) tests.
- [ ] Complete Search tests (debounce, results, empty state).
- [ ] Complete Favorites and History add/remove tests.
- [ ] Test responsive breakpoints (Mobile / Tablet).
