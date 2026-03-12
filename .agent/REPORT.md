# .agent REPORT - Phase 0

## Inventory
- rules files: 9
- workflows files: 13
- skills files: 63 (includes nested rules under `vercel-react-best-practices`)
- plans files: 3

## Frontmatter Checks
### Multi-frontmatter
- None detected in `.agent/rules`, `.agent/workflows`, or `.agent/skills`.

### Missing Required Fields (name/description/trigger)
- None for in-scope entries: `.agent/rules/*.md`, `.agent/workflows/*.md`, `.agent/skills/*/SKILL.md`.
- Note: `.agent/skills/vercel-react-best-practices/rules/*.md` use a custom schema (`title/impact/tags`) and intentionally omit `name/description/trigger`.

## Duplications / Overlaps (DoD / Checklists)
- `.agent/rules/NETFLAT.md` Minimal DoD overlaps conceptually with `.agent/workflows/verify.md` "Pre-Delivery Checklist" (two sources for quality gates).
- `.agent/workflows/verify.md` UI/UX checklist overlaps with `.agent/workflows/ui-audit.md` Definition of Done UI.
- `.agent/workflows/ui-ux-pro-max.md` "Common Rules for Professional UI" overlaps with the UI checklist in `ui-audit.md` and the UI/UX section in `verify.md`.
- `.agent/rules/09-checklist.md` duplicates the canonical checklist pointer already embedded in `verify.md`.

## Missing / Non-existent Subagents or Tools
- `.agent/skills/github-actions-expert/SKILL_REFERENCE.md` references non-existent experts: DevOps, Security, Node.js, Database (no matching skills installed).
- `.agent/workflows/ui-ux-pro-max.md` references missing script: `.shared/ui-ux-pro-max/scripts/search.py` (path not found in repo).

## Recommendation Table
| Path | Recommendation | Reason | Risk |
| --- | --- | --- | --- |
| `.agent/rules/NETFLAT.md` | KEEP | Canonical workspace rule + DoD source of truth. | Low |
| `.agent/rules/09-checklist.md` | MERGE | Convert into workflow-only checklist by merging into `workflows/verify.md`. | Low |
| `.agent/workflows/verify.md` | EDIT | Make single canonical pre-delivery checklist; remove duplicated UI/UX list or reference `ui-audit.md`. | Low |
| `.agent/workflows/ui-audit.md` | EDIT | Keep UI-specific DoD; reference `verify.md` for global gates. | Low |
| `.agent/workflows/ui-ux-pro-max.md` | EDIT | Fix missing script path; avoid restating UI checklist items. | Medium |
| `.agent/skills/github-actions-expert/SKILL_REFERENCE.md` | EDIT | Replace non-existent expert references with existing skills or generic guidance. | Low |
| `.agent/skills/vercel-react-best-practices/rules/*.md` | KEEP | Custom frontmatter schema used by the skill; no change needed. | Low |
