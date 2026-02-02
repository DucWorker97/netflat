---
name: workflow-bootstrap
description: First-time local setup for Netflop (deps, infra, migrate/seed).
trigger: manual
---

## ---
description: First-time local setup for netflop (install deps, start infra, migrate/seed DB)
## ---

1. Install dependencies
   pnpm i

// turbo
2. Start infra (Postgres/Redis/MinIO)
   docker compose up -d

// turbo
3. Generate Prisma client
   pnpm db:generate

// turbo
4. Run database migrations
   pnpm db:migrate

// turbo
5. Seed initial data (admin user + genres)
   pnpm db:seed

6. Smoke check API health
   curl -s http://localhost:3000/health || echo "API not running yet (start with /dev)"
