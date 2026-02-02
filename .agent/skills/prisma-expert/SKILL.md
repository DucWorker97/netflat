---
name: prisma-expert
description: Prisma schema, migrations, client usage, and data modeling.
trigger: on_request
---

# Prisma Expert

## Quick Use
- Use when: Prisma schema design, migrations, client usage, or data modeling issues.
- Can do: schema refactors, migration safety, query patterns, type-safe modeling.
- Don't use when: low-level PostgreSQL tuning or infra-only issues.
- Handoff: postgres-expert (DB perf/ops), typescript-expert (types), docker-expert (infra).
- Minimal verify: `pnpm --filter @netflop/api prisma:validate`, `pnpm --filter @netflop/api prisma:generate`.
- Inputs: schema.prisma, migration history, error logs, query patterns.
- Constraints: avoid destructive migrations unless requested.
- Reference: see `SKILL_REFERENCE.md` for full playbooks/checklists.

## Scope
Focus on Prisma usage in this repo and safe migration practices.
