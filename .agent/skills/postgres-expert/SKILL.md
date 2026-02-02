---
name: postgres-expert
description: PostgreSQL query tuning, indexing, JSONB, and operational diagnostics.
trigger: on_request
---

# PostgreSQL Expert

## Quick Use
- Use when: Postgres query/perf tuning, indexing, JSONB, partitioning, or connection limits.
- Can do: EXPLAIN analysis, index strategy, vacuum/autovacuum tuning, replication guidance.
- Don't use when: Prisma schema/migrations or app-layer ORM refactors.
- Handoff: prisma-expert (schema/migrate), typescript-expert (app types), auth-expert (auth policy).
- Minimal verify: `psql -c "SELECT version();"`, `psql -c "SELECT 1;"`.
- Inputs: slow queries, EXPLAIN output, schema, indexes, config values.
- Constraints: avoid destructive DB changes unless requested.
- Reference: see `SKILL_REFERENCE.md` for full playbooks/checklists.

## Scope
Focus on PostgreSQL-specific behavior and tuning guidance.
