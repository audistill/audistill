---
title: "Regenerate tab with content snapshot and revert on failure"
status: done
created: 2026-06-11
---

## Parent

`.scratch/copy-export-regenerate/issue.md`

## What to build

A regenerate button on recipe-linked tabs that re-runs the tab's recipe with the current prompt and model settings, streaming new markdown content in real-time. Old content is preserved via snapshot and restored if regeneration fails or is cancelled.

**Regenerate button:** refresh/rotate icon in the tab toolbar, shown only when `recipe_id !== null` (pipeline and recipe tabs, hidden on canvas/manual tabs).

**Snapshot/revert behavior:**
- On regenerate start: store current `content` as a snapshot in the content-tab-store
- Stream new content into the tab (using existing streaming infrastructure: `tabs:execute-recipe` IPC, `onTabStreamStart/Token/End/Error` events)
- On success (stream-end): discard snapshot, new content is persisted
- On error (stream-error) or user cancel: restore snapshot content to store and persist via `tabsUpdateContent` IPC

**Toolbar disabled state:** While streaming, all toolbar actions (copy, export, regenerate) are disabled for the active tab.

The existing `tabs:execute-recipe` IPC handler and `IngestPipeline.regenerateTab()` already handle recipe execution and streaming. This slice modifies the renderer-side store and UI to add snapshot/revert semantics and the toolbar button.

## Acceptance criteria

- [ ] Regenerate icon button visible in tab toolbar for tabs with `recipe_id !== null`
- [ ] Button hidden on canvas/manual tabs (where `recipe_id` is null)
- [ ] Clicking regenerate triggers `tabs:execute-recipe` via existing IPC
- [ ] Current content is snapshotted in store before streaming begins
- [ ] New tokens stream into the tab content in real-time (existing behavior)
- [ ] On successful stream completion: snapshot discarded, new content persisted
- [ ] On stream error: old content restored from snapshot, persisted to DB
- [ ] On user cancel (if cancel mechanism exists): old content restored from snapshot
- [ ] Copy, export, and regenerate buttons disabled while streaming is active for that tab
- [ ] Recipe's current prompt is used (not a cached/stale version) — verified by the existing `tabs:execute-recipe` flow which fetches the recipe at execution time

## Blocked by

None — can start immediately.
