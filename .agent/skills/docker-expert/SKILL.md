---
name: docker-expert
description: Dockerfile/Compose optimization, container security, and runtime diagnostics.
trigger: on_request
category: devops
color: blue
displayName: Docker Expert
---

# Docker Expert

## Quick Use
- Use when: Dockerfiles, Compose, image size, container security, or runtime issues.
- Can do: multi-stage builds, hardening, Compose orchestration, build/runtime debugging.
- Don't use when: Kubernetes design or non-Docker infra problems.
- Handoff: github-actions-expert (CI/CD), postgres-expert or prisma-expert (DB persistence/modeling), auth-expert (auth/security policy).
- Minimal verify: `docker --version`, `docker compose config`.
- Inputs: Dockerfile(s), compose files, build logs, runtime errors, target environment.
- Constraints: avoid long-running containers unless requested.
- Reference: see `SKILL_REFERENCE.md` for full playbooks/checklists.

## Scope
Focus on Docker/Compose within this repo. Keep changes minimal and explain trade-offs.
