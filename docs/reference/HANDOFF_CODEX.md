# NETFLAT Handoff For Claude Opus 4.6

Generated at: 2026-03-10 (Asia/Saigon)
Prepared by: Codex (GPT-5)

## 1. Purpose
This document is a full technical handoff of:
- what was implemented,
- what is currently working,
- what is still unstable or incomplete,
- and how the NETFLAT program is structured and expected to run.

Use this as the starting context before making new changes.

## 2. Repository Snapshot (Current)
- Monorepo with pnpm + turbo.
- Working tree is dirty with many changes (tracked + untracked).
- Current diff summary: 65 tracked files changed, plus multiple new files/folders.
- Important untracked folder: `apps/mobile/android/` currently includes generated/build artifacts (`.gradle`, `build`, etc.).

## 3. Program Understanding

### 3.1 Apps and Responsibilities
- `apps/api`: NestJS backend, Prisma/Postgres, Redis/BullMQ, auth, movies, upload, history, favorites, notifications, admin endpoints.
- `apps/worker`: FFmpeg/BullMQ worker for MP4 -> HLS pipeline.
- `apps/web`: Next.js viewer web app.
- `apps/admin`: Next.js admin CMS.
- `apps/mobile`: Expo React Native viewer app.
- `apps/ai-curator`: Python recommendation service.

### 3.2 Main Runtime Dependencies
- Postgres on `5432`
- Redis on `6379`
- MinIO on `9000` (`9001` console)
- API on `3000`
- Web on `3002`
- Admin on `3001`
- Metro on `8081`

### 3.3 Core Functional Flows
- Auth: JWT access + refresh tokens, `/api/auth/*`.
- Content pipeline: admin upload -> presigned URL -> enqueue encode job -> worker HLS output -> playback URL.
- Playback: web/mobile fetch stream URL from API, then play HLS from MinIO/S3 public base.
- User data: favorites/history/ratings tied to authenticated user identity.

### 3.4 Environment Model
- One active root `.env` is used at runtime.
- Profiles:
  - `.env.web.local`
  - `.env.mobile.emu`
  - `.env.lan.local`
- `DEV_PUBLIC_HOST` is used as host strategy (localhost vs emulator host vs LAN IP), and URL consistency across API/S3/public clients is critical.

### 3.5 Existing "single-click" style launcher
- `NETFLAT.bat` exists and can start/stop infra + app in a basic way.
- It is not robust process supervision; it force-kills `node.exe` on stop.

## 4. Implemented Work

### 4.1 High-priority: Route Prefix Fix
Implemented global API prefix strategy and removed double-prefix controller paths.

Key changes:
- `apps/api/src/main.ts`
  - `app.setGlobalPrefix('api', { exclude: ['health'] })`
- Controllers normalized from `@Controller('api/...')` to `@Controller('...')`:
  - `apps/api/src/events/events.controller.ts`
  - `apps/api/src/rails/rails.controller.ts`
  - `apps/api/src/recommendations/recommendations.controller.ts`

Result:
- Routes now resolve cleanly through one global `/api` prefix.

### 4.2 High-priority: Auth User ID + Security Hardening
Implemented and/or aligned:
- Standardized usage of authenticated user id (`req.user.id`) in user-scoped paths.
- Removed noisy debug logs in JWT strategy.
- Password policy centralized and reused.
- Email normalization before lookup/store.
- Refresh token revocation on password change.
- Added forgot/reset password flow.
- Added login attempt tracking and lockout logic.
- Added security config + env validation system.

