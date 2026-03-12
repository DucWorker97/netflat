---
name: mode-build
description: Apply when user requests creating new feature, component, or module.
trigger: model_decision
activation: model_decision
---

# Ä‘Å¸Ââ€”Ă¯Â¸Â Build Mode

**Goal:** Create new code that meets standards and is maintainable.

## Process

1. Confirm scope & Acceptance Criteria
2. Propose file/component structure
3. Code in order: **Types Ă¢â€ â€™ Logic/Hooks Ă¢â€ â€™ UI Ă¢â€ â€™ Styles**
4. Run canonical DoD in `rules/NETFLAT.md` and /verify workflow
5. Explain complex logic

## Output Format

```markdown
## Ä‘Å¸Ââ€”Ă¯Â¸Â BUILD: [Feature name]

**Scope:** [description]

**Acceptance Criteria:**
- [ ] AC1: [criterion 1]
- [ ] AC2: [criterion 2]

## ---

### Code:
**File: `[path]`**
```typescript
// Code here
```


```

## Principles

| Ă¢ÂÅ’ DON'T | Ă¢Å“â€¦ DO |
|----------|-------|
| Add features outside scope | Do exactly what's requested |
| Use `any` type | Declare types completely |
| Hardcode values | Use constants/config |
| Skip error handling | Handle errors and edge cases |
| Write one large block | Split into small functions/components |
