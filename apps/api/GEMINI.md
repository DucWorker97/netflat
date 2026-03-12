# apps/api â€“ NestJS API Context

## Architecture
- **Framework**: NestJS with modular architecture
- **ORM**: Prisma with PostgreSQL
- **Auth**: JWT (access + refresh tokens)
- **Queue**: BullMQ producer for encode jobs

## Module Structure
```
src/
â”œâ”€â”€ auth/          # Login, register, refresh, JWT guards
â”œâ”€â”€ movies/        # CRUD, search, stream URL, upload-complete
â”œâ”€â”€ genres/        # Genre listing
â”œâ”€â”€ favorites/     # User favorites (My List)
â”œâ”€â”€ watch-history/ # Progress tracking, continue watching
â”œâ”€â”€ upload/        # Presigned URL generation
â”œâ”€â”€ encode/        # BullMQ job producer, encode callback
â”œâ”€â”€ common/        # Guards, filters, interceptors, decorators
â””â”€â”€ prisma/        # PrismaService
```

## Conventions
1. **Controllers**: Thin, delegate to services
2. **Services**: Business logic, database access via Prisma
3. **DTOs**: Use class-validator for validation
4. **Guards**: JwtAuthGuard, RolesGuard for RBAC
5. **Error format**: `{ error: { code, message, requestId } }`

## API Changes
- **MUST** update `OPENAPI.yaml` when modifying endpoints
- **MUST** update `docs/ARCHITECTURE.md` for new modules
- **MUST** run `pnpm lint && pnpm typecheck` before commit

## Prisma Migrations
```bash
pnpm --filter @netflat/api prisma migrate dev --name migration_name
pnpm --filter @netflat/api prisma generate
```
Update `DATABASE_SCHEMA.md` after schema changes.

## Key Endpoints
- `POST /api/auth/login` - JWT authentication
- `GET /api/movies` - List (pagination, filter by genre)
- `GET /api/movies/:id/stream` - Get signed playback URL
- `POST /api/movies/:id/upload-complete` - Trigger encode job (alias deprecated: `/api/upload/complete/:movieId`)
