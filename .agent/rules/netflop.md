---
name: NETFLAT
description: NETFLAT workspace rules and pipeline invariants.
trigger: always_on
---

## Description
Workspace rules for NETFLAT (Netflix mini graduation project).

# NETFLAT Ă¢â‚¬â€ Workspace Rules (Always Follow)

## Source of Truth
- PRD.md
- ARCHITECTURE.md
- DATABASE_SCHEMA.md
- OPENAPI.yaml
Priority when conflict: PRD > Architecture > OpenAPI > Code.

## Fixed Stack (do not change unless asked)
- pnpm + Turborepo
- NestJS + Prisma + PostgreSQL
- BullMQ + Redis
- MinIO (S3-compatible) for dev
- Next.js (admin + web)
- Expo React Native (mobile)
- Node.js worker (FFmpeg/HLS)

## Delivery Rhythm
Plan Ă¢â€ â€™ Implement Ă¢â€ â€™ Verify (commands) Ă¢â€ â€™ Summarize changes.
Before large edits: list files to change.

## Minimal DoD
- pnpm lint
- pnpm typecheck
- pnpm dev (API + Admin + Worker + Mobile dev server minimal)
- No secrets committed; update .env.example when adding env
- Update README when scripts/ports/runbook change

## Video Pipeline Invariants (Upload/Encode/Playback)
- Canonical endpoints must match OPENAPI.yaml; keep docs Ă¢â€ â€ OpenAPI Ă¢â€ â€ code Ă¢â€ â€ smoke in sync.
- Presigned upload must document required headers (esp. Content-Type) + TTL; mask signatures in logs.
- HLS playback must ensure master Ă¢â€ â€™ variant Ă¢â€ â€™ segments are accessible:
  choose ONE: public HLS prefix (dev/staging) OR playlist rewrite with signed URLs OR API proxy.
- Any pipeline change must run: pnpm -w verify, pnpm -w smoke, and (manual minimum) pnpm -w smoke:video.
- Object-level authorization required for any endpoint taking an objectId (BOLA guardrails).

## Contract Sync Checklist
- Update PRD/ARCHITECTURE/OPENAPI first, then code + tests, then smoke workflows/scripts.
- Keep canonical + deprecated alias paths explicit in docs and OpenAPI.
- Update client callers (admin/web/mobile) to the canonical route.
- Re-run smoke:video and include playbackUrl + segment 200 proof in reports.
