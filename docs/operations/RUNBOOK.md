# Local Runbook

Updated: 2026-03-14

## 1. Prerequisites

- Node.js >= 18
- pnpm 9+
- Docker Desktop running

## 2. First-Time Setup

1. pnpm install
2. pnpm infra:up
3. pnpm db:prepare:local
4. pnpm dev:core

Access:

- API health: http://localhost:3000/health
- Admin: http://localhost:3001
- Viewer: http://localhost:3002

## 3. Daily Commands

- Start infra: pnpm infra:up
- Stop infra: pnpm infra:down
- Start all apps: pnpm dev:core
- Start with web env profile: pnpm dev:web
- Managed checks: pnpm dev:runtime:doctor
- Managed start: pnpm dev:runtime:start
- Managed stop: pnpm dev:runtime:stop
- Runtime status: pnpm dev:runtime:status

## 4. Database Commands

- Generate prisma client: pnpm db:generate
- Local schema + seed: pnpm db:prepare:local
- Migrate deploy: pnpm db:migrate:deploy
- Seed only: pnpm db:seed
- Studio: pnpm db:studio

## 5. Verification Commands

- pnpm lint
- pnpm typecheck
- pnpm verify
- pnpm smoke
- pnpm smoke:video

## 6. Staging Commands

- pnpm deploy:staging
- pnpm deploy:staging:down
- pnpm deploy:staging:logs

## 7. Common Recovery

If ports 3000/3001/3002 are occupied:

1. Stop managed runtime: pnpm dev:runtime:stop
2. Check listeners and kill stray processes
3. Restart infra and apps
