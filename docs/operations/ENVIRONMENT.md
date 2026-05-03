# Environment Guide

Updated: 2026-03-14

## 1. Core Files

- .env.example: template
- .env.web.local: localhost profile for web/admin development
- .env.lan.local: LAN profile for multi-device testing
- .env: active runtime env file used by API and scripts

## 2. Required Variable Groups

Database and cache:

- DATABASE_URL
- REDIS_URL

Auth:

- JWT_SECRET
- JWT_EXPIRES_IN
- JWT_REFRESH_SECRET
- JWT_REFRESH_EXPIRES_IN

Storage:

- S3_ENDPOINT
- S3_PRESIGN_BASE_URL
- S3_ACCESS_KEY
- S3_SECRET_KEY
- S3_BUCKET
- S3_REGION
- S3_PUBLIC_BASE_URL

Client URLs:

- NEXT_PUBLIC_API_BASE_URL
- NEXT_PUBLIC_S3_PUBLIC_BASE_URL

Upload and stream:

- UPLOAD_MAX_MB
- UPLOAD_PRESIGNED_TTL_SECONDS
- STREAM_URL_TTL_SECONDS

Optional external content:

- TMDB_API_KEY
- TMDB_READ_ACCESS_TOKEN

## 3. Recorder Variable

Debug recorder mount is controlled by:

- NEXT_PUBLIC_ENABLE_SESSION_RECORDER

Current local profiles in this repo set it to true, so recorder starts automatically on app startup.

## 4. Host Consistency Rules

For localhost profile:

- API public URLs must use localhost
- MinIO public base should match 9002 mapping

For LAN profile:

- Set DEV_PUBLIC_HOST to machine LAN IP
- Keep S3_ENDPOINT internal (localhost from server perspective)
- Expose public URLs with LAN IP for browser/device access

## 5. CORS

Use CORS_ORIGINS to include:

- admin origin(s)
- viewer origin(s)
- optional mobile dev origins if needed

## 6. Safety

- Do not commit secrets to public repositories.
- Keep .env values for production separate from local development profiles.
