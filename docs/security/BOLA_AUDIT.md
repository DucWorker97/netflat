# BOLA Security Audit Report

> **OWASP API1:2023 - Broken Object Level Authorization**  
> **Audit Date:** 2026-01-15  
> **Scope:** `apps/api` - NestJS REST API

---

## Executive Summary

This audit identifies all endpoints that accept object IDs from client input and assesses their authorization enforcement. BOLA vulnerabilities allow attackers to access or manipulate resources by tampering with IDs.

### Risk Matrix

| Risk Level | Count | Description |
|------------|-------|-------------|
| đŸ”´ **Critical** | 2 | No ownership check on user-scoped resources |
| đŸŸ  **High** | 3 | Missing visibility checks on resources |
| đŸŸ¡ **Medium** | 4 | Partial checks, needs hardening |
| đŸŸ¢ **Low** | 8 | Properly protected with guards/ownership |

---

## 1. Audit Findings by Module

### 1.1 Movies Module (`/movies`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/movies` | GET | query params | OptionalJwtAuthGuard | Public list - should filter draft/non-ready for viewers | đŸŸ  |
| `/movies/:id` | GET | `id` | JwtAuthGuard | **No visibility check** - viewers can see draft movies | đŸ”´ |
| `/movies/:id` | PUT | `id` | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/movies/:id` | DELETE | `id` | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/movies/:id/publish` | PATCH | `id` | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/movies/:id/stream` | GET | `id` | JwtAuthGuard | âœ… Checks published+ready in service | đŸŸ¢ |
| `/movies/:id/progress` | GET | `id` | JwtAuthGuard | âœ… Queries by userId+movieId | đŸŸ¢ |

**Required Fixes:**
- `GET /movies/:id`: Add visibility check - viewers can only see `published + ready`
- `GET /movies`: Filter out draft/non-ready movies for non-admin users

---

### 1.2 Favorites Module (`/favorites`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/favorites` | GET | - | JwtAuthGuard | âœ… Filters by user.id | đŸŸ¢ |
| `/favorites/:movieId` | POST | `movieId` | JwtAuthGuard | â ï¸ Checks movie exists, but uses req.user.id | đŸŸ¢ |
| `/favorites/:movieId` | DELETE | `movieId` | JwtAuthGuard | â ï¸ Uses findFirst with userId - OK | đŸŸ¢ |

**Note:** x-profile-id header could be spoofed - needs validation that profile belongs to user.

---

### 1.3 History Module (`/history`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/history` | GET | - | JwtAuthGuard | âœ… Filters by user.id | đŸŸ¢ |
| `/history/:movieId` | GET | `movieId` | JwtAuthGuard | âœ… Queries with userId | đŸŸ¢ |
| `/history/:movieId` | POST | `movieId` | JwtAuthGuard | âœ… Creates/updates with userId | đŸŸ¢ |

**Note:** Same x-profile-id spoofing concern as Favorites.

---

### 1.4 Upload Module (`/upload`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/upload/presigned-url` | GET | `movieId` (query) | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/movies/:id/upload-complete` (alias: `/upload/complete/:movieId`) | POST | `id` | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/upload/subtitle-presigned-url` | GET | `movieId` (query) | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/upload/subtitle-complete/:movieId` | POST | `movieId` | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |

---

### 1.5 Profiles Module (`/api/profiles`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/api/profiles` | GET | - | JwtAuthGuard | âœ… Filters by user.id | đŸŸ¢ |
| `/api/profiles/:id` | GET | `id` | JwtAuthGuard | â ï¸ Service checks userId ownership | đŸŸ¡ |
| `/api/profiles` | POST | - | JwtAuthGuard | âœ… Creates for current user | đŸŸ¢ |
| `/api/profiles/:id` | PUT | `id` | JwtAuthGuard | â ï¸ Service checks userId ownership | đŸŸ¡ |
| `/api/profiles/:id` | DELETE | `id` | JwtAuthGuard | â ï¸ Service checks userId ownership | đŸŸ¡ |

**Required Improvements:**
- Move ownership check from service to guard for consistency
- Return 403 instead of 404 when access denied

---

### 1.6 Ratings Module (`/ratings`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/ratings/:movieId` | POST | `movieId` | JwtAuthGuard | â ï¸ No movie visibility check | đŸŸ  |
| `/ratings/:movieId/user` | GET | `movieId` | JwtAuthGuard | âœ… Queries by userId | đŸŸ¢ |
| `/ratings/:movieId/stats` | GET | `movieId` | **None** | đŸ”´ Public - can enumerate all movieIds | đŸŸ  |
| `/ratings/:movieId` | DELETE | `movieId` | JwtAuthGuard | âœ… Deletes by userId+movieId | đŸŸ¢ |

**Required Fixes:**
- `POST /ratings/:movieId`: Verify movie is published+ready before allowing rating
- `GET /ratings/:movieId/stats`: Consider requiring auth or checking movie visibility

