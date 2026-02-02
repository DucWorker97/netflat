---
name: workflow-ui-audit
description: UI/UX audit using Web Interface Guidelines.
trigger: manual
---


# UI Audit Workflow (/ui-audit)

This workflow audits the `apps/web` and `apps/admin` applications for UI/UX compliance using Vercel's Web Interface Guidelines.

## Scope
- `apps/web`
- `apps/admin`

## 1. Audit Execution
Use the installed agent skills to review component code and layouts.

### Instructions
1. **Identify Key Components**: Focus on Layouts, Forms, Tables, and Complex Interactive Elements.
2. **Run Guidelines Check**: Use the `web-design-guidelines` skill or the `/web-interface-guidelines` command on identified files.
   > Prompt: "Review this file against Web Interface Guidelines. Focus on accessibility, interactions, and performance."

## 2. Reporting
Generate a **UI Audit Report** markdown artifact with the following categories:

### A11y P0 (Critical Accessibility)
*Must fix for compliance and basic usability (Keyboard/Focus/Forms).*
- **File**: `[path]`
- **Issue**: [Description]
- **Guideline Violation**: [Specific rule]
- **Fix**: [Code/Instruction]

### UX P1 (Core Experience)
*Navigation, State feedback, Loading, Error handling.*
- **File**: ...
- **Issue**: ...
- **Fix**: ...

### Performance UX P1
*Perceived performance, Layout Shift, Interaction latency.*
- **File**: ...
- **Issue**: ...
- **Fix**: ...

## 3. Definition of Done UI (Checklist)
Use this checklist to validate any UI fixes or new features:

- [ ] **Focus Management**: Tab focus creates a visible ring around interactive elements.
- [ ] **Keyboard Access**: All actions can be performed via keyboard (Enter/Space).
- [ ] **Semantics**: HTML structure used correctly (Buttons are buttons, links are links).
- [ ] **Aria Labels**: Used where visual context is missing (icons).
- [ ] **Error States**: Form errors are explicit and descriptive.
- [ ] **Loading States**: Skeletons or spinners shown during data fetch.
- [ ] **Reduced Motion**: Respects `prefers-reduced-motion` media query.
- [ ] **Hit Targets**: Touch targets are at least 44x44px on mobile.
