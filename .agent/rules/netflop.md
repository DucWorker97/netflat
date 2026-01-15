Repo-specific rules override generic rules…
---
trigger: always_on
---

---
description: Workspace rules for netflop (Netflix mini graduation project)
---

# netflop — Workspace Rules (Always Follow)

## 0) Bối cảnh dự án
- netflop là Netflix mini cho **video tự sản xuất**.
- Scope: đồ án tốt nghiệp, ưu tiên chạy demo ổn định + kiến trúc rõ ràng.

## 1) Nguồn chân lý (Source of Truth)
Trước khi code tính năng lớn, luôn đọc và bám theo:
- PRD.md
- ARCHITECTURE.md
- DATABASE_SCHEMA.md
- OPENAPI.yaml
Nếu có mâu thuẫn, ưu tiên: PRD > Architecture > OpenAPI > Code.

## 2) Stack cố định (không tự ý thay đổi)
- Monorepo: pnpm + Turborepo
- Backend: NestJS (TypeScript) + Prisma
- DB: PostgreSQL
- Queue/Jobs: BullMQ + Redis
- Storage (dev): MinIO (S3-compatible)
- Admin Web: Next.js
- Mobile App: Expo React Native
- Worker: Node.js TypeScript (FFmpeg/HLS)

**Không** tự thêm hệ thống mới (Kafka/Elastic/DRM thương mại) trừ khi được yêu cầu.

## 3) Quy tắc làm việc (Agent Behavior)
- Luôn bắt đầu bằng: (a) Plan ngắn, (b) Task breakdown, (c) Definition of Done.
- Thực hiện theo nhịp: Plan → Implement → Verify (run commands) → Summarize changes.
- Trước khi tạo/chỉnh sửa nhiều file: liệt kê files sẽ thay đổi.
- Mọi thay đổi phải có lý do + liên hệ đến requirement trong PRD/Architecture.

## 4) Definition of Done (DoD) tối thiểu cho mọi task
- `pnpm lint` pass
- `pnpm typecheck` pass
- `pnpm dev` chạy được (API + Admin + Worker + Mobile dev server tối thiểu)
- Không hardcode secret; update `.env.example` nếu thêm env mới
- Update README nếu thay đổi scripts, ports, hoặc cách chạy local

## 5) Coding Standards (TypeScript)
- TypeScript strict; tránh `any` (chỉ dùng khi thật cần và có comment giải thích).
- Backend:
  - DTO + validation (class-validator hoặc zod; chọn 1 và nhất quán)
  - Error format thống nhất
  - Không truy cập DB trực tiếp từ controller; dùng service layer
- Naming:
  - Endpoint REST rõ ràng, số nhiều cho collection (`/movies`, `/genres`)
  - File/folder theo feature (module-based)

## 6) API & Data Contracts
- Mọi thay đổi API phải cập nhật OPENAPI.yaml tương ứng.
- Không “đoán” fields: dùng DATABASE_SCHEMA.md làm chuẩn.
- Pagination thống nhất (page/limit hoặc cursor) đúng như OpenAPI.

## 7) Security mức đồ án
- Phân quyền admin vs viewer rõ ràng (guards).
- Stream URL: “bảo vệ nhẹ” (chỉ user login mới nhận được stream ticket / signed URL).
- Upload: dùng presigned URL, validate contentType/size.

## 8) Git hygiene
- Commit message dạng: `feat(api): ...`, `fix(worker): ...`, `chore(repo): ...`
- Không commit file .env thật; chỉ commit .env.example.

## 9) Đồng bộ contract + đảm bảo E2E video pipeline không gãy

Repo-specific rules override generic rules.
Trong mọi thay đổi liên quan Upload/Encode/Playback, ưu tiên đúng “source-of-truth” và tuyệt đối không để lệch docs ↔ OpenAPI ↔ code ↔ smoke workflows.

### 1) Canonical API Contract (không để lệch endpoint)
- Mọi endpoint liên quan video pipeline (presign upload, upload-complete, encode status, playback URL) phải có “canonical path” duy nhất.
- Nếu code thay đổi route / payload / query:
  (a) Update OpenAPI (contract) cùng PR,
  (b) Update docs liên quan (VIDEO_PIPELINE/ARCHITECTURE/README),
  (c) Update workflows smoke:video và test script gọi đúng path.
- Không được tồn tại 2 mô tả khác nhau cho cùng 1 bước (ví dụ upload-complete) giữa docs & code. Nếu cần backward-compatible thì tạo route alias, nhưng ghi DEPRECATED và kế hoạch xoá.

### 2) Presigned Upload (đảm bảo upload chạy được từ browser)
- Khi cấp presigned URL, contract phải quy định rõ:
  - method (PUT/POST), required headers (đặc biệt Content-Type), expires/TTL.
- Cảnh báo bắt buộc: Content-Type và headers khi client upload phải khớp với lúc server ký; sai khác dễ gây SignatureDoesNotMatch.
- Nếu upload từ browser: bắt buộc cấu hình CORS đúng cho bucket/origin; nếu CORS sai thì UI sẽ “không upload được” dù backend ký đúng.
- Không log presigned URL đầy đủ (phải mask query string/signature).

### 3) HLS Playback (đảm bảo “xem được phim” khi bucket private)
- HLS master playlist sẽ tham chiếu media playlists (variant) và media segments. (HLS spec/RFC8216)
- Nếu storage private + dùng signed URL:
  - Không được chỉ sign mỗi master.m3u8 rồi trả về client.
  - BẮT BUỘC chọn 1 trong 3 cách:
    A) Public-read prefix HLS (chỉ dev/staging), hoặc
    B) Rewrite playlist: trả về playlists đã thay URI bằng signed URLs cho cả variant + segments, hoặc
    C) Proxy streaming qua API (API fetch object từ storage và stream ra).
- Tiêu chí PASS: Client player load được master → variant → segments mà không gặp 403/404.

### 4) E2E Gate bắt buộc cho mọi thay đổi pipeline
- PR nào đụng Upload/Encode/Playback phải chạy:
  - pnpm -w verify
  - pnpm -w smoke
  - (ít nhất manual) pnpm -w smoke:video
- smoke:video report phải ghi: request_id (x-request-id), job_id (BullMQ), movie_id/upload_id, và playback m3u8 HTTP 200.
- Nếu dùng retries/backoff cho encode job: phải cấu hình backoff (không retry “ngay lập tức”) để tránh spam/loop.

### 5) Authorization theo object (tối thiểu)
- Bất kỳ endpoint nào nhận object ID từ client và truy cập dữ liệu phải kiểm tra quyền ở cấp object (BOLA) trước khi thao tác.
