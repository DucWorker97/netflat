---
name: nestjs-expert
description: NestJS modules, DI, guards, controllers, and testing patterns.
trigger: on_request
category: framework
displayName: Nest.js Framework Expert
color: red
---

# Nest.js Expert

## Quick Use
- Use when: NestJS modules, controllers, guards, DTO validation, or DI issues.
- Can do: architecture reviews, module boundaries, auth/guard patterns, testing setup.
- Don't use when: pure TypeScript type issues or Prisma schema/migration work.
- Handoff: typescript-expert (types), prisma-expert (schema/migrate), postgres-expert (DB perf), auth-expert (auth/RBAC), vercel-react-best-practices (React/Next), docker-expert (infra).
- Minimal verify: `pnpm --filter @NETFLAT/api lint`, `pnpm --filter @NETFLAT/api typecheck`, `pnpm --filter @NETFLAT/api build`.
- Inputs: failing logs, module structure, DTOs, guard/interceptor code.
- Constraints: avoid watch/serve processes; use one-shot diagnostics.
- Reference: see `SKILL_REFERENCE.md` for full playbooks/checklists.

## Scope
Focus on NestJS in `apps/api` and related shared server code.
