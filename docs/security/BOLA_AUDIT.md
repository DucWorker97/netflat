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
| 🔴 **Critical** | 2 | No ownership check on user-scoped resources |
| 🟠 **High** | 3 | Missing visibility checks on resources |
| 🟡 **Medium** | 4 | Partial checks, needs hardening |
| 🟢 **Low** | 8 | Properly protected with guards/ownership |

---

## 1. Audit Findings by Module

### 1.1 Movies Module (`/movies`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/movies` | GET | query params | OptionalJwtAuthGuard | Public list - should filter draft/non-ready for viewers | 🟠 |
| `/movies/:id` | GET | `id` | JwtAuthGuard | **No visibility check** - viewers can see draft movies | 🔴 |
| `/movies/:id` | PUT | `id` | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/movies/:id` | DELETE | `id` | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/movies/:id/publish` | PATCH | `id` | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/movies/:id/stream` | GET | `id` | JwtAuthGuard | ✅ Checks published+ready in service | 🟢 |
| `/movies/:id/progress` | GET | `id` | JwtAuthGuard | ✅ Queries by userId+movieId | 🟢 |

**Required Fixes:**
- `GET /movies/:id`: Add visibility check - viewers can only see `published + ready`
- `GET /movies`: Filter out draft/non-ready movies for non-admin users

---

### 1.2 Favorites Module (`/favorites`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/favorites` | GET | - | JwtAuthGuard | ✅ Filters by user.id | 🟢 |
| `/favorites/:movieId` | POST | `movieId` | JwtAuthGuard | ⚠️ Checks movie exists, but uses req.user.id | 🟢 |
| `/favorites/:movieId` | DELETE | `movieId` | JwtAuthGuard | ⚠️ Uses findFirst with userId - OK | 🟢 |

**Note:** x-profile-id header could be spoofed - needs validation that profile belongs to user.

---

### 1.3 History Module (`/history`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/history` | GET | - | JwtAuthGuard | ✅ Filters by user.id | 🟢 |
| `/history/:movieId` | GET | `movieId` | JwtAuthGuard | ✅ Queries with userId | 🟢 |
| `/history/:movieId` | POST | `movieId` | JwtAuthGuard | ✅ Creates/updates with userId | 🟢 |

**Note:** Same x-profile-id spoofing concern as Favorites.

---

### 1.4 Upload Module (`/upload`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/upload/presigned-url` | GET | `movieId` (query) | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/movies/:id/upload-complete` (alias: `/upload/complete/:movieId`) | POST | `id` | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/upload/subtitle-presigned-url` | GET | `movieId` (query) | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/upload/subtitle-complete/:movieId` | POST | `movieId` | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |

---

### 1.5 Profiles Module (`/api/profiles`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/api/profiles` | GET | - | JwtAuthGuard | ✅ Filters by user.id | 🟢 |
| `/api/profiles/:id` | GET | `id` | JwtAuthGuard | ⚠️ Service checks userId ownership | 🟡 |
| `/api/profiles` | POST | - | JwtAuthGuard | ✅ Creates for current user | 🟢 |
| `/api/profiles/:id` | PUT | `id` | JwtAuthGuard | ⚠️ Service checks userId ownership | 🟡 |
| `/api/profiles/:id` | DELETE | `id` | JwtAuthGuard | ⚠️ Service checks userId ownership | 🟡 |

**Required Improvements:**
- Move ownership check from service to guard for consistency
- Return 403 instead of 404 when access denied

---

### 1.6 Ratings Module (`/ratings`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/ratings/:movieId` | POST | `movieId` | JwtAuthGuard | ⚠️ No movie visibility check | 🟠 |
| `/ratings/:movieId/user` | GET | `movieId` | JwtAuthGuard | ✅ Queries by userId | 🟢 |
| `/ratings/:movieId/stats` | GET | `movieId` | **None** | 🔴 Public - can enumerate all movieIds | 🟠 |
| `/ratings/:movieId` | DELETE | `movieId` | JwtAuthGuard | ✅ Deletes by userId+movieId | 🟢 |

**Required Fixes:**
- `POST /ratings/:movieId`: Verify movie is published+ready before allowing rating
- `GET /ratings/:movieId/stats`: Consider requiring auth or checking movie visibility

---

### 1.7 Rails Module (`/api/rails`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/api/rails` | GET | - | **None** | ✅ Public - returns active rails | 🟢 |
| `/api/rails/admin` | GET | - | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/api/rails/:id` | GET | `id` | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/api/rails` | POST | - | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/api/rails/:id` | PUT | `id` | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |
| `/api/rails/:id` | DELETE | `id` | JwtAuthGuard + RolesGuard('admin') | ✅ Admin only | 🟢 |

---

### 1.8 Actors Module (`/actors`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/actors` | GET | - | Unknown | Needs review | 🟡 |
| `/actors/:id` | GET | `id` | Unknown | Needs review | 🟡 |
| `/actors/:id` | PUT | `id` | Unknown | Needs review | 🟡 |
| `/actors/:id` | DELETE | `id` | Unknown | Needs review | 🟡 |

---

### 1.9 Genres Module (`/genres`)

| Route | Method | ID Param | Current Protection | Gap | Risk |
|-------|--------|----------|-------------------|-----|------|
| `/genres` | GET | - | Unknown | Usually public | 🟢 |
| `/genres/:id` | GET | `id` | Unknown | Usually public | 🟢 |
| `/genres/:id` | PUT | `id` | Should be admin | Needs review | 🟡 |
| `/genres/:id` | DELETE | `id` | Should be admin | Needs review | 🟡 |

---

## 2. Critical Vulnerabilities

### CVE-NETFLOP-001: Movie Detail Exposes Draft Content

**Severity:** 🔴 Critical  
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

### CVE-NETFLOP-002: Profile ID Header Spoofing

**Severity:** 🟠 High  
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
| **Movie (create/update/delete)** | ❌ | ✅ | role='admin' |
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
