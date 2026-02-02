---
name: workflow-verify
description: Verify quality gates (lint, typecheck, build).
trigger: manual
---


# /verify — Quality Gate

Runs lint, typecheck, and build checks to ensure code quality.

## Pass/Fail Criteria

**PASS when:**
- ✅ `pnpm lint` succeeds (exit 0)
- ✅ `pnpm typecheck` succeeds (exit 0)
- ✅ `pnpm build` succeeds (exit 0)

**FAIL when:**
- ❌ Any command fails (exit != 0)
- Script outputs which command failed

## Run Locally

```bash
# Recommended: use CI script
pnpm -w verify

# Or run steps manually:
pnpm lint
pnpm typecheck
pnpm build
```

## CI Integration

This gate runs automatically on:
- Pull Requests
- Push to main

See `.github/workflows/ci.yml` for details.

## Steps

// turbo
1. Lint
   pnpm lint

// turbo
2. Typecheck
   pnpm typecheck

// turbo
3. Build
   pnpm build

## Pre-Delivery Checklist

### Code Quality
- [ ] No `any` type
- [ ] No hardcoded magic numbers/strings
- [ ] Complete error handling
- [ ] Clear variable/function naming
- [ ] No duplicate code

### Structure
- [ ] Correct folder structure
- [ ] Correct naming convention
- [ ] < 200 lines/file (recommended)
- [ ] Single Responsibility Principle

### UI/UX (if applicable)
- [ ] Follows Design System
- [ ] Responsive (mobile-first)
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Accessibility (a11y)

### Maintainability
- [ ] Comments at complex logic
- [ ] Testable
- [ ] Extensible
- [ ] No unintended side effects

### Performance
- [ ] No unnecessary re-renders
- [ ] Lazy loading for heavy components
- [ ] Optimized images
- [ ] No memory leaks
