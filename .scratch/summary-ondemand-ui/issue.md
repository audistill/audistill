---
title: "On-demand generation: IPC + store + segmented control UI"
status: ready-for-agent
created: 2026-06-03
---

## Parent

[PRD: Multi-tier Summary Views](.scratch/summary-views/issue.md)

## What to build

Implement on-demand summary generation: when a user switches to a view tier that hasn't been generated yet, trigger generation in the background. Add the segmented control UI to the episode detail view.

### IPC surface

New IPC handlers in main process:
- `summary:get-all(episodeId)` → returns all `episode_summaries` rows for the episode
- `summary:generate(episodeId, viewType)` → triggers on-demand generation (async, returns immediately)
- `summary:regenerate(episodeId, viewType)` → deletes existing row, then triggers generation

New IPC event (main → renderer):
- `summary-updated` — emitted when a summary row changes. Payload: `{ episodeId, viewType, status, content?, errorMessage? }`

Preload: expose `getSummaries`, `generateSummary`, `regenerateSummary`, and `onSummaryUpdated` listener.

### On-demand flow (main process)

When `summary:generate` is called and no row exists for that `(episodeId, viewType)`:
1. Insert row with `status: 'generating'` via DatabaseService.
2. Emit `summary-updated` to renderer.
3. Load episode's transcript from DB.
4. Call `SummarizationService.summarize(transcript, viewType)`.
5. On success: update row with `status: 'complete'`, content. Emit `summary-updated`.
6. On failure: update row with `status: 'error'`, error_message. Emit `summary-updated`.

The episode's top-level `status` is never modified.

### Store changes (renderer)

Add to app store:
```
summaries: Record<string, Record<string, { content: string | null, status: string, errorMessage?: string }>>
```

Keyed by `episodeId` → `viewType`. Hydrated when an episode tab is opened. Updated in response to `summary-updated` events.

### UI: EpisodeView summary section

Replace the current static summary rendering with:
1. **Segmented control** (Brief | Detailed | Full) in the summary section header.
2. Active tab shows content via existing Markdown renderer.
3. Tabs that have generated content display normally.
4. Tabs without generated content are visually dimmed (lower opacity or dot indicator).
5. If active tab has `status: 'generating'`: show shimmer/skeleton placeholder.
6. If active tab has `status: 'error'`: show error message with a retry button.
7. **Regenerate button**: small refresh icon next to the segmented control. Triggers re-generation of the currently active view.
8. Switching to an ungenerated tab automatically triggers `generateSummary`.

User can navigate away during generation and find the result when they return.

## Acceptance criteria

- [ ] Segmented control (Brief | Detailed | Full) renders in EpisodeView for completed episodes
- [ ] Clicking an ungenerated tab triggers on-demand generation
- [ ] Skeleton/shimmer shows while generating
- [ ] Completed content renders via Markdown when generation finishes
- [ ] Error state shows message + retry button
- [ ] Regenerate button overwrites existing summary with fresh generation
- [ ] User can navigate away and return to find completed summary
- [ ] Dimmed/indicator styling distinguishes generated vs. ungenerated tabs
- [ ] IPC handlers and preload methods are wired end-to-end
- [ ] Store updates reactively from `summary-updated` events
- [ ] Episode top-level status is never modified by on-demand generation

## Blocked by

- [summary-db-schema](.scratch/summary-db-schema/issue.md)
- [summary-prompt-templates](.scratch/summary-prompt-templates/issue.md)
