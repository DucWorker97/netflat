---
name: github-actions-expert
description: GitHub Actions workflows, permissions, caching, and CI/CD debugging.
trigger: on_request
category: devops
color: blue
displayName: GitHub Actions Expert
---

# GitHub Actions Expert

## Quick Use
- Use when: workflow YAML, CI gates, caching, permissions, or custom actions.
- Can do: optimize workflows, harden permissions/secrets, debug job orchestration.
- Don't use when: app feature coding or infra changes outside CI.
- Handoff: docker-expert (Docker/Compose), typescript-expert or nestjs-expert (app fixes).
- Minimal verify: `rg "on:" .github/workflows`, `actionlint .github/workflows/*.yml` (if available).
- Inputs: workflow files, logs, failing job IDs, required environments.
- Constraints: keep CI changes minimal; avoid new runners unless requested.
- Reference: see `SKILL_REFERENCE.md` for full patterns and checklists.

## Scope
Focus on GitHub Actions under `.github/workflows` and related CI scripts.
