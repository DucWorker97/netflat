# CI Gates Documentation

## Overview

This document describes the CI/CD gates for the NETFLAT project. These gates ensure code quality and system health before merging changes.

## Gates Summary

| Gate | Type | Trigger | Timeout | Required |
|------|------|---------|---------|----------|
| **verify** | Quality | PR, Push main | 15 min | âœ… P0 |
| **smoke** | Health | PR, Push main | 10 min | âœ… P0 |
| **smoke:video** | E2E | Nightly, Manual | 30 min | âŒ Optional |

---

## verify (P0 Gate)

### Purpose
Ensures code quality by running lint, typecheck, and build checks.

### Pass Criteria
- âœ… `pnpm lint` exits with code 0
- âœ… `pnpm typecheck` exits with code 0
- âœ… `pnpm build` exits with code 0

### Fail Criteria
- âŒ Any of the above commands exits with non-zero code
- âŒ Script outputs which command failed

### Run Locally
```bash
# Using pnpm script
pnpm -w verify

# Or directly
./scripts/ci/verify.sh
```

### Expected Duration
- Local: 2-5 minutes (with turbo cache)
- CI: 5-10 minutes (cold cache)

---

## smoke (P0 Gate)

### Purpose
Verifies infrastructure health and API availability.

### Pass Criteria
- âœ… Docker services healthy: `postgres`, `redis`, `minio`
- âœ… API health endpoint returns HTTP 200: `GET /health`
- âœ… All checks complete within timeout (default: 120s)

### Fail Criteria
- âŒ Any Docker service not healthy within timeout
- âŒ API health check fails or times out
- âŒ Script outputs failing service and logs

### Run Locally
```bash
# Start infrastructure first
pnpm infra:up

# Wait for services, then run smoke
pnpm -w smoke

# Or directly with options
SMOKE_TIMEOUT=90 ./scripts/ci/smoke.sh
```

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `SMOKE_TIMEOUT` | 120 | Timeout in seconds |
| `API_URL` | http://localhost:3000 | API base URL |
| `ADMIN_URL` | http://localhost:3001 | Admin panel URL |
| `SKIP_COMPOSE_UP` | false | Skip docker compose up |

### Expected Duration
- Local: 1-2 minutes (services already running)
- CI: 3-5 minutes (cold start)

---

## smoke:video (Optional Gate)

### Purpose
End-to-end test of the video upload and encoding pipeline.

### Pass Criteria
- âœ… Can authenticate as admin
- âœ… Can create a new movie
- âœ… Can get presigned upload URL
- âœ… Can upload video to storage
- âœ… Can trigger encoding
- âœ… Encoding completes with status "ready"
- âœ… HLS playlist is accessible

### Fail Criteria
- âŒ Any API call fails
- âŒ Encoding doesn't reach "ready" within timeout
- âŒ Encoding fails with error
- âŒ HLS playlist not accessible

### Run Locally
```bash
# Ensure full stack is running (API + Worker)
pnpm infra:up
pnpm --filter @NETFLAT/api dev &
pnpm --filter @NETFLAT/worker dev &

# Run the smoke test
pnpm -w smoke:video

# Or directly
./scripts/ci/video-pipeline-smoke.sh
```

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | http://localhost:3000 | API base URL |
| `ADMIN_EMAIL` | admin@NETFLAT.local | Admin email |
| `ADMIN_PASSWORD` | admin123 | Admin password |
| `ENCODE_TIMEOUT` | 300 | Encoding timeout (seconds) |

### Expected Duration
- Local: 1-3 minutes (depending on video size)
- CI: 5-15 minutes

### Prerequisites
- FFmpeg installed (`ffmpeg` command available)
- Worker service running
- Database seeded with admin user

---

## CI Workflow Details

### PR / Push to main (`.github/workflows/ci.yml`)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    CI Pipeline                          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚  verify  â”‚ â”€â”€â–º â”‚  smoke   â”‚ â”€â”€â–º â”‚ ci-complete  â”‚    â”‚
â”‚  â”‚  (P0)    â”‚     â”‚  (P0)    â”‚     â”‚   (summary)  â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚                                                         â”‚
â”‚  â€¢ Runs on every PR                                     â”‚
â”‚  â€¢ Runs on push to main                                 â”‚
â”‚  â€¢ Uses pnpm cache                                      â”‚
â”‚  â€¢ Concurrent runs cancelled                            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Nightly Video Smoke (`.github/workflows/nightly-video-smoke.yml`)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              Nightly Video Smoke Pipeline               â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  video-pipeline-   â”‚ â”€â”€â–º â”‚  upload-artifacts    â”‚   â”‚
â”‚  â”‚      smoke         â”‚     â”‚  (logs/reports)      â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                                                         â”‚
â”‚  â€¢ Runs daily at 02:00 UTC                              â”‚
â”‚  â€¢ Manual trigger: "Nightly Video Smoke"                â”‚
â”‚  â€¢ Uploads execution logs and JSON report               â”‚
â”‚  â€¢ Cleans up Docker environment automatically           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Troubleshooting

### verify fails

1. **Lint errors**: Run `pnpm lint` locally to see detailed errors
2. **Type errors**: Run `pnpm typecheck` to see type issues
3. **Build errors**: Check for missing dependencies or syntax errors

### smoke fails

1. **Docker not running**: Ensure Docker daemon is running
2. **Port conflicts**: Check if ports 5432, 6379, 9000 are free
3. **Service unhealthy**: Check logs with `docker compose logs <service>`
4. **API not responding**: Ensure API is built and started

### smoke:video fails

1. **FFmpeg not installed**: Install FFmpeg
2. **Auth fails**: Ensure database is seeded
3. **Encoding timeout**: Check worker logs
4. **Storage issues**: Check MinIO is accessible

---

## Adding New Gates

To add a new gate:

1. Create a script in `scripts/ci/`:
   ```bash
   #!/usr/bin/env bash
   source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
   # ... your gate logic ...
   ```

2. Add to `package.json`:
   ```json
   "my-gate": "bash scripts/ci/my-gate.sh"
   ```

3. Add to CI workflow if required on every PR

4. Document pass/fail criteria in this file
