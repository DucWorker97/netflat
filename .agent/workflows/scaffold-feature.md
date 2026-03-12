---
name: workflow-scaffold-feature
description: Scaffold a new NETFLAT feature (NestJS + Prisma + OpenAPI + shared types).
trigger: manual
---

## ---
description: Scaffold a new NETFLAT feature (NestJS module + Prisma + OpenAPI + shared types)
## ---

# /scaffold-feature Ă¢â‚¬â€ NETFLAT

## Preconditions
- Repo Ă„â€˜Ä‚Â£ scaffold theo Prompt 3 (monorepo pnpm+turbo), API lÄ‚Â  NestJS+Prisma.
- CÄ‚Â³ sĂ¡ÂºÂµn: PRD.md, ARCHITECTURE.md, DATABASE_SCHEMA.md, OPENAPI.yaml.
- Agent phĂ¡ÂºÂ£i tuÄ‚Â¢n theo workspace rules NETFLAT.

## Inputs (read from the user's message)
- featureName: vÄ‚Â­ dĂ¡Â»Â¥ "favorites", "watch-history", "genres", "upload", "auth", "recommendations"
- entityName (optional): tÄ‚Âªn entity chÄ‚Â­nh (Movie, Genre, Favorite...)
- adminOnly (optional): true/false
If user did NOT provide featureName, ASK ONCE: Ă¢â‚¬Å“BĂ¡ÂºÂ¡n muĂ¡Â»â€˜n scaffold feature nÄ‚Â o? (vÄ‚Â­ dĂ¡Â»Â¥: favorites / history / upload)Ă¢â‚¬Â.

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
- Add validation decorators (class-validator) or zod Ă¢â‚¬â€ use the projectĂ¢â‚¬â„¢s existing choice.
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
- Add examples (1Ă¢â‚¬â€œ2 per endpoint).
- Ensure security (BearerAuth) is set correctly.

## ---

## 6) Update packages/shared
- Add/update types for:
  - Entity models: e.g., Favorite, WatchHistory, UploadTicket, StreamTicket
  - Generic response wrappers: ApiResponse<T>, ErrorResponse
- Export from `packages/shared/src/index.ts`.

## ---

## 7) Add minimal tests (choose the simplest that exists in repo)
- If repo has e2e test setup: add 1Ă¢â‚¬â€œ2 e2e tests for happy path.
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
