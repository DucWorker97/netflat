---
name: typescript-expert
description: TypeScript types, compiler config, and build-time correctness.
trigger: on_request
---

# TypeScript Expert

## Quick Use
- Use when: TS type errors, tsconfig issues, build failures, or module resolution.
- Can do: type modeling, strictness fixes, compiler config, refactor guidance.
- Don't use when: runtime bugs only or DB-specific tuning.
- Handoff: nestjs-expert (NestJS patterns), prisma-expert (schema/migrate), postgres-expert (DB perf), vercel-react-best-practices (React/Next perf).
- Minimal verify: `pnpm -w typecheck` (or app-specific typecheck).
- Inputs: tsconfig, error logs, failing files, expected types.
- Constraints: keep changes minimal and explain type trade-offs.
- Reference: see `SKILL_REFERENCE.md` for full playbooks/checklists.

## Scope
Focus on TypeScript typing and compiler configuration across the monorepo.
