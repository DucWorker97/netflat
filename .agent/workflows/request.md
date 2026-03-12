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
| Ä‘Å¸â€Â | **CONSULT** | "should", "recommend", "compare", "suggest", "advice" |
| Ä‘Å¸Ââ€”Ă¯Â¸Â | **BUILD**   | "create", "make", "build", "add", "implement", "write" |
| Ä‘Å¸â€Â§ | **DEBUG**   | "error", "bug", "not working", "wrong", "fix" |
| Ă¢ÂÂ¡ | **OPTIMIZE** | "slow", "refactor", "clean", "improve", "optimize" |

> **Note:** If unclear Ă¢â€ â€™ Ask the user before proceeding.

## ---

## Step 2: Execute Based on Mode

### Ä‘Å¸â€Â CONSULT Mode

1. Clarify context & constraints
2. Provide 2-3 options with clear trade-offs
3. Recommend the optimal option with reasoning
4. **WAIT for confirmation** before coding

### Ä‘Å¸Ââ€”Ă¯Â¸Â BUILD Mode

1. Confirm scope & acceptance criteria
2. Propose file/component structure
3. Code in order: Types Ă¢â€ â€™ Logic/Hooks Ă¢â€ â€™ UI Ă¢â€ â€™ Styles
4. Run canonical DoD in `rules/NETFLAT.md` and /verify workflow

### Ä‘Å¸â€Â§ DEBUG Mode

1. Gather info: what, where, when
2. Analyze root cause
3. Propose fix + explanation
4. Suggest prevention measures

### Ă¢ÂÂ¡ OPTIMIZE Mode

1. Measure baseline
2. Identify main bottlenecks
3. Propose improvements + predict results
4. Refactor + compare before/after

## ---

## Step 3: Pre-Delivery Checklist

- Follow canonical DoD in `rules/NETFLAT.md`.
- Run `/verify` workflow before delivery.
- For UI work, use `/ui-audit` checklist as needed.

## ---

## Tips

- Ă¢ÂÅ’ Don't expand scope unilaterally
- Ă¢ÂÅ’ Don't use `any` types
- Ă¢Å“â€¦ Ask when requirements are unclear
- Ă¢Å“â€¦ Comment complex logic
- Ă¢Å“â€¦ Prioritize: Readability Ă¢â€ â€™ Performance Ă¢â€ â€™ Cleverness
