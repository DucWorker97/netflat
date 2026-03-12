# NETFLAT â€” Technical Handoff Document

> **Generated:** 2026-03-10 23:00 (Asia/Ho_Chi_Minh)
> **Prepared by:** Antigravity (Google DeepMind)
> **Previous handoff:** `docs/CLAUDE_OPUS46_HANDOFF.md` (Codex/GPT-5, 2026-03-10)
> **Purpose:** Full project state transfer so any AI agent (Claude Opus 4.6 or equivalent) can continue development without context loss.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Technology Stack](#3-technology-stack)
4. [Application Architecture](#4-application-architecture)
5. [Database Schema](#5-database-schema)
6. [API Module Map](#6-api-module-map)
7. [Authentication & Security](#7-authentication--security)
8. [Video Pipeline](#8-video-pipeline)
9. [Environment Configuration](#9-environment-configuration)
10. [Infrastructure (Docker)](#10-infrastructure-docker)
11. [Feature Status Matrix](#11-feature-status-matrix)
12. [Known Issues & Technical Debt](#12-known-issues--technical-debt)
13. [Recent Changes (Session 2026-03-10)](#13-recent-changes-session-2026-03-10)
14. [Pending Migrations](#14-pending-migrations)
15. [Verification Commands](#15-verification-commands)
16. [Key File Index](#16-key-file-index)
17. [Recommended Next Actions](#17-recommended-next-actions)

---

## 1. Project Overview

**NETFLAT** is a Netflix mini-clone graduation project. It is a full-stack video streaming platform with:

- **Viewer web app** (Next.js) â€” browse, search, play HLS videos
- **Viewer mobile app** (Expo React Native) â€” same capabilities on Android/iOS
- **Admin CMS** (Next.js) â€” movie CRUD, video upload, encode monitoring
- **Backend API** (NestJS) â€” REST API with JWT auth, Prisma ORM, BullMQ
- **HLS Worker** (Node.js) â€” FFmpeg-based video encoding pipeline
- **AI Curator** (Python/FastAPI) â€” recommendation engine with ML + Gemma LLM

### Source of Truth (Priority Order)

```
docs/PRD.md > docs/ARCHITECTURE.md > OPENAPI.yaml > Code
```

---

## 2. Repository Structure

```
NETFLAT/                          # pnpm + Turborepo monorepo
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ api/                      # NestJS backend (port 3000)
â”‚   â”‚   â”œâ”€â”€ prisma/               # Schema + 9 migrations
â”‚   â”‚   â””â”€â”€ src/                  # 25 NestJS modules
â”‚   â”œâ”€â”€ admin/                    # Next.js admin CMS (port 3001)
â”‚   â”œâ”€â”€ web/                      # Next.js viewer web (port 3002)
â”‚   â”œâ”€â”€ mobile/                   # Expo React Native (Metro 8081)
â”‚   â”œâ”€â”€ worker/                   # FFmpeg HLS encoder (BullMQ consumer)
â”‚   â””â”€â”€ ai-curator/               # Python FastAPI + ML (port 8000)
â”œâ”€â”€ packages/                     # Shared packages (if any)
â”œâ”€â”€ scripts/
â”‚   â”œâ”€â”€ dev-runtime.js            # Managed dev launcher (Windows)
â”‚   â”œâ”€â”€ use-env.js                # .env profile switcher
â”‚   â”œâ”€â”€ ci/                       # verify.sh, smoke.sh, video-pipeline-smoke.sh
â”‚   â”œâ”€â”€ check-mojibake.js         # Encoding issue detector
â”‚   â””â”€â”€ fix-mojibake.js           # Encoding issue fixer
â”œâ”€â”€ docs/                         # 28 documentation files
â”œâ”€â”€ deploy/                       # Staging docker-compose
â”œâ”€â”€ ops/                          # Operational configs
â”œâ”€â”€ docker-compose.yml            # Local dev infrastructure
â”œâ”€â”€ turbo.json                    # Turborepo pipeline config
â”œâ”€â”€ OPENAPI.yaml                  # API contract (48KB)
â”œâ”€â”€ feature_status.md             # Feature implementation matrix
â””â”€â”€ .env.example                  # Environment template
```

---

## 3. Technology Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| **Monorepo** | pnpm + Turborepo | pnpm 9.15.0, Node â‰¥18 |
| **API** | NestJS + Prisma | TypeScript, PostgreSQL |
| **Queue** | BullMQ + Redis | Job processing for encode pipeline |
| **Storage** | MinIO (S3-compatible) | Local dev; production â†’ AWS S3 |
| **Web** | Next.js | React 19 |
| **Admin** | Next.js | React 19, i18n (vi/en) |
| **Mobile** | Expo React Native | expo-video for HLS playback |
| **Worker** | Node.js + FFmpeg | MP4 â†’ HLS (360p + 720p) |
| **AI** | Python FastAPI | scikit-learn + Google Gemma LLM |
| **Analytics** | ClickHouse | Big data analytics (OLAP) |
| **Auth** | JWT (access + refresh) | bcrypt, rate limiting, lockout |
| **Security** | Helmet, CORS, Throttler | CAPTCHA (opt-in), Mail (opt-in) |

---

## 4. Application Architecture

### 4.1 Request Flow

```
Mobile/Web Client
    â†“ (JWT Bearer token)
NestJS API (port 3000)
    â”œâ”€â”€ /api/* (global prefix)
    â”œâ”€â”€ /health (excluded from prefix)
    â”œâ”€â”€ Prisma â†’ PostgreSQL (port 5432)
    â”œâ”€â”€ BullMQ â†’ Redis (port 6379)
    â””â”€â”€ S3 Client â†’ MinIO (port 9000)

Worker (BullMQ consumer)
    â”œâ”€â”€ Polls Redis for encode jobs
    â”œâ”€â”€ FFmpeg: MP4 â†’ HLS (master.m3u8 + variants)
    â”œâ”€â”€ Uploads segments to MinIO
    â””â”€â”€ Callbacks API to update movie status
```

### 4.2 Port Map

| Service | Port | Notes |
|---------|------|-------|
| API | 3000 | NestJS REST API |
| Admin | 3001 | Next.js admin CMS |
| Web | 3002 | Next.js viewer app |
| Metro | 8081 | Expo dev server |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Queue + cache |
| MinIO API | 9000 | S3-compatible object storage |
| MinIO Console | 9001 | Web UI for MinIO |
| ClickHouse HTTP | 8123 | Analytics queries |
| ClickHouse Native | 9009 | Remapped from 9000 to avoid MinIO conflict |
| AI Curator | 8000 | Python FastAPI |

### 4.3 NestJS Bootstrap (`apps/api/src/main.ts`)

```typescript
app.setGlobalPrefix('api', { exclude: ['health'] });
// â†’ All controllers routes are under /api/*
// â†’ /health is the only exception
```

Key middleware chain:
1. `helmet()` â€” security headers
2. `RequestIdMiddleware` â€” X-Request-Id correlation
3. `HttpExceptionFilter` â€” standardized error responses
4. `ValidationPipe` â€” whitelist + transform + forbidNonWhitelisted
5. `ThrottlerGuard` â€” global rate limiting (APP_GUARD)

---

## 5. Database Schema

**Database:** PostgreSQL 15 via Prisma ORM
**Migrations:** 9 applied (see Section 14 for pending)

### Enums

| Enum | Values |
|------|--------|
| `UserRole` | `viewer`, `admin` |
| `MovieStatus` | `draft`, `published` |
| `EncodeStatus` | `pending`, `processing`, `ready`, `failed` |
| `UploadFileType` | `video`, `thumbnail` |
| `UploadStatus` | `uploading`, `uploaded`, `failed` |
| `EncodeJobStatus` | `pending`, `processing`, `completed`, `failed` |
| `MaturityRating` | `G`, `PG`, `PG_13`, `R`, `NC_17` |
| `SubscriptionPlan` | `FREE`, `BASIC`, `PREMIUM` |
| `SubscriptionStatus` | `ACTIVE`, `CANCELED`, `PAST_DUE` |
| `PaymentStatus` | `PENDING`, `SUCCESS`, `FAILED` |
| `NotificationType` | `INFO`, `ALERT`, `NEW_MOVIE` |

### Models (18 total)

| Model | Table | Key Fields | Relations |
|-------|-------|------------|-----------|
| **User** | `users` | email, passwordHash, role, `isActive`â€ , `disabledAt`â€ , `disabledReason`â€  | â†’ Profile[], Favorite[], WatchHistory[], Rating[], LoginAttempt[], RefreshToken[], PasswordResetToken[], Notification[], Subscription?, PaymentMethod[] |
| **Profile** | `profiles` | name, avatarUrl, isKids, pinEnabled, maxRating | â†’ User, Favorite[], WatchHistory[], Rating[] |
| **Movie** | `movies` | title, description, posterUrl, backdropUrl, durationSeconds, movieStatus, encodeStatus, playbackUrl, originalKey, tmdbId, popularity | â†’ Genre[], Actor[], Favorite[], WatchHistory[], Upload[], EncodeJob[], Rating[] |
| **Genre** | `genres` | name, slug | â†’ Movie[] (M:N via MovieGenre) |
| **Actor** | `actors` | name, avatarUrl | â†’ Movie[] (M:N via MovieActor) |
| **Favorite** | `favorites` | userId, profileId?, movieId | Unique: [profileId, movieId] |
| **WatchHistory** | `watch_history` | userId, profileId?, movieId, progressSeconds, durationSeconds, completed | Unique: [profileId, movieId] |
| **Rating** | `ratings` | userId, profileId?, movieId, rating (1-5), comment? | Unique: [profileId, movieId] |
| **Upload** | `uploads` | movieId, objectKey (unique), fileType, uploadStatus, sizeBytes | â†’ Movie |
| **EncodeJob** | `encode_jobs` | movieId, inputKey (unique), outputPrefix, status, attempts, errorMessage | â†’ Movie |
| **RefreshToken** | `refresh_tokens` | userId, token (unique hash), expiresAt, revoked | â†’ User |
| **PasswordResetToken** | `password_reset_tokens` | userId, tokenHash (unique), expiresAt, usedAt | â†’ User |
| **LoginAttempt** | `login_attempts` | userId?, email, ipAddress, userAgent, succeeded | â†’ User? |
| **PlayEvent** | `play_events` | userId, profileId?, movieId | Analytics tracking |
| **RailConfig** | `rail_configs` | name, type, genreId?, position, isActive | Homepage rail configuration |
| **Subscription** | `subscriptions` | userId (unique), plan, status, startDate, endDate | â†’ User, Payment[] |
| **Payment** | `payments` | subscriptionId, amount, currency, status, provider | â†’ Subscription |
| **Notification** | `notifications` | userId? (null=global), title, message, type, isRead, movieId? | â†’ User?, Movie? |

> â€  Fields marked with â€  are **newly added** (2026-03-10) and require `prisma migrate dev` â€” see Section 14.

---

## 6. API Module Map

All 25 modules registered in `apps/api/src/app.module.ts`:

| Module | Controller Routes | Purpose |
|--------|------------------|---------|
| **AuthModule** | `/api/auth/*` | Register, login, refresh, logout, forgot/reset password, me |
| **UsersModule** | `/api/users/*` | Profile, change password, **disable/enable user** (admin) |
| **AccountModule** | `/api/account/*` | Account settings |
| **MoviesModule** | `/api/movies/*` | List, search, detail, stream URL |
| **GenresModule** | `/api/genres/*` | Genre CRUD |
| **ActorsModule** | `/api/actors/*` | Actor CRUD |
| **FavoritesModule** | `/api/favorites/*` | Add/remove/list favorites |
| **HistoryModule** | `/api/history/*` | Watch history upsert/list |
| **RatingsModule** | `/api/ratings/*` | Rate movies (1-5 stars + comment) |
| **UploadModule** | `/api/upload/*` | Presigned URL generation, upload complete callback |
| **AdminModule** | `/api/admin/*` | Admin-only movie management, dashboard |
| **RailsModule** | `/api/rails/*` | Homepage rail configuration |
| **RecommendationsModule** | `/api/recommendations/*` | Movie recommendations |
| **EventsModule** | `/api/events/*` | Analytics event ingestion |
| **ProfilesModule** | `/api/profiles/*` | Multi-profile management |
| **BillingModule** | `/api/billing/*` | Subscription/payment (out-of-scope but exists) |
| **PaymentMethodsModule** | `/api/payment-methods/*` | Payment method CRUD |
| **NotificationsModule** | `/api/notifications/*` | In-app notifications |
| **AnalyticsModule** | `/api/analytics/*` | ClickHouse analytics |
| **AiModule** | `/api/ai/*` | AI curator integration |
| **HealthController** | `/health` | Health check (excluded from /api prefix) |
| **MailModule** | (global, no controller) | Email sending via Nodemailer SMTP |
| **PrismaModule** | (global, no controller) | Database access |
| **CommonModule** | (shared utilities) | Filters, middleware, decorators |
| **ConfigModule** | (global) | Environment + security config |

---

## 7. Authentication & Security

### 7.1 Auth Flow

```
POST /api/auth/register  â†’  Create user + return JWT pair
POST /api/auth/login     â†’  Validate credentials + return JWT pair
POST /api/auth/refresh   â†’  Rotate tokens using refresh token
POST /api/auth/logout    â†’  Revoke refresh token
POST /api/auth/forgot-password  â†’  Generate reset token (+ send email if MAIL_ENABLED)
POST /api/auth/reset-password   â†’  Validate token + update password + revoke all tokens
GET  /api/auth/me        â†’  Return current user
```

### 7.2 Security Layers

| Layer | Implementation | Status |
|-------|---------------|--------|
| **Password hashing** | bcrypt (10 rounds) | âœ… Active |
| **JWT tokens** | Access (15m) + Refresh (7d) | âœ… Active |
| **Rate limiting** | @nestjs/throttler (3-tier: 1s/10s/60s) | âœ… Active |
| **Endpoint throttle** | Login: 10/60s, Register: 5/60s, ForgotPassword: 5/15m | âœ… Active |
| **Login lockout** | 5 failed attempts â†’ 15min lockout | âœ… Active |
| **Login attempt tracking** | `login_attempts` table with IP/UA | âœ… Active |
| **Password policy** | Min length + complexity regex | âœ… Active |
| **Email normalization** | Lowercase + trim before lookup/store | âœ… Active |
| **CAPTCHA guard** | reCAPTCHA v2/v3, Cloudflare Turnstile | âœ… Built, **opt-in** (`CAPTCHA_ENABLED=false`) |
| **Account disable** | `isActive` + `disabledAt` + `disabledReason` on User | âœ… Built, **pending migration** |
| **Mail service** | Nodemailer SMTP for password reset emails | âœ… Built, **opt-in** (`MAIL_ENABLED=false`) |
| **Admin user disable** | `PATCH /api/users/:id/disable`, `PATCH /api/users/:id/enable` | âœ… Built, **pending migration** |
| **Helmet** | Security headers | âœ… Active |
| **CORS** | Configurable origins via env | âœ… Active |
| **Input validation** | class-validator + whitelist + forbidNonWhitelisted | âœ… Active |
| **Request ID** | X-Request-Id middleware for log correlation | âœ… Active |

### 7.3 Security Config (`apps/api/src/config/security.config.ts`)

Central typed config with env var parsing:
- `security.cors` â€” origins, credentials
- `security.auth.jwt` â€” access/refresh TTL
- `security.auth.loginProtection` â€” max attempts, lockout duration
- `security.auth.passwordReset` â€” TTL, debug mode, base URL
- `security.captcha` â€” enabled, provider, siteKey, secretKey, minimumScore
- `security.mail` â€” enabled, provider, host, port, credentials

---

## 8. Video Pipeline

### 8.1 Upload â†’ Encode â†’ Playback

```
Admin CMS                API                     Worker              MinIO
   â”‚                      â”‚                        â”‚                   â”‚
   â”œâ”€ POST /upload/init â”€â†’â”‚                        â”‚                   â”‚
   â”‚â†â”€ presigned URL â”€â”€â”€â”€â”€â”‚                        â”‚                   â”‚
   â”œâ”€ PUT (binary) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ â”‚
   â”œâ”€ POST /upload/complete â†’â”‚                     â”‚                   â”‚
   â”‚                      â”œâ”€ Enqueue BullMQ job â”€â”€â†’â”‚                   â”‚
   â”‚                      â”‚                        â”œâ”€ Download MP4 â†â”€â”€ â”‚
   â”‚                      â”‚                        â”œâ”€ FFmpeg encode    â”‚
   â”‚                      â”‚                        â”œâ”€ Upload HLS â”€â”€â”€â”€â†’ â”‚
   â”‚                      â”‚â†â”€ Callback: status â”€â”€â”€â”€â”‚                   â”‚
   â”‚                      â”‚   update movie record  â”‚                   â”‚
   â”‚                      â”‚                        â”‚                   â”‚
Viewer                    â”‚                        â”‚                   â”‚
   â”œâ”€ GET /movies/:id/stream â†’â”‚                    â”‚                   â”‚
   â”‚â†â”€ playbackUrl (signed) â”€â”€â”‚                    â”‚                   â”‚
   â”œâ”€ GET master.m3u8 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ â”‚
   â”œâ”€ GET variant/*.ts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ â”‚
```

### 8.2 HLS Output Structure

```
hls/{movieId}/
â”œâ”€â”€ master.m3u8          # Multi-variant playlist
â”œâ”€â”€ v360p/
â”‚   â”œâ”€â”€ playlist.m3u8    # 360p variant
â”‚   â””â”€â”€ segment_*.ts
â””â”€â”€ v720p/
    â”œâ”€â”€ playlist.m3u8    # 720p variant
    â””â”€â”€ segment_*.ts
```

### 8.3 MinIO Bucket Policy

- Bucket: `NETFLAT-media`
- Public read on: `hls/`, `posters/`, `thumbnails/`, `subtitles/`
- Private: `originals/` (uploaded MP4s)

---

## 9. Environment Configuration

### 9.1 Root `.env` â€” Single source for all apps

See `.env.example` for all variables. Key groups:

| Group | Variables | Notes |
|-------|----------|-------|
| Database | `DATABASE_URL` | PostgreSQL connection string |
| Redis | `REDIS_URL` | Redis connection for BullMQ |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | Auth tokens |
| S3/MinIO | `S3_ENDPOINT`, `S3_PRESIGN_BASE_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL` | Object storage |
| Upload | `UPLOAD_MAX_MB`, `UPLOAD_PRESIGNED_TTL_SECONDS`, `STREAM_URL_TTL_SECONDS` | Upload/stream limits |
| CORS | `CORS_ORIGINS` | Comma-separated origins |
| Admin | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_S3_PUBLIC_BASE_URL` | Admin Next.js env |
| Mobile | `EXPO_PUBLIC_API_BASE_URL` | Expo public env |
| AI | `AI_CURATOR_URL`, `GOOGLE_AI_API_KEY` | AI service |
| Analytics | `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_DATABASE` | ClickHouse |
| CAPTCHA | `CAPTCHA_ENABLED`, `CAPTCHA_PROVIDER`, `CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET_KEY` | **Disabled by default** |
| Mail | `MAIL_ENABLED`, `MAIL_PROVIDER`, `MAIL_FROM`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` | **Disabled by default** |

### 9.2 Env Profiles

| File | `DEV_PUBLIC_HOST` | Use Case |
|------|-------------------|----------|
| `.env.web.local` | `localhost` | Web/Admin development |
| `.env.mobile.emu` | `10.0.2.2` | Android Emulator |
| `.env.lan.local` | `192.168.x.x` | Physical device over LAN |

Switch with: `pnpm dev:web` / `pnpm dev:mobile:emu` / `pnpm dev:lan`

---

## 10. Infrastructure (Docker)

### `docker-compose.yml` â€” 5 services

| Service | Image | Port | Volume |
|---------|-------|------|--------|
| `postgres` | postgres:15-alpine | 5432 | `postgres-data` |
| `redis` | redis:7-alpine | 6379 | â€” |
| `minio` | minio/minio:latest | 9000, 9001 | `minio-data` |
| `minio-init` | minio/mc:latest | â€” | Initializes bucket + public policies |
| `clickhouse` | clickhouse/clickhouse-server:24-alpine | 8123, 9009 | `clickhouse-data` |
| `ai-curator` | Built from `apps/ai-curator/Dockerfile` | 8000 | `ai-models` |

### Common Commands

```powershell
pnpm infra:up          # Start all containers
pnpm infra:down        # Stop all containers
pnpm infra:reset       # Drop volumes + restart (DESTRUCTIVE)
pnpm db:generate       # Regenerate Prisma client
pnpm db:migrate        # Run pending migrations
pnpm db:seed           # Seed database with sample data
pnpm db:studio         # Open Prisma Studio GUI
```

---

## 11. Feature Status Matrix

### âœ… MVP Complete

- Auth (register/login/refresh/logout/forgot/reset password)
- Movie CRUD (admin), list/search/detail (viewer)
- Video upload â†’ HLS encode â†’ playback
- Watch history with resume
- Favorites (my list)
- Genre rails on home
- Hero banner
- Search
- Admin CMS (full movie management)
- Notifications (database-backed, in-app)

### â ï¸ Partial

| Feature | Status |
|---------|--------|
| Multiple profiles | DB model exists, UI incomplete |
| AI recommendations | Service exists, integration partial |
| Rate movies | API exists, not in OpenAPI |
| Dashboard analytics | PlayEvent tracking exists, no admin UI |
| Quality selector | HLS variants exist, UI partial |
| Subtitles | Not implemented (S-01) |

### âŒ Not Implemented

- Subtitle upload/display
- 480p HLS variant
- Auto-generate thumbnails
- Push notifications
- Offline download
- DRM / Live streaming

### Web Feature Flags (`apps/web/src/lib/feature-flags.ts`)

All currently **disabled** (`false`):
`top10`, `comingSoon`, `notifications`, `browseLanguage`, `search`, `actor`, `advancedSearch`

---

## 12. Known Issues & Technical Debt

| Issue | Severity | Location | Notes |
|-------|----------|----------|-------|
| `prisma generate` fails with EPERM on Windows | Medium | Prisma engine DLL locked by running process | Stop dev server first |
| Dev runtime not fully stable on Windows | Medium | `scripts/dev-runtime.js` | Auto-restart + health monitor added |
| Billing module exists but out of scope | Low | `apps/api/src/billing/` | Should be removed or isolated |
| Some docs have mojibake encoding | Low | Various `.md` files | Use `pnpm check:mojibake` |
| Feature flags all disabled on web | Info | `apps/web/src/lib/feature-flags.ts` | Enable as features are ready |
| Missing OpenAPI entries | Medium | Rails, Recommendations, Ratings, Actors, Events, Health | Need to sync with OPENAPI.yaml |
| `scripts/tsconfig.json` lint warning | Low | tsconfig include pattern | No `.ts` files in scripts/ (only `.js`) |

---

## 13. Recent Changes (Session 2026-03-10)

### By Codex (GPT-5) â€” Earlier Session

- Route prefix fix (global `/api` prefix)
- Auth security hardening (login tracking, lockout, password policy)
- Mock â†’ real API migration (major areas)
- Build/typecheck blockers fixed
- Mobile TS debt cleanup
- Dev runtime manager created

### By Antigravity (DeepMind) â€” This Session

| # | Item | Files Changed |
|---|------|---------------|
| 1 | **Dev runtime stability** | `scripts/dev-runtime.js` â€” graceful shutdown, auto-restart, health monitor, `--no-monitor` flag |
| 2 | **Android artifacts cleanup** | `.gitignore` â€” added `apps/mobile/android/{.gradle,build,app/build}/` |
| 3 | **Mock â†’ real API** | 6 pages migrated: `top10`, `coming-soon`, `browse` (web), `downloads` (mobile), `BulkActions`, `subtitles` (admin) |
| 4 | **Web lint enforcement** | `apps/web/next.config.js` â€” removed `eslint.ignoreDuringBuilds: true` |
| 5 | **AI curator typecheck** | `apps/ai-curator/turbo.json` (new), `apps/ai-curator/package.json` â€” typecheck â†’ no-op in turbo |
| 6 | **Security hardening** | 4 new files + 7 modified files (see below) |

#### Security Hardening Details (Item 6)

**New files:**
- `apps/api/src/auth/captcha.service.ts` â€” CAPTCHA verification (reCAPTCHA/Turnstile)
- `apps/api/src/auth/guards/captcha.guard.ts` â€” NestJS guard for endpoints
- `apps/api/src/mail/mail.service.ts` â€” Nodemailer SMTP transport
- `apps/api/src/mail/mail.module.ts` â€” Global mail module

**Modified files:**
- `apps/api/prisma/schema.prisma` â€” `isActive`, `disabledAt`, `disabledReason` on User
- `apps/api/src/auth/auth.module.ts` â€” wired CaptchaService + MailModule
- `apps/api/src/auth/auth.controller.ts` â€” `@UseGuards(CaptchaGuard)` on register/login
- `apps/api/src/auth/auth.service.ts` â€” isActive check in login, mail in forgotPassword
- `apps/api/src/users/users.controller.ts` â€” PATCH `:id/disable` and `:id/enable`
- `apps/api/src/users/users.service.ts` â€” `disableUser()` + `enableUser()` methods
- `.env.example` â€” added CAPTCHA_* and MAIL_* variables

---

## 14. Pending Migrations

> [!IMPORTANT]
> The Prisma schema was updated with new fields (`isActive`, `disabledAt`, `disabledReason` on User) but the migration has NOT been applied yet.

### Required Steps

```powershell
# 1. Stop any running dev server (to release Prisma engine lock)
pnpm dev:runtime:stop

# 2. Regenerate Prisma client types
pnpm db:generate

# 3. Create and apply migration
cd apps/api
npx prisma migrate dev --name add_account_disable_fields

# 4. Verify types resolve
cd ../..
pnpm typecheck
```

### Applied Migrations (9)

| Version | Name |
|---------|------|
| 20260101074529 | `init` |
| 20260107044428 | `add_ratings` |
| 20260109164734 | `add_actors` |
| 20260110073522 | `add_tmdb_fields` |
| 20260112074009 | `init` |
| 20260115150804 | `add_pipeline_idempotency` |
| 20260204054040 | `add_payment_methods_and_parental_controls` |
| 20260208051708 | `add_comment_to_rating` |
| 20260310093000 | `add_auth_security_tables` |

---

## 15. Verification Commands

```powershell
# Health check
curl http://localhost:3000/health

# Full quality gates
pnpm lint                          # ESLint all packages
pnpm typecheck                     # TypeScript all packages
pnpm --filter @NETFLAT/web build   # Web production build (now enforces lint)
pnpm --filter @NETFLAT/admin build # Admin production build

# Smoke tests
pnpm smoke                         # Basic smoke test
pnpm smoke:video                   # Full video pipeline test

# Docker infrastructure
pnpm infra:up                      # Start Postgres, Redis, MinIO, ClickHouse
docker ps                          # Verify containers running
```

---

## 16. Key File Index

### Entry Points

| File | Purpose |
|------|---------|
| `apps/api/src/main.ts` | API bootstrap |
| `apps/api/src/app.module.ts` | Module registration (25 modules) |
| `apps/api/src/config/security.config.ts` | Security config (CORS, JWT, CAPTCHA, Mail) |
| `apps/api/src/config/env.validation.ts` | Environment validation |
| `apps/api/prisma/schema.prisma` | Database schema |
| `scripts/dev-runtime.js` | Development launcher |
| `turbo.json` | Turborepo pipeline |
| `docker-compose.yml` | Infrastructure services |

### Auth Domain

| File | Purpose |
|------|---------|
| `apps/api/src/auth/auth.controller.ts` | Auth endpoints (register, login, refresh, etc.) |
| `apps/api/src/auth/auth.service.ts` | Auth logic (tokens, lockout, password reset) |
| `apps/api/src/auth/auth.module.ts` | Module wiring (CaptchaService, MailModule) |
| `apps/api/src/auth/captcha.service.ts` | CAPTCHA token verification |
| `apps/api/src/auth/guards/jwt-auth.guard.ts` | JWT authentication guard |
| `apps/api/src/auth/guards/captcha.guard.ts` | CAPTCHA verification guard |
| `apps/api/src/auth/guards/optional-jwt-auth.guard.ts` | Optional JWT guard |
| `apps/api/src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy |
| `apps/api/src/common/utils/security.ts` | Password policy, email normalization |

### Frontend API Layers

| App | API Client | Auth Context | Queries |
|-----|-----------|-------------|---------|
| Web | `apps/web/src/lib/api.ts` | `apps/web/src/lib/auth-context.tsx` | `apps/web/src/lib/queries.ts` |
| Admin | `apps/admin/src/lib/api.ts` | `apps/admin/src/lib/auth-context.tsx` | `apps/admin/src/lib/queries.ts` |
| Mobile | `apps/mobile/src/lib/api.ts` | â€” | `apps/mobile/src/hooks/queries.ts` |

### Key Documentation

| File | Content |
|------|---------|
| `docs/PRD.md` | Product Requirements Document |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/DATABASE_SCHEMA.md` | Schema documentation |
| `OPENAPI.yaml` | API contract |
| `feature_status.md` | Feature implementation matrix |
| `docs/VIDEO_PIPELINE.md` | Encode pipeline docs |
| `docs/UPLOAD_AND_PLAYBACK_FLOW.md` | Upload/playback flow |
| `docs/DEPLOY_STAGING.md` | Staging deployment guide |
| `CI_GATES.md` | CI/CD quality gates |

---

## 17. Recommended Next Actions

### Immediate (Before Starting Work)

1. **Apply pending migration** â€” Run `prisma migrate dev --name add_account_disable_fields`
2. **Regenerate Prisma client** â€” Run `pnpm db:generate`
3. **Verify typecheck** â€” Run `pnpm typecheck`
4. **Check port availability** â€” Run `pnpm dev:runtime:doctor`

### Short-Term Priorities

| # | Task | Difficulty | Impact |
|---|------|-----------|--------|
| 1 | Sync OPENAPI.yaml with new endpoints (CAPTCHA, account disable, mail) | Medium | High |
| 2 | Enable and test web feature flags one by one | Low | Medium |
| 3 | Add subtitle support (VTT upload + player integration) | Medium | High |
| 4 | Add 480p HLS variant in worker encode | Low | Medium |
| 5 | Build admin analytics dashboard (ClickHouse â†’ charts) | Medium | Medium |
| 6 | Remove or isolate billing module (out of scope) | Low | Low |
| 7 | Add missing unit/integration tests for security module | High | High |

### Long-Term

- Push notification system (FCM/APNs)
- Profile switching UI (mobile + web)
- Quality selector UI in video player
- Staging deployment automation (CI/CD pipeline)
- Production S3 migration from MinIO

---

## Appendix: Workspace Rules

The project follows strict workspace rules defined in `.agent/rules/NETFLAT.md`:

- **Priority order:** PRD > Architecture > OpenAPI > Code
- **Fixed stack:** No technology changes without explicit request
- **Delivery rhythm:** Plan â†’ Implement â†’ Verify â†’ Summarize
- **Pipeline invariants:** Presigned upload + HLS playback must be kept in sync
- **Contract sync:** Update docs first, then code, then smoke tests
- **.env secrets:** Never committed; update `.env.example` when adding env vars

---

*End of handoff document. Start by running verification commands in Section 15 to establish baseline.*
