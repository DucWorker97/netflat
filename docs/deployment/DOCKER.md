# Local Docker Infrastructure

Docker Compose manages local development services.

## Services (`docker-compose.yml`)

| Service | Image | Port | Volume |
|---------|-------|------|--------|
| `postgres` | postgres:15-alpine | 5432 | `postgres-data` |
| `redis` | redis:7-alpine | 6379 | â€” |
| `minio` | minio/minio:latest | 9000 (API), 9001 (Console) | `minio-data` |
| `minio-init` | minio/mc:latest | â€” | Initializes bucket + public policies |
| `clickhouse` | clickhouse/clickhouse-server:24-alpine | 8123 (HTTP), 9009 (Native) | `clickhouse-data` |
| `ai-curator` | Built from `apps/ai-curator/Dockerfile` | 8000 | `ai-models` |

## Commands

```powershell
pnpm infra:up          # Start all containers
pnpm infra:down        # Stop all containers
pnpm infra:reset       # Drop volumes + restart (DESTRUCTIVE)
pnpm db:generate       # Regenerate Prisma client
pnpm db:migrate        # Run pending migrations
pnpm db:seed           # Seed database with sample data
pnpm db:studio         # Open Prisma Studio GUI
```

## Port Map

| Service | Port | Notes |
|---------|------|-------|
| API | 3000 | NestJS REST API |
| Admin | 3001 | Next.js admin CMS |
| Web | 3002 | Next.js viewer app |
| Metro | 8081 | Expo dev server |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Queue + cache |
| MinIO API | 9000 | S3-compatible storage |
| MinIO Console | 9001 | Web UI |
| ClickHouse HTTP | 8123 | Analytics |
| ClickHouse Native | 9009 | Remapped from 9000 |
| AI Curator | 8000 | Python FastAPI |

## MinIO Bucket Policy

- Bucket: `NETFLAT-media`
- Public read: `hls/`, `posters/`, `thumbnails/`, `subtitles/`
- Private: `originals/` (uploaded MP4s)

## Troubleshooting

- `EPERM` on `prisma generate` â†’ Stop dev server first (releases DLL lock)
- Docker connection error â†’ Ensure Docker Desktop is running
- Port conflict on 9000 â†’ ClickHouse remapped to 9009 to avoid MinIO conflict
