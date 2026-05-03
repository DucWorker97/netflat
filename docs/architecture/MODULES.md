# API Module Map

Updated: 2026-03-14

This document reflects modules imported by apps/api/src/app.module.ts and active controllers in apps/api/src/**/\*.controller.ts.

## 1. Core Modules

- app module: composition root
- config module: env loading and validation
- prisma module: database service
- common module: decorators, guards, filters, middleware
- mail module: email service wiring

## 2. Feature Modules

- auth
- users
- genres
- movies
- favorites
- upload
- admin
- ratings
- actors
- history
- encode
- health (controller)

## 3. Controller Route Summary

Global prefix is /api, except /health.

- /api/auth
  - POST /register
  - POST /login
  - POST /refresh
  - POST /logout
  - POST /forgot-password
  - POST /reset-password
  - GET /me

- /api/users
  - GET /profile
  - PUT /profile
  - POST /change-password
  - PATCH /:id/disable
  - PATCH /:id/enable

- /api/movies
  - GET /
  - POST /
  - GET /:id
  - PUT /:id
  - DELETE /:id
  - PATCH /:id/publish
  - POST /:id/upload-complete
  - GET /:id/stream
  - GET /:id/progress

- /api/upload
  - GET /presigned-url
  - POST /complete/:movieId

- /api/favorites
  - GET /
  - POST /:movieId
  - DELETE /:movieId

- /api/history
  - GET /
  - GET /continue-watching
  - POST /:movieId
  - DELETE /:movieId

- /api/ratings
  - POST /:movieId
  - GET /:movieId/user
  - GET /:movieId/stats
  - GET /:movieId/list
  - DELETE /:movieId

- /api/actors
  - GET /suggest

- /api/genres
  - GET /
  - GET /:id
  - POST /
  - PUT /:id
  - DELETE /:id

- /api/admin
  - GET /diagnostics
  - GET /users
  - POST /users
  - PATCH /users/:userId
  - DELETE /users/:userId

- /health
  - GET /

## 4. Web App Route Surfaces

Viewer app pages (apps/web/src/app):

- /
- /browse
- /movies
- /movies/[id]
- /genre/[id]
- /search
- /favorites
- /history
- /profile
- /login
- /forgot-password
- /reset-password

Admin app pages (apps/admin/src/app):

- / (redirect entry)
- /[locale]/login
- /[locale]/(dashboard)
- /[locale]/(dashboard)/movies
- /[locale]/(dashboard)/movies/new
- /[locale]/(dashboard)/movies/[id]
- /[locale]/(dashboard)/movies/[id]/media
- /[locale]/(dashboard)/movies/[id]/upload
- /[locale]/(dashboard)/genres
- /[locale]/(dashboard)/users
