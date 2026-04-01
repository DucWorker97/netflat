# Session Recorder Guide

Updated: 2026-03-14

Recorder components are mounted in:

- apps/web/src/app/layout.tsx
- apps/admin/src/app/layout.tsx

Recorder implementation files:

- apps/web/src/components/debug-session-recorder.tsx
- apps/admin/src/components/debug-session-recorder.tsx

## 1. Purpose

Capture reproducible client activity and errors without writing manual bug descriptions.

## 2. What Is Captured

- click events
- input/change events (password masked)
- navigation (pushState, replaceState, popstate)
- JS runtime errors
- unhandled promise rejections
- fetch request summary (url, method, status, duration)

## 3. How To Export

- Click REC floating button
- Or press Ctrl+Shift+S

Export result is a JSON file containing ordered event timeline.

## 4. Auto-Start Behavior

Recorder starts automatically when:

- NEXT_PUBLIC_ENABLE_SESSION_RECORDER=true

Temporary disable for current URL:

- append ?record=0

## 5. Recommended Bug Report Flow

1. Start app normally.
2. Reproduce issue.
3. Export recorder JSON.
4. Attach JSON when asking for bug fix.
5. Include rough timestamp if needed.

## 6. Submission Cleanup

When asked to remove debug code before final submission, remove:

1. Recorder mount lines in both layout files.
2. Two recorder component files.
3. Optional env variable NEXT_PUBLIC_ENABLE_SESSION_RECORDER.
