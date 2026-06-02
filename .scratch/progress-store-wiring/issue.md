---
title: Wire ingest progress into Zustand store
status: done
created: 2026-06-03
---

## What to build

Subscribe to the `onIngestProgress` IPC event in the app's Zustand store and maintain a reactive `progress` map keyed by episodeId. Each entry holds `{ percent, startedAt }` where `startedAt` is captured on the first progress event for that episode. Clear the entry when the episode status transitions to a terminal state (done or error).

This gives both sidebar and main-content components a single source of truth for transcription progress without duplicate IPC subscriptions.

## Acceptance criteria

- [ ] Zustand store exposes a `progress` map with shape `Record<string, { percent: number; startedAt: number }>`
- [ ] A single `onIngestProgress` listener populates/updates the map on each IPC event
- [ ] `startedAt` is set once (first event per episode) using `Date.now()`
- [ ] Entry is removed when episode status becomes `done`, `error`, or on app re-mount if episode is no longer processing
- [ ] No duplicate subscriptions on hot-reload (cleanup on unmount/re-subscribe)

## Blocked by

None - can start immediately
