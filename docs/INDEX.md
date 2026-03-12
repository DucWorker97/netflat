# Documentation Index

> **NETFLAT** â€” Netflix Mini cho Video Tá»± Sáº£n Xuáº¥t  
> đŸ“ Organized documentation by topic

---

## đŸ€ Start Here

| Báº¡n lĂ ... | Äá»c file | Má»¥c Ä‘Ă­ch |
|-----------|----------|----------|
| **Má»›i vĂ o team** | [README.md](../README.md) | Setup local, cháº¡y `pnpm dev` |
| **PM / Reviewer** | [reference/PRD.md](reference/PRD.md) | Scope, features, acceptance |
| **Developer** | [architecture/OVERVIEW.md](architecture/OVERVIEW.md) | System design, tech stack |
| **Tester** | [features/STATUS.md](features/STATUS.md) | Feature checklist |

---

## đŸ“ Documentation Structure

```
docs/
â”œâ”€â”€ INDEX.md                          # đŸ‘ˆ You are here
â”‚
â”œâ”€â”€ architecture/                     # System design
â”‚   â”œâ”€â”€ OVERVIEW.md                   # C4 architecture, NestJS modules, data flow
â”‚   â”œâ”€â”€ DATABASE.md                   # ERD, Prisma schema, enums, models
â”‚   â”œâ”€â”€ VIDEO_PIPELINE.md             # FFmpeg HLS encoding pipeline
â”‚   â”œâ”€â”€ UPLOAD_AND_PLAYBACK_FLOW.md   # End-to-end upload â†’ playback
â”‚   â””â”€â”€ PIPELINE_IDEMPOTENCY.md       # Encode idempotency audit
â”‚
â”œâ”€â”€ features/                         # Feature tracking
â”‚   â”œâ”€â”€ STATUS.md                     # Implementation matrix (MVP/SHOULD/COULD)
â”‚   â”œâ”€â”€ KNOWN_GAPS.md                 # Missing features, TODOs
â”‚   â””â”€â”€ AUDIT_MISMATCH.md             # PRD vs Code discrepancies
â”‚
â”œâ”€â”€ testing/                          # QA & CI
â”‚   â”œâ”€â”€ CI_GATES.md                   # CI quality gates definition
â”‚   â”œâ”€â”€ QA_TEST_PLAN.md               # Functional test plan by module
â”‚   â”œâ”€â”€ QA_REGRESSION.md              # Regression checklist
â”‚   â”œâ”€â”€ QA_REPORT.md                  # Latest test report
â”‚   â”œâ”€â”€ DIAGNOSTIC_REPORT.md          # Playback/upload troubleshooting
â”‚   â””â”€â”€ PATCH_PLAN.md                 # Quick-fix plans
â”‚
â”œâ”€â”€ deployment/                       # Infrastructure
â”‚   â”œâ”€â”€ DOCKER.md                     # Local Docker (Postgres, Redis, MinIO)
â”‚   â””â”€â”€ STAGING.md                    # Staging deployment guide
â”‚
â”œâ”€â”€ security/                         # Security
â”‚   â””â”€â”€ BOLA_AUDIT.md                 # OWASP API security audit
â”‚
â”œâ”€â”€ observability/                    # Logging & monitoring
â”‚   â””â”€â”€ MONITORING.md                 # Request ID, JSON logs, Grafana
â”‚
â”œâ”€â”€ ai-service/                       # AI Curator
â”‚   â””â”€â”€ README.md                     # Python FastAPI recommendation engine
â”‚
â”œâ”€â”€ mobile/                           # Mobile app
â”‚   â””â”€â”€ README.md                     # Expo React Native app docs
â”‚
â”œâ”€â”€ design/                           # UI/UX design
â”‚   â”œâ”€â”€ UI_REFERENCE.md               # Admin upload UI reference (Lovable)
â”‚   â””â”€â”€ LOVABLE_CONTEXT.md            # Context for AI redesign
â”‚
â””â”€â”€ reference/                        # Source of truth & handoffs
    â”œâ”€â”€ PRD.md                        # Product Requirements Document
    â”œâ”€â”€ HANDOFF.md                    # Latest technical handoff
    â”œâ”€â”€ HANDOFF_CODEX.md              # Previous handoff (Codex)
    â””â”€â”€ UI_AUDIT.md                   # Web app UI/UX audit
```

---

## đŸ”— Quick Links by Topic

### Authentication & Security
- PRD: [reference/PRD.md](reference/PRD.md)
- Security Audit: [security/BOLA_AUDIT.md](security/BOLA_AUDIT.md)
- API spec: [OPENAPI.yaml](../OPENAPI.yaml)
- Code: `apps/api/src/auth/`

