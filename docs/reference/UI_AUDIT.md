# đŸ¨ UI/UX Audit Report - NETFLAT Web

> **Auditor:** NETFLAT AI Agent
> **Date:** 2026-01-09
> **Scope:** Web Application (`apps/web`)

## 1. Executive Summary
- **Architecture Issue:** Missing global layout shell. Navbar and common elements are duplicated across pages or missing.
- **Component Reusability:** Critical components (`Navbar`, `MovieCard`) are defined inline within pages, leading to code duplication and inconsistency.
- **Styling Strategy Directory:** Mixed use of global CSS, CSS Modules, and heavy inline styles (`style={{...}}`). No consistent design token system (colors, spacing).
- **Incomplete Features:** Footer is completely missing. Movie Detail page lacks "Similar Movies" section.
- **Responsiveness:** Layouts rely on hardcoded pixel values (e.g., `minWidth: '200px'`) which may break on small mobile devices.

## 2. Sitemap & Component Inventory

### Sitemap (Web)
| Route | Type | Status | Shell Integration |
|-------|------|--------|-------------------|
| `/` | Home | Found | Inline Navbar, No Footer |
| `/movies/[id]` | Detail | Found | Inline Navbar (Simplified), No Footer |
| `/genre/[id]` | Catalog | Found | *Assumed similar to Home* |
| `/search` | Search | Found | *Pending check* |
| `/login` | Auth | Found | *Pending check* |

### Component Inventory (Current State)
| Component | Location | Status | Issue | Evidence |
|-----------|----------|--------|-------|----------|
| `Navbar` | `page.tsx` | â ï¸ Duplicate | Defined inline in `page.tsx` AND `favorites/page.tsx` | `app/page.tsx:L11`, `favorites/page.tsx:L9` |
| `MovieCard` | `page.tsx` | â ï¸ Inline | Redefined in `page.tsx`, `favorites/page.tsx`, `genre/[id]/page.tsx` | `app/page.tsx:L68`, `favorites/page.tsx:L32` |
| `HeroBanner` | `page.tsx` | â ï¸ Inline | Hardcoded logic in Home page. | `app/page.tsx:L130` |
| `VideoPlayer` | `movies/[id]/VideoPlayer.tsx` | âœ… Component | Good separation. | `movies/[id]/VideoPlayer.tsx` |
| `Stars` | `components/stars.tsx` | âœ… Shared | Reusable. | `components/stars.tsx` |
| `ForYouRail` | `components/ForYouRail.tsx` | âœ… Shared | Reusable. | `components/ForYouRail.tsx` |
| `Footer` | - | âŒ Missing | Not found in entire codebase. | - |

## 3. UI Audit Checklist (Static Analysis)

### A) Global Shell
- [ ] **Header/Topbar:**
    - [x] Logo (Present)
    - [x] Navigation (Home, Search)
    - [ ] User Menu (Inconsistent - missing on Detail page/Genre page)
    - [x] **CRITICAL ISSUE:** `Navbar` is NOT global. `app/genre/[id]/page.tsx` completely lacks a navbar.
- [ ] **Footer:**
    - [ ] Links (Terms, Help)
    - [ ] Copyright
    - [x] **CRITICAL ISSUE:** Completely missing.

### B) Home/Browse
- [x] **Hero Banner:** Functional but uses inline styles.
- [x] **Rows (Rails):** Continue Watching, Recently Added.
- [ ] **Card Component:**
    - [x] Poster & Title
    - [ ] Badges (HD/4K) - Missing
    - [ ] Hover State - Basic inline styles only.
    - [x] **ISSUE:** `MovieCard` logic (progress bar, remove button) is duplicated/fragmented across pages.

### C) Listing/Catalog (`/genre/[id]`)
- [x] **Grid:** Present.
- [ ] **Layout:** Lacks global navigation (Header/Footer).
- [ ] **Pagination:** Missing.

### E) Details (`/movies/[id]`)
- [x] **Info:** Title, Year, Rating, Genres, Description.
- [ ] **Structure:** Uses a Simplified Navbar (Home logo only), missing User Menu/Search.
- [ ] **Relations:**
    - [ ] Similar Movies - **MISSING** in code.
- [ ] **CTA:** Favoriting works.

---

## 4. Next Steps (Dynamic Audit)
To complete the audit (visual regression, responsive check, interaction), I need to run the application.

**Request:** Permission to run `pnpm dev` (apps/web) to verify UI states visually.
