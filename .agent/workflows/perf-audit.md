---
name: workflow-perf-audit
description: Audit web/admin performance against React best practices.
trigger: manual
---


# Performance Audit Workflow (/perf-audit)

This workflow audits the `apps/web` and `apps/admin` applications for performance issues using Vercel's React Best Practices.

## 1. Scope Identification
Target the following directories by default unless specified otherwise:
- `apps/web` (Focus on `app/`, `pages/`, `components/`)
- `apps/admin` (Focus on `app/`, `pages/`, `components/`)

## 2. High-Impact Scan
Quickly scan the directories to identify high-traffic routes and complex components.
- Look for: Layout roots, Landing pages, Dashboard widgets, Data-heavy tables.
- List the files selected for deep audit.

## 3. Execution (React Best Practices Audit)
For each identified file, apply the `vercel-react-best-practices` skill instructions.
Key checks include:
- Client vs Server Components usage.
- Data fetching strategies (avoiding waterfalls).
- Image optimization (`next/image`).
- Re-render optimization (`useMemo`, `useCallback`, `memo`).
- Dynamic imports for heavy libraries.
- Font loading and script optimization.

## 4. Reporting
Generate a **Performance Audit Report** markdown artifact.
Group issues by priority:

### P0 (Must-Fix before merge)
*Critical performance bottlenecks, infinite loops, heavy blocking tasks, or massive bundle duplications.*
- **File**: `[path]`
- **Location**: `[Line X]`
- **Reason**: [Explanation]
- **Recommended Fix**: [Code or Instructions]

### P1 (Should-Fix)
*Noticeable UX improvements, CLS/LCP optimizations, significant render waste.*
- **File**: ...
- **Location**: ...
- **Reason**: ...
- **Recommended Fix**: ...

### P2 (Nice-to-Have)
*Micro-optimizations, code style for perf, theoretical improvements.*
- **File**: ...
- ...

## 5. Remediation trigger ("Fix P0")
If the user asks to "Fix P0 issues":
1. Create a branch: `fix/perf-audit-p0`.
2. Implement fixes strictly for P0 items.
3. Validate:
   - Run `pnpm -w verify` (Lint, Typecheck, Build).
   - Run `pnpm -w smoke` (Smoke Test).
4. Commit and notify user for PR/Merge.
