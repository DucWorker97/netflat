# Pipeline Idempotency Audit

> **Date:** 2026-01-15  
> **Scope:** Encode pipeline - idempotency, deduplication, retry/backoff

---

## Current Flow Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           UPLOAD + ENCODE PIPELINE                           │
└──────────────────────────────────────────────────────────────────────────────┘

  Admin UI                   API                      Queue                Worker
     │                        │                         │                     │
     │ 1. Get presigned URL   │                         │                     │
     ├───────────────────────►│                         │                     │
     │                        │ - Validate movie        │                     │
     │                        │ - Generate objectKey    │                     │
     │◄───────────────────────┤ - Return signed URL     │                     │
     │                        │                         │                     │
     │ 2. PUT file to MinIO   │                         │                     │
     ├────────────────────────┼────────────────►(MinIO) │                     │
     │                        │                         │                     │
     │ 3. POST upload-complete│                         │                     │
     ├───────────────────────►│                         │                     │
     │                        │ - Create Upload record  │                     │
     │                        │ - Create EncodeJob ────────────► (PROBLEM!)   │
     │                        │ - encodeQueue.add() ───►│                     │
     │◄───────────────────────┤                         │                     │
     │                        │                         │ 4. Worker picks job │
     │                        │                         │◄────────────────────┤
     │                        │                         │                     │
     │                        │                         │ - Download input    │
     │                        │                         │ - FFmpeg encode     │
     │                        │                         │ - Upload HLS        │
     │                        │                         │ - markReady()       │
     │                        │                         │────────────────────►│
```

---

## Entry Points

| Step | Endpoint/Function | File | Description |
|------|------------------|------|-------------|
| 1 | `GET /upload/presigned-url` | `apps/api/src/upload/upload.controller.ts` | Generate presigned PUT URL |
| 2 | (Client uploads to MinIO) | - | Direct S3 upload |
| 3 | `POST /movies/:id/upload-complete` (alias deprecated: `/upload/complete/:movieId`) | `apps/api/src/movies/movies.controller.ts` | **ENQUEUE POINT** |
| 3a | `uploadService.uploadComplete()` | `apps/api/src/upload/upload.service.ts:110` | Creates Upload + EncodeJob records |
| 3b | `encodeQueue.add('ENCODE_HLS')` | `apps/api/src/upload/upload.service.ts:155` | Adds BullMQ job |
| 4 | Worker `processEncodeJob()` | `apps/worker/src/lib/processor.ts:21` | FFmpeg processing |
| 4a | `markProcessing()` | `apps/worker/src/lib/database.ts:43` | Updates status to PROCESSING |
| 4b | `markReady()` | `apps/worker/src/lib/database.ts:71` | Updates status to READY |
| 4c | `markFailed()` | `apps/worker/src/lib/database.ts:104` | Updates status to FAILED |

---

## Current Problems

### Problem 1: No DB Uniqueness on EncodeJob

**Location:** `apps/api/src/upload/upload.service.ts:143-151`

```typescript
// CURRENT: Creates new EncodeJob every call
const encodeJob = await this.prisma.encodeJob.create({
    data: {
        movieId,
        inputKey: objectKey,  // <-- No unique constraint!
        outputPrefix: `hls/${movieId}/`,
        status: EncodeJobStatus.pending,
    },
});
```

**Issue:** Calling `upload-complete` twice creates 2 `encode_jobs` records.

**Fix:** Add `@@unique([movieId, inputKey])` or `@@unique([inputKey])` to schema.

---

### Problem 2: BullMQ jobId is per-movieId, not per-upload

**Location:** `apps/api/src/upload/upload.service.ts:154`

```typescript
const jobId = `encode_${movieId}`;  // <-- Uses movieId only
```

**Issue:** 
- If same movie uploaded twice (different objectKey), both try same jobId → first wins, second silently fails.
- If called twice with same objectKey, jobId matches but DB creates duplicate records.

**Fix:** Use `objectKey` or `uploadId` as jobId for true 1:1 mapping.

---

### Problem 3: No Retry Configuration in Queue Producer

**Location:** `apps/api/src/upload/upload.service.ts:168-172`

```typescript
{
    jobId,
    removeOnComplete: 100,
    removeOnFail: 50,
    // NO attempts/backoff specified!
}
```

**Issue:** Retry behavior depends on worker defaults, which may not be set.

**Fix:** Add explicit `attempts` and `backoff` configuration.

---

### Problem 4: Worker has partial idempotency

**Location:** `apps/worker/src/lib/processor.ts:56-60`

```typescript
// Idempotency: skip if already ready
if (movie.encodeStatus === 'ready' && movie.playbackUrl) {
    console.log('⏭️ Movie already encoded, skipping');
    return;
}
```

**Good:** Worker skips if READY.  
**Issue:** Doesn't check EncodeJob status, doesn't handle PROCESSING race condition.

---

### Problem 5: Upload record has no unique constraint

**Location:** Prisma schema `Upload` model

```prisma
model Upload {
  id           String
  movieId      String
  objectKey    String    // <-- No unique constraint
  ...
}
```

**Issue:** Same file can be registered multiple times.

---

## Recommended Fixes

### 1. Schema Changes

```prisma
model Upload {
  ...
  objectKey    String @map("object_key") @db.VarChar(500)
  ...
  @@unique([objectKey])  // ADD: One upload per S3 key
}

