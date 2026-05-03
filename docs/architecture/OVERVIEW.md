# Architecture Overview

Updated: 2026-04-01

## 1. System Composition

Netflat is a pnpm monorepo with three active runtime applications:

- API service: apps/api (NestJS + Prisma + BullMQ)
- Admin web: apps/admin (Next.js)
- Viewer web: apps/web (Next.js)

Infrastructure services are provided by Docker Compose:

- PostgreSQL (data)
- Redis (queue and cache primitives)
- MinIO (object storage for originals and HLS assets)

## 2. Local Network Topology

- API: http://localhost:3000
- Admin: http://localhost:3001
- Viewer: http://localhost:3002
- Postgres: localhost:5433
- Redis: localhost:6380
- MinIO API: http://localhost:9002
- MinIO Console: http://localhost:9003

## 3. Runtime Boundaries

- Admin app is for content and user management.
- Viewer app is for browsing and playback.
- API is the single backend for both web apps.
- Encode worker runs inside API process via BullMQ processor (encode module).

## 4. Core Tech Stack

- Monorepo: pnpm + Turborepo
- Backend: NestJS, Prisma, PostgreSQL, BullMQ, AWS SDK (S3 compatible)
- Frontend: Next.js 15, React 19, TanStack Query
- Storage/streaming: MinIO + HLS output

## 5. Security Baseline In Code

- JWT auth with access and refresh flow
- Role checks for admin routes
- Global validation pipe (whitelist + transform + forbid non-whitelisted)
- Helmet and CORS configured from environment
- Throttler module enabled at app level
