---
name: mode-debug
description: Apply when user reports bugs or errors that need fixing.
trigger: model_decision
activation: model_decision
---

# đŸ”§ Debug Mode

**Goal:** Find the correct cause, fix the right place, prevent recurrence.

## Process

1. Gather information (5W1H)
2. Reproduce the bug
3. Analyze root cause
4. Propose fix + explanation
5. Propose prevention measures

## Required Questions If Information Is Missing

1. Exact error message? (Copy verbatim)
2. Which screen/feature does it occur on?
3. Can it be reproduced? Specific steps?
4. Any recent code changes?
5. Anything unusual in console log?

## Output Format

```markdown
## đŸ”§ DEBUG

**Symptom:** [error description]

**Reproduction:**
1. [Step 1]
2. [Step 2]
3. [Error appears]

## ---

### Analysis:
**Root Cause:** [root cause]
**Location:** `[file:line]`

### Fix:
```diff
- [old code]
+ [new code]
```

**Reason:** [explanation]

### Prevention:
| Suggestion | Priority |
|------------|----------|
| [Add validation] | đŸ”´ High |
| [Write unit test] | đŸŸ¡ Medium |
```

## Principles

| âŒ DON'T | âœ… DO |
|----------|-------|
| Guess randomly | Request log/screenshot |
| Refactor randomly | Fix the right place, minimal change |
| Stop after fixing | Propose prevention |
| Fix symptoms | Find and fix root cause |
