# .agent REPORT - Phase 0

## Inventory
- rules files: 9
- workflows files: 13
- skills files: 57
- plans files: 3

## Frontmatter Checks
### Multi-frontmatter
- None detected in in-scope files.

### Missing Required Fields (name/description/trigger)
| Path | Missing |
| --- | --- |
| `.agent\rules\01-identity.md` | name, description, trigger |
| `.agent\rules\02-task-classification.md` | name, description, trigger |
| `.agent\rules\03-mode-consulting.md` | frontmatter |
| `.agent\rules\04-mode-build.md` | frontmatter |
| `.agent\rules\05-mode-debug.md` | frontmatter |
| `.agent\rules\06-mode-optimize.md` | frontmatter |
| `.agent\rules\08-communication.md` | name, description, trigger |
| `.agent\rules\09-checklist.md` | name, description, trigger |
| `.agent\rules\netflop.md` | frontmatter |
| `.agent\workflows\bootstrap.md` | frontmatter |
| `.agent\workflows\code.md` | frontmatter |
| `.agent\workflows\cook.md` | frontmatter |
| `.agent\workflows\dev.md` | frontmatter |
| `.agent\workflows\perf-audit.md` | name, trigger |
| `.agent\workflows\request.md` | frontmatter |
| `.agent\workflows\reset-infra.md` | frontmatter |
| `.agent\workflows\scaffold-feature.md` | frontmatter |
| `.agent\workflows\smoke.md` | name, trigger |
| `.agent\workflows\ui-audit.md` | name, trigger |
| `.agent\workflows\ui-ux-pro-max.md` | frontmatter |
| `.agent\workflows\verify.md` | name, trigger |
| `.agent\workflows\video-pipeline-smoke.md` | frontmatter |
| `.agent\skills\auth-expert\SKILL.md` | trigger |
| `.agent\skills\docker-expert\SKILL.md` | trigger |
| `.agent\skills\github-actions-expert\SKILL.md` | trigger |
| `.agent\skills\nestjs-expert\SKILL.md` | frontmatter |
| `.agent\skills\playwright-expert\SKILL.md` | trigger |
| `.agent\skills\postgres-expert\SKILL.md` | trigger |
| `.agent\skills\prisma-expert\SKILL.md` | trigger |
| `.agent\skills\typescript-expert\SKILL.md` | trigger |
| `.agent\skills\vercel-react-best-practices\SKILL.md` | trigger |
| `.agent\skills\web-design-guidelines\SKILL.md` | trigger |
| `.agent\skills\web-interface-guidelines\SKILL.md` | frontmatter |

## Duplications / Overlaps (DoD / Checklists)
- `.agent/rules/netflop.md` Minimal DoD overlaps with `.agent/workflows/verify.md` pre-delivery checklist and gate commands.
- `.agent/rules/04-mode-build.md` includes a checklist that overlaps with verify checklist items.
- `.agent/rules/09-checklist.md` is a pointer to verify; functional duplication remains if verify is expanded.
- `.agent/workflows/ui-ux-pro-max.md` has a pre-delivery checklist that overlaps with `.agent/workflows/ui-audit.md` Definition of Done UI.
- `.agent/workflows/request.md` and `.agent/workflows/cook.md` mention "Run checklist before delivery" without single canonical checklist target.

## Missing Skill References
- `.agent\skills\auth-expert\SKILL.md` -> database-expert, devops-expert, rest-api-expert
- `.agent\skills\typescript-expert\SKILL.md` -> typescript-build-expert, typescript-module-expert, typescript-type-expert
- `.agent\skills\docker-expert\SKILL.md` -> database-expert, devops-expert, kubernetes-expert
- `.agent\skills\prisma-expert\SKILL.md` -> database-expert, devops-expert, mongodb-expert
- `.agent\skills\postgres-expert\SKILL.md` -> database-expert, performance-expert, security-expert
- `.agent\skills\playwright-expert\SKILL.md` -> jest-expert, rest-api-expert, testing-expert, vitest-expert

## Long Skill Files (>250 lines)
- `.agent\skills\docker-expert\SKILL.md` (415 lines)
- `.agent\skills\github-actions-expert\SKILL.md` (460 lines)
- `.agent\skills\nestjs-expert\SKILL.md` (560 lines)
- `.agent\skills\postgres-expert\SKILL.md` (648 lines)
- `.agent\skills\prisma-expert\SKILL.md` (361 lines)
- `.agent\skills\typescript-expert\SKILL.md` (435 lines)

## Recommendation Table
| Path | Recommendation | Reason | Risk |
| --- | --- | --- | --- |
| `.agent/rules/*.md` | EDIT | Add minimal frontmatter fields (name/description/trigger) and keep semantics unchanged. | Low |
| `.agent/workflows/*.md` | EDIT | Add minimal frontmatter fields (name/description/trigger) and keep semantics unchanged. | Low |
| `.agent/skills/*/SKILL.md` | EDIT | Add missing trigger (and name/description where absent). | Low |
| `.agent/rules/09-checklist.md` | MOVE | Keep as workflow-only checklist (merge into verify), leave stub link or remove duplication. | Low |
| `.agent/rules/04-mode-build.md` | EDIT | Replace embedded checklist with reference to netflop DoD + verify workflow. | Low |
| `.agent/workflows/verify.md` | EDIT | Keep as canonical pre-delivery checklist to avoid duplication across modes. | Low |
| `.agent/workflows/ui-ux-pro-max.md` | KEEP | Keep UI-specific checklist; ensure it references verify for general gates. | Low |
| `.agent/workflows/ui-audit.md` | KEEP | Keep UI DoD; ensure it does not restate global DoD. | Low |
| `.agent\skills\docker-expert\SKILL.md` | MOVE | Add Quick Use section + move deep reference content to SKILL_REFERENCE.md. | Low |
| `.agent\skills\github-actions-expert\SKILL.md` | MOVE | Add Quick Use section + move deep reference content to SKILL_REFERENCE.md. | Low |
| `.agent\skills\nestjs-expert\SKILL.md` | MOVE | Add Quick Use section + move deep reference content to SKILL_REFERENCE.md. | Low |
| `.agent\skills\postgres-expert\SKILL.md` | MOVE | Add Quick Use section + move deep reference content to SKILL_REFERENCE.md. | Low |
| `.agent\skills\prisma-expert\SKILL.md` | MOVE | Add Quick Use section + move deep reference content to SKILL_REFERENCE.md. | Low |
| `.agent\skills\typescript-expert\SKILL.md` | MOVE | Add Quick Use section + move deep reference content to SKILL_REFERENCE.md. | Low |
| `.agent\skills\auth-expert\SKILL.md` | EDIT | Replace missing skill refs: database-expert, devops-expert, rest-api-expert | Low |
| `.agent\skills\typescript-expert\SKILL.md` | EDIT | Replace missing skill refs: typescript-build-expert, typescript-module-expert, typescript-type-expert | Low |
| `.agent\skills\docker-expert\SKILL.md` | EDIT | Replace missing skill refs: database-expert, devops-expert, kubernetes-expert | Low |
| `.agent\skills\prisma-expert\SKILL.md` | EDIT | Replace missing skill refs: database-expert, devops-expert, mongodb-expert | Low |
| `.agent\skills\postgres-expert\SKILL.md` | EDIT | Replace missing skill refs: database-expert, performance-expert, security-expert | Low |
| `.agent\skills\playwright-expert\SKILL.md` | EDIT | Replace missing skill refs: jest-expert, rest-api-expert, testing-expert, vitest-expert | Low |
