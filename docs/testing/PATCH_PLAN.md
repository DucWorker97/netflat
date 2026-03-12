# Patch Plan: Fix Parallel Playback + Upload Issues

> **Date**: 2026-01-17  
> **Target**: Web + Mobile xem song song + Admin upload OK

---

## 1. Summary - Root Causes (Cháº¯c cháº¯n: HIGH)

| # | Root Cause | Äá»™ cháº¯c cháº¯n |
|---|------------|--------------|
| 1 | **ENV Mismatch**: `.env` cĂ³ `DEV_PUBLIC_HOST=localhost` nhÆ°ng `S3_PUBLIC_BASE_URL`, `S3_PRESIGN_BASE_URL` vĂ  `EXPO_PUBLIC_*` hardcode `10.0.2.2`. Web browser khĂ´ng resolve Ä‘Æ°á»£c `10.0.2.2` â†’ khĂ´ng phĂ¡t video, khĂ´ng upload Ä‘Æ°á»£c. | **HIGH** |
| 2 | **KhĂ´ng dynamic derive**: CĂ¡c URL cĂ´ng khai khĂ´ng Ä‘Æ°á»£c tá»± Ä‘á»™ng sinh tá»« `DEV_PUBLIC_HOST`, pháº£i sá»­a thá»§ cĂ´ng nhiá»u chá»—. | **HIGH** |
| 3 | **MinIO CORS cĂ³ thá»ƒ thiáº¿u**: Náº¿u bucket chÆ°a config CORS cho `localhost:3001` (Admin origin), presigned PUT sáº½ fail vá»›i CORS error. | **MEDIUM** |

**Káº¿t luáº­n**: Sá»­a `.env` Ä‘á»ƒ thá»‘ng nháº¥t host giá»¯a cĂ¡c biáº¿n lĂ  fix chĂ­nh. Táº¡o 3 profile env Ä‘á»ƒ dá»… switch.

---

## 2. Patch Files Created

| File | Má»¥c Ä‘Ă­ch |
|------|----------|
| `.env.web.local` | Web-only dev - táº¥t cáº£ `localhost` |
| `.env.mobile.emu` | Android Emulator-only - táº¥t cáº£ `10.0.2.2` |
| `.env.lan.local` | **Web + Mobile song song** - dĂ¹ng IP LAN |
| `minio-cors.xml` | CORS config cho MinIO bucket |

---

## 3. CĂ¡ch sá»­ dá»¥ng

### Option A: Web-only (nhanh nháº¥t)
```powershell
# Copy profile vĂ o .env
Copy-Item .env.web.local .env -Force

# Restart services
# Ctrl+C Ä‘á»ƒ dá»«ng dev:core hiá»‡n táº¡i, sau Ä‘Ă³:
pnpm dev:core
```

### Option B: Mobile Emulator-only
```powershell
Copy-Item .env.mobile.emu .env -Force
pnpm dev:core
```

### Option C: Web + Mobile Song Song (RECOMMENDED)
```powershell
# 1. TĂ¬m IP LAN cá»§a mĂ¡y
ipconfig | findstr "IPv4"
# Output: IPv4 Address. . . . . . . . : 192.168.1.23

# 2. Sá»­a .env.lan.local: thay 192.168.1.100 báº±ng IP thá»±c
# Má»Ÿ file vĂ  find-replace: 192.168.1.100 -> 192.168.1.23

# 3. Copy vĂ o .env
Copy-Item .env.lan.local .env -Force

# 4. Restart services
pnpm dev:core
```

---

## 4. MinIO CORS Setup

```powershell
# 1. Ensure mc (MinIO Client) is available
# If not installed: https://min.io/docs/minio/linux/reference/minio-mc.html

# 2. Set alias (náº¿u chÆ°a cĂ³)
mc alias set local http://localhost:9000 minioadmin minioadmin

# 3. Apply CORS config (Choose ONE)

# Option A: LAN Development (Strict - Recommended)
# Edit minio-cors.lan.xml to include your LAN IP first!
mc cors set local/NETFLAT-media ./minio-cors.lan.xml

# Option B: Open Dev (Wildcard - Lazy/Fast)
mc cors set local/NETFLAT-media ./minio-cors.dev-open.xml

# 4. Verify
mc cors get local/NETFLAT-media
```

**Reference**: [MinIO mc cors documentation](https://min.io/docs/minio/linux/reference/minio-mc/mc-cors.html)

---

## 5. Verification Checklist

### After switching to `.env.web.local`:
| # | Test | Command | Expected |
|---|------|---------|----------|
| 1 | API health | `curl http://localhost:3000/health` | `{"status":"ok"}` |
| 2 | Master playlist | `curl -I http://localhost:9000/NETFLAT-media/hls/{movieId}/master.m3u8` | HTTP 200 |
| 3 | Segment | `curl -I http://localhost:9000/NETFLAT-media/hls/{movieId}/v0/seg_000.ts` | HTTP 200 |
| 4 | Web playback | Má»Ÿ `http://localhost:3002/movies/{id}` â†’ Play | Video plays |
| 5 | Admin upload | Admin â†’ Create movie â†’ Upload â†’ Network tab | PUT 200, no CORS error |

### After switching to `.env.lan.local`:
| # | Test | Command | Expected |
|---|------|---------|----------|
| 1 | Web playback | Má»Ÿ `http://192.168.1.x:3002/movies/{id}` â†’ Play | Video plays |
| 2 | Mobile playback | Open app on emulator/device â†’ Play movie | Video plays |
| 3 | Parallel | Báº­t cáº£ Web vĂ  Mobile cĂ¹ng lĂºc | Cáº£ 2 Ä‘á»u play OK |

---

## 6. Quick Curl Tests

```powershell
# Variables (thay báº±ng giĂ¡ trá»‹ thá»±c)
$MOVIE_ID = "your-movie-uuid"
$HOST = "localhost"  # hoáº·c IP LAN

# Test master.m3u8
curl -v "http://${HOST}:9000/NETFLAT-media/hls/${MOVIE_ID}/master.m3u8"

# Test segment (thay v0/seg_000.ts náº¿u tĂªn khĂ¡c)
curl -v "http://${HOST}:9000/NETFLAT-media/hls/${MOVIE_ID}/v0/seg_000.ts"

# Test API stream endpoint (cáº§n token)
curl -v "http://${HOST}:3000/api/movies/${MOVIE_ID}/stream" `
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 7. Troubleshooting

| Triá»‡u chá»©ng | NguyĂªn nhĂ¢n | Fix |
|-------------|-------------|-----|
| Web: "Failed to load resource" | `playbackUrl` chá»©a `10.0.2.2` | Copy `.env.web.local` vĂ o `.env`, restart |
| Mobile: "Network request failed" | `EXPO_PUBLIC_*` sai IP | Copy Ä‘Ăºng profile, rebuild Expo |
| Admin upload: CORS error | MinIO chÆ°a cĂ³ CORS | Apply `minio-cors.xml` |
| Cáº£ 2 khĂ´ng xem Ä‘Æ°á»£c | IP LAN sai hoáº·c firewall | Check `ipconfig`, táº¯t firewall táº¡m |

---

## 8. Files Modified/Created

| Path | Action |
|------|--------|
| `.env.web.local` | **NEW** - Web-only profile |
| `.env.mobile.emu` | **NEW** - Emulator-only profile |
| `.env.lan.local` | **NEW** - Parallel dev profile |
| `minio-cors.xml` | **NEW** - CORS config |
| `.env` | **MODIFY** - Copy from profile |
