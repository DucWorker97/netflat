---
name: workflow-video-pipeline-smoke
description: End-to-end smoke test for upload -> encode HLS -> playback.
trigger: manual
---

## ---
description: End-to-end smoke test for upload -> encode HLS -> playback (NETFLAT)
## ---

# /video-pipeline-smoke Ă¢â‚¬â€ NETFLAT

## Preconditions
Assumes these endpoints exist (per OPENAPI.yaml):
- POST /api/auth/login
- POST /api/movies (admin)
- GET  /api/upload/presigned-url (admin)
- POST /api/movies/{id}/upload-complete (admin) (alias deprecated: /api/upload/complete/{movieId})
- GET  /api/movies/{id} (status includes encode_status)
- GET  /api/movies/{id}/stream (viewer, returns playbackUrl)

If any endpoint is missing, STOP and tell the user which component to implement first.

## 0) Ensure local stack is running
docker compose up -d
(Then run /dev or start api+worker)

## 1) Create a small sample MP4 locally
... (giĂ¡Â»Â¯ nguyÄ‚Âªn cÄ‚Â¡c bĂ†Â°Ă¡Â»â€ºc bĂ¡ÂºÂ¡n Ă„â€˜Ä‚Â£ viĂ¡ÂºÂ¿t)
