---
name: workflow-scaffold-feature
description: Scaffold a new Netflop feature (NestJS + Prisma + OpenAPI + shared types).
trigger: manual
---

## ---
description: Scaffold a new netflop feature (NestJS module + Prisma + OpenAPI + shared types)
## ---

# /scaffold-feature â€” Netflop

## Preconditions
- Repo Ä‘Ă£ scaffold theo Prompt 3 (monorepo pnpm+turbo), API lĂ  NestJS+Prisma.
- CĂ³ sáºµn: PRD.md, ARCHITECTURE.md, DATABASE_SCHEMA.md, OPENAPI.yaml.
- Agent pháº£i tuĂ¢n theo workspace rules netflop.

## Inputs (read from the user's message)
- featureName: vĂ­ dá»¥ "favorites", "watch-history", "genres", "upload", "auth", "recommendations"
- entityName (optional): tĂªn entity chĂ­nh (Movie, Genre, Favorite...)
- adminOnly (optional): true/false
If user did NOT provide featureName, ASK ONCE: â€œBáº¡n muá»‘n scaffold feature nĂ o? (vĂ­ dá»¥: favorites / history / upload)â€.

## 0) Plan (short)
1. Identify required endpoints + DB changes for this feature (from PRD/OpenAPI/DB schema).
2. Create NestJS module structure (controller/service/dto).
3. Update Prisma schema + migration if needed.
4. Update OPENAPI.yaml.
5. Update packages/shared types (ApiResponse/ErrorResponse + feature models).
6. Add minimal tests + run verify commands.

## ---

## 1) Locate existing patterns
- Inspect `apps/api/src` structure and existing modules (if any).
- Follow current folder conventions; if none, create:
  - `apps/api/src/modules/<featureName>/`
  - `controller.ts`, `service.ts`, `dto/`, `index.ts`, `module.ts`

## ---

## 2) Create NestJS module skeleton
Create files (names adjust to your repo convention):

- `apps/api/src/modules/<featureName>/<featureName>.module.ts`
- `apps/api/src/modules/<featureName>/<featureName>.controller.ts`
- `apps/api/src/modules/<featureName>/<featureName>.service.ts`
- `apps/api/src/modules/<featureName>/dto/`:
  - `create-*.dto.ts` (if POST)
  - `update-*.dto.ts` (if PUT/PATCH)
  - `query-*.dto.ts` (if list/search)
- Add validation decorators (class-validator) or zod â€” use the projectâ€™s existing choice.
- Add guards if adminOnly=true (RBAC/roles guard).

Also:
- Register the module in `apps/api/src/app.module.ts` (or module registry used by repo).
- Ensure controller base path matches OPENAPI (prefix `/api` is handled globally).

## ---

## 3) Prisma + DB migration (only if the feature needs persistence)
- Update `apps/api/prisma/schema.prisma`:
  - Add/modify models according to DATABASE_SCHEMA.md.
  - Add indexes/uniques matching DB doc.
- Generate + migrate:
  
// turbo
pnpm db:generate

// turbo
pnpm db:migrate

- If seed data needed (e.g., default genres), update seed script and rerun:

// turbo
pnpm db:seed

## ---

## 4) Implement minimal endpoints (stub first, then real)
- Implement controllers/services to satisfy the OpenAPI contract:
  - Return `{ data: ... }` on success
  - Return `{ error: { code, message, details?, requestId } }` on error
- Add basic error handling:
  - 401/403 for auth/role issues
  - 404 when resource missing
  - 409 for conflicts (e.g., duplicate favorite)
  - 422 for validation

## ---

## 5) Update OPENAPI.yaml
- Add new paths under relevant tag.
- Add/extend schemas for request/response.
- Add examples (1â€“2 per endpoint).
- Ensure security (BearerAuth) is set correctly.

## ---

## 6) Update packages/shared
- Add/update types for:
  - Entity models: e.g., Favorite, WatchHistory, UploadTicket, StreamTicket
  - Generic response wrappers: ApiResponse<T>, ErrorResponse
- Export from `packages/shared/src/index.ts`.

## ---

## 7) Add minimal tests (choose the simplest that exists in repo)
- If repo has e2e test setup: add 1â€“2 e2e tests for happy path.
- Otherwise add unit tests for service (mock Prisma).

## ---

## 8) Verify (must pass)
  
// turbo
pnpm lint

// turbo
pnpm typecheck

// turbo
pnpm build

Optional smoke:
- Start api and curl health + 1 endpoint sample.
