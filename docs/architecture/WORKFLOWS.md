# Runtime Workflows

Updated: 2026-03-14

## 1. Authentication Workflow

1. Client calls POST /api/auth/login.
2. API validates credentials and user active state.
3. API returns accessToken, refreshToken, expiresIn, user.
4. Client stores token and calls /api/auth/me for profile refresh.
5. When access token expires, client calls /api/auth/refresh.

## 2. Upload To Encode Workflow

1. Admin creates or edits movie metadata.
2. Admin requests presigned upload URL via GET /api/upload/presigned-url.
3. Browser uploads file directly to MinIO using returned URL.
4. Admin confirms upload via POST /api/movies/:id/upload-complete (or /api/upload/complete/:movieId).
5. API marks movie encode status and enqueues encode job.
6. Encode processor downloads original video, runs ffmpeg profiles, uploads HLS outputs.
7. API updates movie encodeStatus and playbackUrl.

## 3. Playback Workflow

1. Viewer requests GET /api/movies/:id/stream.
2. API checks movie publish/encode availability.
3. API returns playback URL and quality options.
4. Viewer player loads master.m3u8 and segments from MinIO public base.

## 4. Continue Watching Workflow

1. Viewer posts progress via POST /api/history/:movieId.
2. API upserts watch_history record.
3. Viewer fetches GET /api/history/continue-watching for rail data.

## 5. Favorites Workflow

1. Viewer adds via POST /api/favorites/:movieId.
2. Viewer lists via GET /api/favorites.
3. Viewer removes via DELETE /api/favorites/:movieId.

## 6. Rating Workflow

1. Viewer rates via POST /api/ratings/:movieId.
2. Viewer can read own rating via GET /api/ratings/:movieId/user.
3. Public stats/list available via /stats and /list endpoints.

## 7. Session Recorder Workflow (Debug)

1. App boots with recorder enabled by env.
2. Recorder captures click/input/navigation/error/fetch events.
3. User exports JSON snapshot via REC button or Ctrl+Shift+S.
4. JSON is used for reproducible bug analysis.
