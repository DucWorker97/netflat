# API Endpoints And Contracts

Updated: 2026-03-14
Primary contract file: OPENAPI.yaml

## 1. Base URLs

- Local API base: http://localhost:3000/api
- Health endpoint (no /api prefix): http://localhost:3000/health

## 2. Auth

- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- POST /auth/forgot-password
- POST /auth/reset-password
- GET /auth/me

Response shape used by web/admin login:

- data.accessToken
- data.refreshToken
- data.user

## 3. Viewer APIs

Movies:

- GET /movies
- GET /movies/:id
- GET /movies/:id/stream
- GET /movies/:id/progress

Favorites:

- GET /favorites
- POST /favorites/:movieId
- DELETE /favorites/:movieId

History:

- GET /history
- GET /history/continue-watching
- POST /history/:movieId
- DELETE /history/:movieId

Ratings:

- POST /ratings/:movieId
- GET /ratings/:movieId/user
- GET /ratings/:movieId/stats
- GET /ratings/:movieId/list
- DELETE /ratings/:movieId

Genres and actors:

- GET /genres
- GET /actors/suggest?q=keyword

## 4. Admin APIs

Movies/admin operations:

- POST /movies
- PUT /movies/:id
- DELETE /movies/:id
- PATCH /movies/:id/publish
- POST /movies/:id/upload-complete

Upload operations:

- GET /upload/presigned-url
- POST /upload/complete/:movieId

Admin management:

- GET /admin/diagnostics
- GET /admin/users
- POST /admin/users
- PATCH /admin/users/:userId
- DELETE /admin/users/:userId

User moderation:

- PATCH /users/:id/disable
- PATCH /users/:id/enable

## 5. Validation And Error Behavior

- Global validation pipe rejects unknown fields.
- Error response format is standardized through exception filter.
- Throttling is enabled globally and tightened on auth endpoints.

## 6. Recommendation For Maintenance

- Keep OPENAPI.yaml synchronized with controller changes.
- Add /health to OPENAPI if not already modeled.
