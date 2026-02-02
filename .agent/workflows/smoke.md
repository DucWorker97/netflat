---
name: workflow-smoke
description: Quick smoke checks for local services (infra + api + admin).
trigger: manual
---


# /smoke — Infrastructure Health Gate

Verifies that infrastructure services are healthy and API is responding.

## Pass/Fail Criteria

**PASS when:**
- ✅ Docker services healthy: `postgres`, `redis`, `minio`
- ✅ API health endpoint returns HTTP 200
- ✅ All checks complete within timeout (default: 120s)

**FAIL when:**
- ❌ Any Docker service not healthy within timeout
- ❌ API health check fails or times out
- Script outputs failing service and logs

## Run Locally

```bash
# Start infrastructure first
pnpm infra:up

# Run smoke test
pnpm -w smoke

# Or with custom timeout
SMOKE_TIMEOUT=90 ./scripts/ci/smoke.sh
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SMOKE_TIMEOUT` | 120 | Timeout in seconds |
| `API_URL` | http://localhost:3000 | API base URL |
| `SKIP_COMPOSE_UP` | false | Skip docker compose up |

## CI Integration

This gate runs automatically on:
- Pull Requests (after verify passes)
- Push to main

See `.github/workflows/ci.yml` for details.

## Steps

1. Check docker services
   docker compose ps

2. Check API health
   curl -i http://localhost:3000/health

3. Check Admin (basic reachability)
   curl -i http://localhost:3001 || echo "Admin not reachable (run /dev first)"

4. MinIO console reminder
   echo "MinIO Console: http://localhost:9001 (user/pass: minioadmin/minioadmin)"