---

### 1.7 Rails Module (`/api/rails`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/api/rails` | GET | - | **None** | âœ… Public - returns active rails | đŸŸ¢ |
| `/api/rails/admin` | GET | - | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/api/rails/:id` | GET | `id` | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/api/rails` | POST | - | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/api/rails/:id` | PUT | `id` | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |
| `/api/rails/:id` | DELETE | `id` | JwtAuthGuard + RolesGuard('admin') | âœ… Admin only | đŸŸ¢ |

---

### 1.8 Actors Module (`/actors`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/actors` | GET | - | Unknown | Needs review | đŸŸ¡ |
| `/actors/:id` | GET | `id` | Unknown | Needs review | đŸŸ¡ |
| `/actors/:id` | PUT | `id` | Unknown | Needs review | đŸŸ¡ |
| `/actors/:id` | DELETE | `id` | Unknown | Needs review | đŸŸ¡ |

---

### 1.9 Genres Module (`/genres`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/genres` | GET | - | Unknown | Usually public | đŸŸ¢ |
| `/genres/:id` | GET | `id` | Unknown | Usually public | đŸŸ¢ |
| `/genres/:id` | PUT | `id` | Should be admin | Needs review | đŸŸ¡ |
| `/genres/:id` | DELETE | `id` | Should be admin | Needs review | đŸŸ¡ |

---

## 2. Critical Vulnerabilities

### CVE-NETFLAT-001: Movie Detail Exposes Draft Content

**Severity:** đŸ”´ Critical  
**Endpoint:** `GET /movies/:id`  
**Issue:** Any authenticated user can view movie details by ID, including draft movies and movies with failed encoding.  
**Attack Vector:** Attacker enumerates UUIDs to discover unpublished content.

**Remediation:**
```typescript
// In movies.service.ts findById()
if (
  movie.movieStatus !== 'published' || 
  movie.encodeStatus !== 'ready'
) {
  if (user?.role !== 'admin') {
    throw new ForbiddenException('MOVIE_NOT_AVAILABLE');
  }
}
```

---

### CVE-NETFLAT-002: Profile ID Header Spoofing

**Severity:** đŸŸ  High  
**Endpoints:** All endpoints accepting `x-profile-id` header  
**Issue:** The `x-profile-id` header is trusted without validation. User A could access User B's profile data by sending B's profileId.

**Remediation:**
```typescript
// Validate profile belongs to current user
const profile = await this.prisma.profile.findFirst({
  where: { id: profileId, userId: user.id }
});
if (!profile) throw new ForbiddenException('Invalid profile');
```

---

## 3. Authorization Rules Matrix

| Resource | Viewer Access | Admin Access | Rule |
|----------|--------------|--------------|------|
| **Movie (detail)** | published + ready | All | `movieStatus='published' AND encodeStatus='ready'` |
| **Movie (stream)** | published + ready | All | Same as detail |
| **Movie (create/update/delete)** | âŒ | âœ… | role='admin' |
| **Favorites** | Own only | Own + All | `userId = req.user.id` |
| **Watch History** | Own only | Own + All | `userId = req.user.id` |
| **Profile** | Own only | Own + All | `profile.userId = req.user.id` |
| **Ratings (own)** | Own only | Own + All | `userId = req.user.id` |
| **Rails (public)** | Active only | All | `isActive = true` |

---

## 4. Implementation Plan

### Phase 1: Core Fixes (This PR)

1. **Create Policy Guard** - Centralized authorization logic
2. **Fix Movie Detail** - Add visibility check
3. **Fix Profile Header** - Validate ownership
4. **Fix Ratings** - Check movie visibility before rating
5. **Add BOLA Tests** - Regression test suite

### Phase 2: Hardening (Follow-up PR)

1. Audit all query patterns for WHERE clause consistency
2. Add request logging for authorization failures
3. Implement rate limiting on enumeration-prone endpoints

---

## 5. Test Cases Required

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | User A reads User B's favorite | 403 Forbidden |
| 2 | User A reads User B's watch history | 403 Forbidden |
| 3 | User A updates User B's profile | 403 Forbidden |
| 4 | User A deletes User B's profile | 403 Forbidden |
| 5 | Viewer reads draft movie | 403 Forbidden |
| 6 | Admin reads draft movie | 200 OK |
| 7 | Viewer streams non-ready movie | 403 Forbidden |
| 8 | Viewer rates unpublished movie | 403 Forbidden |
| 9 | User spoofs x-profile-id header | 403 Forbidden |
| 10 | Viewer calls admin endpoints | 403 Forbidden |

---

## References

- [OWASP API1:2023 - BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [OWASP ASVS V4 Access Control](https://github.com/OWASP/ASVS/blob/master/4.0/en/0x12-V4-Access-Control.md)