model EncodeJob {
  ...
  inputKey     String @map("input_key") @db.VarChar(500)
  ...
  @@unique([inputKey])   // ADD: One encode job per input file
}
```

### 2. Idempotent Enqueue Logic

```typescript
async uploadComplete(params) {
  // 1. Check if EncodeJob already exists for this inputKey
  const existingJob = await prisma.encodeJob.findUnique({
    where: { inputKey: objectKey }
  });
  
  if (existingJob) {
    if (existingJob.status === 'completed') {
      return { status: 'already_ready', jobId: existingJob.id };
    }
    if (existingJob.status === 'pending' || existingJob.status === 'processing') {
      return { status: 'already_queued', jobId: existingJob.id };
    }
    // If failed, allow retry by resetting status
    if (existingJob.status === 'failed') {
      await prisma.encodeJob.update({
        where: { id: existingJob.id },
        data: { status: 'pending', errorMessage: null }
      });
      // Re-add to queue with same jobId
    }
  }
  
  // 2. Create/upsert with unique constraint handling
  const encodeJob = await prisma.encodeJob.upsert({
    where: { inputKey: objectKey },
    create: { ... },
    update: { /* only update if failed */ }
  });
  
  // 3. Add to queue with deduplication
  await encodeQueue.add('ENCODE_HLS', data, {
    jobId: `encode_${encodeJob.id}`,  // Use DB job ID for true 1:1
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
    deduplication: { id: encodeJob.id, ttl: 300000 },  // 5 min
  });
}
```

### 3. Retry/Backoff Configuration

```typescript
// In producer (upload.service.ts)
await this.encodeQueue.add('ENCODE_HLS', data, {
    jobId: `encode_${encodeJobId}`,
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 10000,  // 10s, 20s, 40s
    },
    removeOnComplete: 100,
    removeOnFail: { count: 50 },
});

// In worker (main.ts) - already has backoff, add concurrency limit
const worker = new Worker(QUEUE_NAME, processor, {
    connection,
    concurrency: 1,  // Single job at a time for FFmpeg
    limiter: { max: 1, duration: 1000 },
    lockDuration: 600000,  // 10 min lock for long encodes
});
```

---

## State Machine

```
                    ┌─────────────┐
                    │   PENDING   │◄─────────────────┐
                    └──────┬──────┘                  │
                           │ Worker picks up       retry
                    ┌──────▼──────┐                  │
                    │  PROCESSING │──────────────────┤
                    └──────┬──────┘                  │
                           │                         │
              ┌────────────┼────────────┐            │
              ▼                         ▼            │
       ┌──────────────┐         ┌──────────────┐     │
       │   COMPLETED  │         │    FAILED    │─────┘
       │   (READY)    │         │  (can retry) │
       └──────────────┘         └──────────────┘
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add unique constraints |
| `apps/api/prisma/migrations/` | New migration |
| `apps/api/src/upload/upload.service.ts` | Idempotent enqueue logic |
| `apps/worker/src/main.ts` | Add lockDuration |
| `apps/worker/src/lib/processor.ts` | Improve idempotency checks |
| `docs/OBSERVABILITY.md` | Document logging rules |
