# Netflat

> Updated: 2026-03-14
> Scope: Current Netflat implementation

Netflat is a web movie streaming platform built in a pnpm monorepo.

## Active Applications

- `apps/api`: NestJS API
- `apps/web`: Viewer Web app (Next.js)
- `apps/admin`: Admin CMS (Next.js)

## Local Infrastructure

- PostgreSQL: `5433`
- Redis: `6380`
- MinIO API: `9002`
- MinIO Console: `9003`

## Quick Start

```powershell
pnpm install
pnpm infra:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev:core
```

## Main Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev:core` | Start API + Admin + Web |
| `pnpm dev:web` | Copy `.env.web.local` then start core |
| `pnpm infra:up` | Start infrastructure |
| `pnpm infra:down` | Stop infrastructure |
| `pnpm db:migrate:deploy` | Apply migrations |
| `pnpm db:seed` | Seed sample data |
| `pnpm verify` | Lint + typecheck + build |

## Environment

Use `.env.web.local` as local profile.

Important variables:

- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`
- `S3_PRESIGN_BASE_URL`
- `S3_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`