Key files:
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/strategies/jwt.strategy.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/account/account.controller.ts`
- `apps/api/src/account/account.service.ts`
- `apps/api/src/ratings/ratings.controller.ts`
- `apps/api/src/common/utils/security.ts`
- `apps/api/src/config/security.config.ts`
- `apps/api/src/config/env.validation.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260310093000_add_auth_security_tables/migration.sql`

New DB security tables:
- `password_reset_tokens`
- `login_attempts`

### 4.3 High-priority: Mock -> Real API (major areas)
Large parts were switched to real backend calls using the shared API client.

Examples:
- Admin query layer now calls real endpoints:
  - `apps/admin/src/lib/queries.ts`
- Mobile tabs and auth screens call real endpoints:
  - `apps/mobile/src/hooks/queries.ts`
  - `apps/mobile/app/(tabs)/notifications.tsx`
  - `apps/mobile/app/(tabs)/history.tsx`
  - `apps/mobile/app/login.tsx`
- Web auth/account/profile/notifications connected to backend routes:
  - `apps/web/src/lib/auth-context.tsx`
  - `apps/web/src/app/account/page.tsx`
  - `apps/web/src/app/profile/page.tsx`
  - `apps/web/src/app/notifications/page.tsx`

Note:
- There are still some mock/demo pages/components in repo (not all removed yet), e.g.:
  - `apps/web/src/app/top10/page.tsx`
  - `apps/web/src/app/coming-soon/page.tsx`
  - `apps/web/src/app/browse/page.tsx`
  - `apps/mobile/app/(tabs)/downloads.tsx`
  - `apps/admin/src/components/BulkActions.tsx`
  - `apps/admin/src/app/[locale]/(dashboard)/subtitles/page.tsx`

### 4.4 Build/Typecheck Blockers fixed (web/admin/mobile scope)
- Web notifications page type/build blocker addressed (page uses stable client path now).
- Admin prerender `/500` issue is currently not reproducing in build (build passes).
- Admin build strictness improved by removing ignore settings from Next config.

Key changes:
- `apps/admin/next.config.js`: removed `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`.
- `apps/admin/src/app/page.tsx`: root redirects to locale entry (`/vi`).
- `apps/web/src/app/login/page.tsx` + `LoginPageClient.tsx`: split to avoid client-hook/prerender issues.

### 4.5 Mobile TS debt cleanup (partial but meaningful)
- Added explicit local type shims for Expo modules to satisfy TypeScript in current environment.
- Updated mobile TS config path mappings.

Key files:
- `apps/mobile/tsconfig.json`
- `apps/mobile/src/types/expo-router.d.ts`
- `apps/mobile/src/types/react-native-reanimated.d.ts`
- `apps/mobile/src/types/expo-av.d.ts`
- `apps/mobile/src/types/expo-blur.d.ts`
- `apps/mobile/src/types/expo-linear-gradient.d.ts`
- `apps/mobile/src/types/expo-vector-icons.d.ts`

### 4.6 Dev startup flow work (runtime manager)
A managed runtime script was added to reduce manual startup friction.

Added:
- `scripts/dev-runtime.js`
- package scripts in root `package.json`:
  - `dev:runtime:doctor`
  - `dev:runtime:start`
  - `dev:runtime:web`
  - `dev:runtime:mobile`
  - `dev:runtime:stop`
  - `dev:runtime:status`
- README updated with runtime quickstart.
- `.dev-runtime` added to `.gitignore`.

Runtime manager behavior:
- Copies env profile into `.env` by mode.
- Validates host consistency for API/S3 vars.
- Validates tooling and infra.
- Starts services with readiness checks and log files.
- Tracks PIDs in `.dev-runtime/pids.json`.

## 5. Verification Results (executed on 2026-03-10)

### 5.1 Passed
- `pnpm --filter @NETFLAT/web typecheck`
- `pnpm --filter @NETFLAT/admin typecheck`
- `pnpm --filter @NETFLAT/mobile typecheck`
- `pnpm --filter @NETFLAT/web build`
- `pnpm --filter @NETFLAT/admin build`

### 5.2 Failed / blocked
- `pnpm typecheck` (root turbo) fails because `apps/ai-curator` cannot find `pyright` command in environment.
- `pnpm dev:runtime:doctor` failed when tested because port `3000` was already occupied by an external Node process (`PID 31664`), not managed by runtime script.

### 5.3 Runtime instability evidence
- `.dev-runtime/logs/worker.out.log` contains `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` and exit code `3221225786` in prior start attempts.
- Runtime status at check time: stopped.

## 6. Security-reference Comparison (from external file)
Source read: `C:\Users\ducwo\Downloads\CHI TIẾT CÁC GIẢI PHÁP BẢO MẬT WEBS.txt`

Mapping summary:
- SQL injection mitigation via ORM: aligned (Prisma usage).
- Input validation: aligned (class-validator + DTO tightening).
- Password hashing: aligned (bcrypt; not PBKDF2 but still modern secure hashing flow).
- Reset password token flow: aligned (one-time token table, TTL, invalidation).
- Login abuse control: aligned (attempt logging + lockout window).
- Role-based access: aligned (JWT + roles guard).
- Session timeout concept: aligned via JWT TTL/refresh TTL.
- CSRF anti-forgery token model: not directly applied (token-based API model; not cookie-form architecture).
- CAPTCHA anti-bot: config scaffolding exists, but not fully enforced in auth endpoints yet.
- Account disable/inactive lifecycle: not fully implemented.
- Email alerting: currently represented as in-app notifications; full outbound email provider flow still incomplete.

## 7. Known Risks / Remaining Debt
- Web config still has `eslint.ignoreDuringBuilds: true` in `apps/web/next.config.js`.
- Some UI modules still use mock data.
- Runtime manager is useful but not yet fully stable under all Windows process conditions.
- Documentation has encoding/mojibake issues in multiple markdown/txt files.
- `apps/mobile/android/` currently contains generated artifacts and may need cleanup/ignore policy review before commit.
- Root-level full strict gate depends on ai-curator Python toolchain (`pyright`) availability.

## 8. Recommended Next Actions (priority)
1. Stabilize `scripts/dev-runtime.js` process lifecycle on Windows (no unexpected child exits).
2. Decide policy for `apps/mobile/android/` tracked content vs generated artifacts, then clean and update ignore rules.
3. Finish mock-to-real API migration for remaining pages/components.
4. Decide whether to enforce strict lint during web build (remove `ignoreDuringBuilds` for web too).
5. Install/configure `pyright` for `apps/ai-curator` or adjust CI/typecheck strategy.
6. Complete security hardening backlog: captcha enforcement, email provider integration, account disable lifecycle.

## 9. Useful Entry Points For Claude
- Runtime manager: `scripts/dev-runtime.js`
- Root scripts: `package.json`
- API bootstrap and config:
  - `apps/api/src/main.ts`
  - `apps/api/src/app.module.ts`
  - `apps/api/src/config/security.config.ts`
  - `apps/api/src/config/env.validation.ts`
- Auth domain:
  - `apps/api/src/auth/*`
  - `apps/api/prisma/schema.prisma`
- Frontend API layers:
  - `apps/web/src/lib/api.ts`, `apps/web/src/lib/auth-context.tsx`, `apps/web/src/lib/queries.ts`
  - `apps/admin/src/lib/api.ts`, `apps/admin/src/lib/auth-context.tsx`, `apps/admin/src/lib/queries.ts`
  - `apps/mobile/src/lib/api.ts`, `apps/mobile/src/hooks/queries.ts`

---
If new work starts from this point, begin by re-running verification commands in section 5 and confirming which local processes already occupy dev ports.