### Video Upload & Encoding
- Architecture: [architecture/VIDEO_PIPELINE.md](architecture/VIDEO_PIPELINE.md)
- Flow: [architecture/UPLOAD_AND_PLAYBACK_FLOW.md](architecture/UPLOAD_AND_PLAYBACK_FLOW.md)
- Idempotency: [architecture/PIPELINE_IDEMPOTENCY.md](architecture/PIPELINE_IDEMPOTENCY.md)
- Code: `apps/worker/`

### Database
- Schema: [architecture/DATABASE.md](architecture/DATABASE.md)
- Prisma: `apps/api/prisma/schema.prisma`

### Mobile App
- Docs: [mobile/README.md](mobile/README.md)
- Code: `apps/mobile/`

### Admin CMS
- Code: `apps/admin/`
- Design: [design/UI_REFERENCE.md](design/UI_REFERENCE.md)

### AI Recommendations
- Docs: [ai-service/README.md](ai-service/README.md)
- Code: `apps/ai-curator/`

### Infrastructure
- Local: [deployment/DOCKER.md](deployment/DOCKER.md)
- Staging: [deployment/STAGING.md](deployment/STAGING.md)

---

## đŸ“– Document Types (DiĂ¡taxis Framework)

| Type | Documents | When to Use |
|------|-----------|-------------|
| **Tutorial** | `README.md` | First-time setup |
| **How-to** | `testing/`, `deployment/` | Run specific tasks |
| **Reference** | `OPENAPI.yaml`, `architecture/DATABASE.md` | Look up specs |
| **Explanation** | `reference/PRD.md`, `architecture/OVERVIEW.md` | Understand why |
- Migrations: `apps/api/prisma/migrations/`

---

## đŸ—ï¸ Architecture Overview

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Mobile    â”‚  â”‚    Web      â”‚  â”‚   Admin     â”‚
â”‚ (Expo RN)   â”‚  â”‚  (Next.js)  â”‚  â”‚  (Next.js)  â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
       â”‚                â”‚                â”‚
       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                        â”‚
                        â–¼
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â”‚   API (NestJS)   â”‚
              â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
              â”‚  PostgreSQL     â”‚
              â”‚  Redis (Queue)  â”‚
              â”‚  MinIO (S3)     â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â”‚  Worker (FFmpeg) â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## đŸ“‹ Source of Truth Hierarchy

> Khi cĂ³ mĂ¢u thuáº«n, Æ°u tiĂªn theo thá»© tá»±:

1. **PRD.md** - Scope, features, acceptance criteria
2. **ARCHITECTURE.md** - System design, components
3. **OPENAPI.yaml** - API contracts
4. **Code** - Implementation

---

## đŸ”„ CI/CD Workflows

| Command | Description | Gate |
|---------|-------------|------|
| `pnpm verify` | Lint + Typecheck + Build | P0 |
| `pnpm smoke` | Infrastructure health | P0 |
| `pnpm smoke:video` | E2E video pipeline | Optional |

See [CI_GATES.md](./CI_GATES.md) for details.

---

## â“ FAQ

**Q: TĂ´i cáº§n thĂªm endpoint má»›i, báº¯t Ä‘áº§u tá»« Ä‘Ă¢u?**
1. Cáº­p nháº­t `OPENAPI.yaml` (design first)
2. Implement trong `apps/api/src/`
3. Cáº­p nháº­t `feature_status.md`

**Q: LĂ m sao biáº¿t tĂ­nh nÄƒng nĂ o Ä‘Ă£ implement?**
- Xem [feature_status.md](../feature_status.md)

**Q: TĂ¬m tháº¥y bug/mismatch giá»¯a docs vĂ  code?**
- ThĂªm vĂ o [AUDIT_MISMATCH.md](./AUDIT_MISMATCH.md)
- Táº¡o issue/PR Ä‘á»ƒ fix

**Q: Muá»‘n cháº¡y demo nhanh?**
1. `pnpm infra:up`
2. `pnpm db:migrate:deploy && pnpm db:seed`
3. `pnpm dev`
4. Má»Ÿ Admin: http://localhost:3001 (admin@NETFLAT.local / admin123)

---

## đŸ“ Contributing to Docs

1. Giá»¯ docs **ngáº¯n gá»n** vĂ  **chĂ­nh xĂ¡c**
2. Má»—i thay Ä‘á»•i API pháº£i cáº­p nháº­t `OPENAPI.yaml`
3. Má»—i thay Ä‘á»•i feature pháº£i cáº­p nháº­t `feature_status.md`
4. DĂ¹ng Mermaid cho diagrams trong markdown
