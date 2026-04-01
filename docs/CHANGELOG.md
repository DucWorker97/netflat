# Changelog / Updates

## [2026-04-01] - API & Database Synchronization

### Added & Updated
- Updated documentation indices and file structures up to the current state.
- Cleaned up obsolete markdown files under `/docs`.
- Included the complete `DATABASE_SCHEMA.md` into the root directory for cross-reference.

### Fixed
- **API Controllers & Services Sync**: Resolved 32 TypeScript compilation errors across various API modules by aligning Controller method calls with their actual Service implementations.
  - **Admin**: Updated `AdminController` to correctly map to `AdminService.getUsers(page, limit)` and `toggleUserStatus(id, enable)`. Removed disconnected CRUD operations.
  - **Favorites**: Standardized methods on `FavoritesController` and `FavoritesService` (`getFavorites`, `addFavorite`, `removeFavorite`).
  - **History**: Ensured `HistoryController` executes the updated names on `HistoryService` (`getHistory`, `getContinueWatching`, `upsertProgress`, `removeHistory`).
  - **Ratings**: Fixed logic mismatch in `RatingsController` connecting to `RatingsService` (`createOrUpdate`, `getRating`, `getStats`, `getMovieRatings`).
  - **Users**: Fixed disabled/enabled status functions on `UsersController` linking to `toggleUserStatus`.
- **Prisma Schema Mapping**:
  - Addressed invalid `score` field reference in `RatingsService` by adopting the correct database field `rating`.
  - Removed code referencing non-existent properties on `Genre` model (like `description` and `createdAt`), reflecting the core database structure (`id`, `name`, `slug`).

### Security & Internal
- Consolidated roles and policy guard structures for internal API endpoints (`@netflat/api`).
- Improved admin, user, favorites, and history data pipelines by leveraging proper Prisma models.
