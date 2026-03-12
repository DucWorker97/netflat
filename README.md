# NETFLAT Observability

This directory contains Grafana dashboards and configuration for monitoring the NETFLAT pipeline.

## Dashboards

### Pipeline Trace (`NETFLAT-pipeline.json`)
Correlate API and Worker logs using `requestId`.

**Requirements:**
- Loki datasource (or generic logs datasource with JSON parsing support)
- Logs must be JSON formatted
- Common labels: `service` ("api" | "worker"), `env`

**Standard Log Fields:**
- `requestId`: Correlation ID
- `jobId`: BullMQ Job ID
- `movieId`: Domain ID
- `event`: Event name (e.g. `ENCODE_STARTED`)

**Sample LogQL Queries:**
- **Trace a Request:** `{env="development"} | json | requestId="$requestId"`
- **Failed Jobs:** `{service="worker"} | json | event="ENCODE_FAILED"`
- **Slow Encodes:** `{service="worker"} | json | event="ENCODE_READY" | durationMs > 60000`

## Importing
1. Login to Grafana
2. Dashboards > New > Import
3. Upload `dashboards/NETFLAT-pipeline.json`
4. Select your Loki datasource

---

## Development Setup (Windows)

### Prerequisites

- **Node.js**: LTS version (18.x or 20.x recommended). Expo requires Node LTS.
- **pnpm**: `corepack enable` then `corepack prepare pnpm@latest --activate`
- **Docker Desktop**: For PostgreSQL, Redis, MinIO, ClickHouse
- **Android Studio**: For Android Emulator (optional for mobile dev)

### Quick Start

```powershell
# 1. Install dependencies
pnpm install

# 2. Run preflight checks (env/ports/infra readiness)
pnpm dev:runtime:doctor

# 3. Start runtime (API -> Worker -> Web -> Mobile)
pnpm dev:runtime:start
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start ALL services including ai-curator |
| `pnpm dev:core` | Start core services (API, Worker, Admin, Web, Mobile) |
| `pnpm dev:web` | Use `.env.web.local` profile then start core services |
| `pnpm dev:mobile:emu` | Use `.env.mobile.emu` profile then start core services |
| `pnpm dev:lan` | Use `.env.lan.local` profile then start core services |
| `pnpm dev:runtime:doctor` | Run startup preflight checks for dual-platform mode |
| `pnpm dev:runtime:start` | Start managed runtime in dual mode with health gates |
| `pnpm dev:runtime:web` | Start managed runtime in web-only mode |
| `pnpm dev:runtime:mobile` | Start managed runtime in mobile-only mode |
| `pnpm dev:runtime:status` | Show managed runtime process status |
| `pnpm dev:runtime:stop` | Stop managed runtime processes |
| `pnpm mobile:start` | Start Expo Metro bundler only |
| `pnpm mobile:fix` | Fix Expo dependency mismatches |
| `pnpm kill:ports` | Kill processes on ports 3000, 8081, 9000 |

---

## Environment Configuration

NETFLAT uses a **single root `.env`** file. Use env profiles to generate it:
`.env.web.local`, `.env.mobile.emu`, `.env.lan.local` (copied into `.env` by scripts).

### Running on Different Platforms

| Platform | DEV_PUBLIC_HOST | Command |
|----------|-----------------|---------|
| **Web/Admin** | `localhost` | `pnpm dev:web` |
| **Android Emulator** | `10.0.2.2` | `pnpm dev:mobile:emu` |
| **Physical Device** | `192.168.x.x` | `pnpm dev:lan` |

**Host selection cheat-sheet:**
- Emulator: `10.0.2.2`
- Physical device: your LAN IP (e.g. `192.168.1.x`)
- Web-only: `localhost` (or LAN IP if running web + mobile together)

Switch consistently: edit the profile file, then run the matching `pnpm dev:*` script to copy it into `.env`.

### How It Works

- `DEV_PUBLIC_HOST` is the **single source of truth** for client-facing URLs
- API/Worker use `S3_ENDPOINT=http://localhost:9000` for internal MinIO access
- Presigned uploads use `S3_PRESIGN_BASE_URL` (client-reachable host, no bucket)
- Playback URLs use `S3_PUBLIC_BASE_URL` (derived from DEV_PUBLIC_HOST)
- Android Emulator uses `10.0.2.2` to reach host machine (not `localhost`)

### Key Environment Variables

```env
DEV_PUBLIC_HOST=localhost          # Change for emulator/device!
DEV_API_PORT=3000
DEV_MINIO_PORT=9000

# Internal (server-to-server)
S3_ENDPOINT=http://localhost:9000
S3_PRESIGN_BASE_URL=http://${DEV_PUBLIC_HOST}:${DEV_MINIO_PORT}

# Client-facing (uses DEV_PUBLIC_HOST)
S3_PUBLIC_BASE_URL=http://${DEV_PUBLIC_HOST}:${DEV_MINIO_PORT}/${S3_BUCKET}
EXPO_PUBLIC_API_BASE_URL=http://${DEV_PUBLIC_HOST}:${DEV_API_PORT}
```

---

## Troubleshooting

### Port Already in Use (EADDRINUSE)

```powershell
# Option 1: Use kill:ports script
pnpm kill:ports

# Option 2: Find and kill manually
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Metro "Failed to start watch mode"

1. Clear Metro cache: `npx expo start -c`
2. Delete node_modules and reinstall: `pnpm install`
3. Ensure metro.config.js has correct monorepo config

### Expo Dependency Mismatch

```powershell
# Auto-fix dependencies
pnpm mobile:fix
```

### Mobile Can't Connect to API

1. Ensure `DEV_PUBLIC_HOST=10.0.2.2` for Android Emulator
2. Restart all services after changing .env
3. Check API logs for `S3_PUBLIC_BASE_URL` value

---

## Smoke Test (Pass/Fail)

**PASS when:**
1. âœ… API `/health` returns 200
2. âœ… Upload movie + Worker encodes to `READY`
3. âœ… Emulator fetches `master.m3u8` via `10.0.2.2:9000`
4. âœ… Mobile player plays video

**Quick health check:**
```powershell
Invoke-WebRequest -Uri http://localhost:3000/health | Select StatusCode
```


