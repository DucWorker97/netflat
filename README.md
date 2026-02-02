# Netflop Observability

This directory contains Grafana dashboards and configuration for monitoring the Netflop pipeline.

## Dashboards

### Pipeline Trace (`netflop-pipeline.json`)
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
3. Upload `dashboards/netflop-pipeline.json`
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

# 2. Start infrastructure (Docker)
pnpm infra:up

# 3. Run database migrations
pnpm db:migrate:deploy

# 4. Start all core services
pnpm dev:core
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start ALL services including ai-curator |
| `pnpm dev:core` | Start core services (API, Worker, Admin, Web, Mobile) |
| `pnpm mobile:start` | Start Expo Metro bundler only |
| `pnpm mobile:fix` | Fix Expo dependency mismatches |
| `pnpm kill:ports` | Kill processes on ports 3000, 8081, 9000 |

---

## Environment Configuration

Netflop uses a **single root `.env`** file. The key variable is `DEV_PUBLIC_HOST`.

### Running on Different Platforms

| Platform | DEV_PUBLIC_HOST | Command |
|----------|-----------------|---------|
| **Web/Admin** | `localhost` | `pnpm dev:core` |
| **Android Emulator** | `10.0.2.2` | `$env:DEV_PUBLIC_HOST="10.0.2.2"; pnpm dev:core` |
| **Physical Device** | `192.168.x.x` | `$env:DEV_PUBLIC_HOST="<LAN_IP>"; pnpm dev:core` |

**Host selection cheat-sheet:**
- Emulator: `10.0.2.2`
- Physical device: your LAN IP (e.g. `192.168.1.x`)
- Web-only: `localhost` (or LAN IP if running web + mobile together)

Switch consistently: update `DEV_PUBLIC_HOST` and keep all client-facing URLs (`S3_PRESIGN_BASE_URL`, `S3_PUBLIC_BASE_URL`, `EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`) on the same host, then restart services.

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
1. ✅ API `/health` returns 200
2. ✅ Upload movie + Worker encodes to `READY`
3. ✅ Emulator fetches `master.m3u8` via `10.0.2.2:9000`
4. ✅ Mobile player plays video

**Quick health check:**
```powershell
Invoke-WebRequest -Uri http://localhost:3000/health | Select StatusCode
```


