# Deploy Staging Guide

**Runs entire NETFLAT stack on a single machine using Docker Compose**

---

## Prerequisites

- **Docker** 24.0+ with Compose V2
- **4GB RAM** minimum (8GB recommended)
- **Ports available**: 3000, 3001, 5432, 6379, 9000, 9001

Check Docker:
```bash
docker --version
docker compose version
```

---

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp deploy/.env.staging.example deploy/.env.staging

# Edit secrets (IMPORTANT: change in production!)
# nano deploy/.env.staging
```

### 2. Deploy

```bash
# One-command deploy
pnpm deploy:staging

# Or manually:
cd deploy
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
```

### 3. Wait for Services

Watch logs:
```bash
docker compose -f deploy/docker-compose.staging.yml logs -f
```

Wait for:
- `NETFLAT-staging-migrate` exits with code 0
- `NETFLAT-staging-api` shows "Nest application started"
- `NETFLAT-staging-worker` shows "Worker started"

### 4. Seed Database (First Deploy Only)

```bash
# Exec into API container to seed
docker exec NETFLAT-staging-api npx prisma db seed
```

### 5. Verify

```bash
# API health
curl http://localhost:3000/health

# Open Admin
open http://localhost:3001/login

# Credentials:
# admin@NETFLAT.local / admin123
# viewer@NETFLAT.local / viewer123
```

---

## URLs

| Service | URL | Notes |
|---------|-----|-------|
| API | http://localhost:3000 | REST API |
| API Health | http://localhost:3000/health | Health check |
| Admin CMS | http://localhost:3001 | Login required |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| MinIO S3 | http://localhost:9000 | For HLS files |

---

## Commands

```bash
# Start staging
pnpm deploy:staging

# Stop staging
pnpm deploy:staging:down

# View logs
pnpm deploy:staging:logs

# Restart specific service
docker compose -f deploy/docker-compose.staging.yml restart api

# Rebuild specific service
docker compose -f deploy/docker-compose.staging.yml up -d --build api
```

---

## Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     Docker Network                          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                  â”‚
â”‚  â”‚ PostgreSQLâ”‚  â”‚  Redis   â”‚  â”‚  MinIO   â”‚                  â”‚
â”‚  â”‚   :5432  â”‚  â”‚  :6379   â”‚  â”‚:9000/:9001â”‚                  â”‚
â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜                  â”‚
â”‚       â”‚             â”‚             â”‚                         â”‚
â”‚       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                         â”‚
â”‚                     â”‚                                       â”‚
â”‚              â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”                                â”‚
â”‚              â”‚   API       â”‚                                â”‚
â”‚              â”‚  :3000      â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”             â”‚
â”‚              â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜                  â”‚             â”‚
â”‚                     â”‚                         â”‚             â”‚
â”‚         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”      â”‚
â”‚         â”‚                     â”‚       â”‚             â”‚      â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”        â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”  â”‚   Admin    â”‚      â”‚
â”‚   â”‚  Worker   â”‚        â”‚  Mobile   â”‚  â”‚   :3001    â”‚      â”‚
â”‚   â”‚ (encode)  â”‚        â”‚ (external)â”‚  â”‚            â”‚      â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚
â”‚                                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Troubleshooting

### Port already in use

```bash
# Find process
lsof -i :3000
# or on Windows
netstat -ano | findstr :3000

# Kill process
kill -9 <PID>
```

### Migration failed

```bash
# Check migrate container logs
docker logs NETFLAT-staging-migrate

# Re-run migration
docker compose -f deploy/docker-compose.staging.yml up -d migrate
```

### Worker not processing jobs

```bash
# Check worker logs
docker logs NETFLAT-staging-worker

# Common issues:
# - Redis connection failed: check REDIS_URL
# - FFmpeg error: check video format
# - S3 upload failed: check MinIO credentials
```

### HLS segments return 403

```bash
# Re-apply public policy
docker exec NETFLAT-staging-minio mc anonymous set download local/NETFLAT-media/hls
docker exec NETFLAT-staging-minio mc anonymous set download local/NETFLAT-media/posters
docker exec NETFLAT-staging-minio mc anonymous set download local/NETFLAT-media/thumbnails
docker exec NETFLAT-staging-minio mc anonymous set download local/NETFLAT-media/subtitles
```

### API unhealthy

```bash
# Check logs
docker logs NETFLAT-staging-api

# Common issues:
# - Database connection: check DATABASE_URL
# - Port conflict: ensure 3000 is free
```

### Container won't start

```bash
# Full reset
docker compose -f deploy/docker-compose.staging.yml down -v
docker compose -f deploy/docker-compose.staging.yml up -d --build
```

---

## Mobile Configuration

For mobile app to connect to staging:

```bash
# iOS Simulator
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000

# Android Emulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000

# Physical Device (replace with server IP)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
```

In the mobile app, go to **Settings** tab and select the appropriate preset.

---

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f deploy/docker-compose.staging.yml up -d --build

# Run migrations if schema changed
docker compose -f deploy/docker-compose.staging.yml up -d migrate
```

---

## Data Persistence

Data is stored in Docker volumes:
- `postgres-data`: Database
- `minio-data`: Uploaded videos and HLS files

To reset all data:
```bash
docker compose -f deploy/docker-compose.staging.yml down -v
```

---

## Logs

```bash
# All services
docker compose -f deploy/docker-compose.staging.yml logs -f

docker compose -f deploy/docker-compose.staging.yml logs -f worker
```

---

## Security Hardening

### 1. MinIO / S3 Policies

We adhere to **Least Privilege Access**:
- **Uploads**: Only allowed to `PutObject` in `originals/` prefix.
- **Playback**: Public read allowed only for `hls/`, `posters/`, `thumbnails/`, `subtitles/` prefixes.
- **Presigned URLs**: Used for all uploads; generated by API with short TTL.

#### Recommended Policy (Production)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": [
        "arn:aws:s3:::NETFLAT-media/hls/*",
        "arn:aws:s3:::NETFLAT-media/posters/*",
        "arn:aws:s3:::NETFLAT-media/thumbnails/*",
        "arn:aws:s3:::NETFLAT-media/subtitles/*"
      ],
      "Principal": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::NETFLAT-media/originals/*"],
      "Principal": {"AWS": "arn:aws:iam::123456789012:user/NETFLAT-api"}
    }
  ]
}
```

### 2. Presigned URL TTL

Default TTLs are configured to balance UX and security:

| Type | Default TTL | Env Var | Notes |
|------|-------------|---------|-------|
| Upload URL | 30 mins | `UPLOAD_PRESIGNED_TTL_SECONDS` | Enough time for 5GB+ uploads on slow connections |
| Subtitle Upload | 30 mins | `UPLOAD_PRESIGNED_TTL_SECONDS` | Shared env var |

> **Note**: Playback via signed URLs (CloudFront/CDN) is planned for future. Currently, HLS is public-read but obfuscated by UUIDs.

### 3. Log Redaction

The system automatically masks:
- Presigned URL signatures
- Authorization headers
- Passwords/Secrets

Check `docs/OBSERVABILITY.md` for logging rules.

