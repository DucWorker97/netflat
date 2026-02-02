# Netflop Video Pipeline Documentation

This document details the end-to-end flow for uploading, encoding, and streaming movies in Netflop.

## Overview

The pipeline consists of three main stages:
1.  **Direct-to-S3 Upload**: Client uploads large video files directly to MinIO/S3 using presigned URLs.
2.  **Async Encoding**: A background worker processes the video into HLS format (Adaptive Bitrate Streaming).
3.  **Secure Playback**: Users access streams via public URLs (dev/staging) or short-lived signed URLs.

## 1. Upload Flow

### Pre-requisites
- User must be logged in as `admin`.
- Use the **Admin Dashboard** or API direct calls.

### Steps
1.  **Get Presigned URL**
    - **Endpoint**: `GET /api/upload/presigned-url`
    - **Query Params**:
        - `movieId`: UUID of the movie created in DB.
        - `fileName`: Original filename (e.g., `movie.mp4`).
        - `contentType`: MIME type (e.g., `video/mp4`).
        - `sizeBytes`: File size in bytes.
    - **Response**: `{ uploadUrl, objectKey, expiresAt }`
    - **Logic**: Validates file size (default max 500MB) and type. Returns a PUT URL valid for 30 minutes.

2.  **Client Upload**
    - **Action**: Client sends a `PUT` request to `uploadUrl` with the raw binary file content.
    - **Note**: This bypasses the NestJS API server to handle large files efficiently.

3.  **Complete Upload**
    - **Endpoint**: `POST /api/upload/complete/:movieId`
    - **Body**: `{ objectKey, fileType: "video" }`
    - **Logic**:
        - Verifies transaction.
        - Updates Movie record: `originalKey = objectKey`.
        - Sets validation status: `encodeStatus = 'pending'`.
        - **Enqueues Job**: Adds a job to the `encode` queue (BullMQ).

## 2. Encoding Flow (Worker)

The `@netflop/worker` service listens to the `encode` queue.

### Job Processor: `processEncodeJob`
1.  **Claim Job**: Checks if movie is already `ready` or `processing`. Marks DB as `processing`.
2.  **Download**: Fetches the uploaded raw MP4 from MinIO to a local temp directory.
3.  **Transcode (FFmpeg)**:
    - Generates 3 renditions:
        - **360p**: 640x360 @ 800k
        - **480p**: 854x480 @ 1400k
        - **720p**: 1280x720 @ 2800k
    - **Output**: `master.m3u8` and `v0/v1/v2/prog_index.m3u8` with `seg_*.ts`.
4.  **Thumbnail Generation**:
    - If no poster exists, extracts a frame from 5s mark.
    - Uploads to `thumbnails/`.
5.  **Upload HLS**:
    - Uploads all HLS files to `hls/{movieId}/`.
    - Prefix: `hls/`
6.  **Completion**:
    - Updates DB: `encodeStatus = 'ready'`.
    - Sets `playbackUrl` to the path of `master.m3u8`.
    - Cleans up temp files.

### Error Handling
- **Retries**: BullMQ attempts the job 3 times with exponential backoff (10s, 30s, 60s).
- **Failure**: If all retries fail, updates DB `encodeStatus = 'failed'`. 

## 3. Playback Flow

1.  **Request Stream**
    - **Endpoint**: `GET /api/movies/:id/stream`
    - **Auth**: User must be logged in.
    - **Policy**: Checks if user has access (e.g., subscription valid - *future scope*).
2.  **Sign URL**
    - If `S3_PUBLIC_BASE_URL` is set, API returns a public URL for `master.m3u8`.
    - Otherwise, API generates a signed URL (TTL via `STREAM_URL_TTL_SECONDS`).
    - Dev/staging policy: only `hls/`, `posters/`, `thumbnails/`, `subtitles/` are public; `originals/` stays private.
    - Public mode returns `expiresAt: null`; signed mode returns a timestamp.
    - Production can switch to signed segments or proxy playback later.
3.  **Play**
    - Client (Web/Mobile) loads the signed URL into an HLS-compatible player (e.g., `hls.js`, `expo-video`).

## Database States (`EncodeStatus`)

| Status       | Description |
| :---         | :--- |
| `pending`    | Upload confirmed, waiting for worker to pick up. |
| `processing` | Worker is currently encoding the video. |
| `ready`      | Encoding complete, HLS available for streaming. |
| `failed`     | Encoding failed after max retries. |

## Configuration Keys (`.env`)

- `S3_BUCKET`: MinIO bucket name (default: `netflop-media`).
- `S3_PRESIGN_BASE_URL`: Public MinIO/S3 base used for presigned upload URLs.
- `S3_PUBLIC_BASE_URL`: Public base URL for playback assets (hls/posters/thumbnails/subtitles).
- `UPLOAD_MAX_MB`: Max file size limit (default: 500).
- `REDIS_URL`: Queue connection string.
