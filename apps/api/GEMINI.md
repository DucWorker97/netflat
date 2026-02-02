# apps/api – NestJS API Context

## Architecture
- **Framework**: NestJS with modular architecture
- **ORM**: Prisma with PostgreSQL
- **Auth**: JWT (access + refresh tokens)
- **Queue**: BullMQ producer for encode jobs

## Module Structure
```
src/
├── auth/          # Login, register, refresh, JWT guards
├── movies/        # CRUD, search, stream URL, upload-complete
├── genres/        # Genre listing
├── favorites/     # User favorites (My List)
├── watch-history/ # Progress tracking, continue watching
├── upload/        # Presigned URL generation
├── encode/        # BullMQ job producer, encode callback
├── common/        # Guards, filters, interceptors, decorators
└── prisma/        # PrismaService
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
pnpm --filter @netflop/api prisma migrate dev --name migration_name
pnpm --filter @netflop/api prisma generate
```
Update `DATABASE_SCHEMA.md` after schema changes.

## Key Endpoints
- `POST /api/auth/login` - JWT authentication
- `GET /api/movies` - List (pagination, filter by genre)
- `GET /api/movies/:id/stream` - Get signed playback URL
- `POST /api/movies/:id/upload-complete` - Trigger encode job (alias deprecated: `/api/upload/complete/:movieId`)
