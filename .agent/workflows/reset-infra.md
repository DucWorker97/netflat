---
name: workflow-reset-infra
description: Reset local infra (drops volumes). Use when DB/MinIO is corrupted.
trigger: manual
---

## ---
description: Reset local infra (WARNING: deletes docker volumes). Use when DB/MinIO is corrupted.
## ---

1. Stop infra and delete volumes (DANGEROUS)
   docker compose down -v

// turbo
2. Start infra again
   docker compose up -d

// turbo
3. Regenerate + migrate + seed
   pnpm db:generate && pnpm db:migrate && pnpm db:seed
