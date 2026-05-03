# Debug Checklist

Updated: 2026-03-14

Use this checklist before and during bug fixing.

## 1. Environment And Services

- Docker is running
- pnpm infra:up completed
- API responds at /health
- Admin page reachable
- Viewer page reachable

## 2. Quick Runtime Probes

- Check ports 3000, 3001, 3002 are listening
- Confirm database and redis ports are reachable
- Validate minio API on 9002

## 3. Authentication Baseline

- Login with test admin account works
- GET /api/auth/me returns correct role and isActive
- Login with viewer account works

## 4. Movie And Playback Baseline

- Movie list loads in admin and viewer
- Stream endpoint returns playback URL for published + ready movies
- HLS URL can be fetched from browser

## 5. Recorder-Driven Debug

- Reproduce bug while recorder is active
- Export JSON via REC button or Ctrl+Shift+S
- Inspect event timeline around first error/fetch_error
- Correlate with API logs by timestamp

## 6. Common Failure Patterns

- next/image host not whitelisted in next.config.js
- mismatched env host/port values
- stale process occupying runtime ports
- movie not published or encode not ready
- invalid token extraction in client code

## 7. Validation After Fix

- Typecheck for modified app(s)
- Reload and re-run reproduction steps
- Export recorder JSON again to confirm no recurrent error
- Smoke-check health and login endpoints
