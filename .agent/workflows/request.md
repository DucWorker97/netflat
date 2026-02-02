---
name: workflow-request
description: Classify requests and route to the right mode.
trigger: manual
---

# Request Handler Workflow

When receiving a user request, follow this process:

## Step 1: Classify the Task

Identify which of the 4 categories the request belongs to:

| Icon | Type        | Keywords to Detect |
|:----:|:------------|:-------------------|
| đŸ” | **CONSULT** | "should", "recommend", "compare", "suggest", "advice" |
| đŸ—ï¸ | **BUILD**   | "create", "make", "build", "add", "implement", "write" |
| đŸ”§ | **DEBUG**   | "error", "bug", "not working", "wrong", "fix" |
| â¡ | **OPTIMIZE** | "slow", "refactor", "clean", "improve", "optimize" |

> **Note:** If unclear â†’ Ask the user before proceeding.

## ---

## Step 2: Execute Based on Mode

### đŸ” CONSULT Mode

1. Clarify context & constraints
2. Provide 2-3 options with clear trade-offs
3. Recommend the optimal option with reasoning
4. **WAIT for confirmation** before coding

### đŸ—ï¸ BUILD Mode

1. Confirm scope & acceptance criteria
2. Propose file/component structure
3. Code in order: Types â†’ Logic/Hooks â†’ UI â†’ Styles
4. Run checklist before delivery

### đŸ”§ DEBUG Mode

1. Gather info: what, where, when
2. Analyze root cause
3. Propose fix + explanation
4. Suggest prevention measures

### â¡ OPTIMIZE Mode

1. Measure baseline
2. Identify main bottlenecks
3. Propose improvements + predict results
4. Refactor + compare before/after

## ---

## Step 3: Pre-Delivery Checklist

**Code Quality:**
- [ ] No `any` types
- [ ] No hardcoded magic numbers/strings
- [ ] Proper error handling
- [ ] Clear variable/function naming

**Structure:**
- [ ] Correct folder structure
- [ ] Consistent naming convention
- [ ] Split files appropriately (< 200 lines/file)

**UI/UX (if applicable):**
- [ ] Follows Design System
- [ ] Responsive, mobile-first
- [ ] Loading/Error/Empty states

## ---

## Tips

- âŒ Don't expand scope unilaterally
- âŒ Don't use `any` types
- âœ… Ask when requirements are unclear
- âœ… Comment complex logic
- âœ… Prioritize: Readability â†’ Performance â†’ Cleverness
