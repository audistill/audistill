---
title: ProcessingState rich progress display
status: done
created: 2026-06-03
---

## What to build

Replace the current animated-dot ProcessingState center view with a richer progress display during transcription. Show:

1. **Progress bar with percent** — horizontal bar with numeric label (e.g. "47%")
2. **Speed multiplier** — computed as `(duration_sec * percent / 100) / elapsedSeconds`, displayed as "36x listening speed"
3. **ETA** — computed as `remainingAudioSeconds / speedMultiplier`, displayed as "~2 min remaining"

The episode's `duration_sec` is already available in the store. `elapsedSeconds` is derived from `Date.now() - startedAt` in the progress store entry. Update the display on each progress event (not on a timer).

Keep the existing animated icon and filename. Add the progress info below them. During the "summarizing" stage, revert to the current simple indicator (no speed/ETA — summarization doesn't have meaningful progress yet).

## Acceptance criteria

- [ ] Progress bar with numeric percent displayed during transcription stage
- [ ] Speed multiplier shown (format: "Nx listening speed"), updates as percent increases
- [ ] ETA shown (format: "~X min remaining" or "~X sec remaining"), derived from speed
- [ ] Graceful handling: no division-by-zero on first event, no negative ETA, no NaN display
- [ ] Summarization stage still shows simple "Generating summary..." without progress metrics
- [ ] Existing animated icon and filename remain visible above the progress info

## Blocked by

- `.scratch/progress-store-wiring`
