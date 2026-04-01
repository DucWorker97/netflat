# Netflat Documentation Index

Updated: 2026-04-01
Source: Current repository code in this workspace

## 1. Start Here

- Architecture overview: ./architecture/OVERVIEW.md
- API module map: ./architecture/MODULES.md
- Data model: ./architecture/DATA_MODEL.md
- Database schema: ../DATABASE_SCHEMA.md
- Runtime workflows: ./architecture/WORKFLOWS.md
- Endpoint summary: ./api/ENDPOINTS.md
- Local runbook: ./operations/RUNBOOK.md
- Environment guide: ./operations/ENVIRONMENT.md
- Debug checklist: ./debug/DEBUG_CHECKLIST.md
- Changelog / Updates: ./CHANGELOG.md
- Session recorder guide: ./debug/SESSION_RECORDER.md

## 2. Active Applications

- apps/api: NestJS API (port 3000)
- apps/admin: Next.js admin app (port 3001)
- apps/web: Next.js viewer app (port 3002)

## 3. Infrastructure

- PostgreSQL: localhost:5433
- Redis: localhost:6380
- MinIO API: localhost:9002
- MinIO Console: localhost:9003

## 4. Source Of Truth Order

1. Code under apps/
2. OPENAPI.yaml
3. Root scripts in package.json and scripts/
4. These docs

## 5. Notes

- This docs set is generated to match current code behavior.
- Keep docs updated when routes, env vars, or runtime scripts change.
