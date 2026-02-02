---
name: workflow-video-pipeline-smoke
description: End-to-end smoke test for upload -> encode HLS -> playback.
trigger: manual
---

## ---
description: End-to-end smoke test for upload -> encode HLS -> playback (netflop)
## ---

# /video-pipeline-smoke â€” Netflop

## Preconditions
Assumes these endpoints exist (per OPENAPI.yaml):
- POST /api/auth/login
- POST /api/movies (admin)
- GET  /api/upload/presigned-url (admin)
- POST /api/movies/{id}/upload-complete (admin)
- GET  /api/movies/{id} (status includes encode_status)
- GET  /api/movies/{id}/stream (viewer, returns playbackUrl)

If any endpoint is missing, STOP and tell the user which component to implement first.

## 0) Ensure local stack is running
docker compose up -d
(Then run /dev or start api+worker)

## 1) Create a small sample MP4 locally
... (giá»¯ nguyĂªn cĂ¡c bÆ°á»›c báº¡n Ä‘Ă£ viáº¿t)
