---
title: "Cancel transcription: cancel, delete-while-transcribing, restart, startup recovery"
status: done
created: 2026-06-03
---

## What to build

Allow users to cancel an in-progress transcription. The worker is killed immediately (`worker.terminate()`), all partial segments and temp files are discarded, and the episode transitions to a new `cancelled` status. The feature also handles the case where the user deletes an episode that's currently transcribing (atomic: terminate worker then delete), and recovers from app-quit-during-transcription on next startup.

### Cancel behavior

- Cancel is only available during the `transcribing` phase (not during `summarizing`).
- Immediate `worker.terminate()` — no graceful signal, no confirmation dialog.
- Any intermediate artifacts (temp PCM buffers, partial data) are cleaned up. No file leftovers on disk.
- The episode status becomes `cancelled` (new status in the union type).
- Remaining queued episodes continue processing — cancel is surgical, not queue-wide.

### Worker tracking

- IngestPipeline maintains a `Map<string, Worker>` keyed by episodeId.
- On cancel IPC: look up the worker, call `terminate()`, remove from map, update episode status to `cancelled`, broadcast update to renderer.

### Delete while transcribing

- If an episode is deleted while its worker is running, terminate the worker first, then delete the DB row. One atomic user action (the existing delete confirmation dialog is sufficient).

### Restart from cancelled

- Extend the existing `ingest:retry` IPC handler to also accept episodes with `cancelled` status.
- UI label adapts: show "Retry" for `error` episodes, "Restart" for `cancelled` episodes. Same code path underneath.

### UI: cancel trigger locations

1. **Context menu** — Right-click a transcribing episode in the sidebar → "Cancel Transcription" menu item.
2. **ProcessingState center view** — A "Cancel" button below the progress bar / ETA display.

### UI: cancelled state appearance

- **Sidebar:** Grey status dot (neutral, distinct from the active/error colors).
- **Center/detail view:** Simple message "Transcription cancelled" with a "Restart" button.

### Startup recovery

- On app launch, query the database for episodes with status `transcribing` or `queued` and reset them to `cancelled`. These are orphaned from a previous session that quit mid-work. User can restart them manually.

## Acceptance criteria

- [ ] New `cancelled` status added to the Episode status union type
- [ ] IngestPipeline tracks active workers in a `Map<string, Worker>`
- [ ] `ingest:cancel` IPC handler terminates the worker, cleans up temp files, sets status to `cancelled`
- [ ] Cancel during transcription leaves no orphaned files on disk
- [ ] Cancelling one episode does not stop the queue — next queued episode starts
- [ ] Delete of a transcribing episode terminates the worker before removing the DB row
- [ ] Context menu shows "Cancel Transcription" for episodes with status `transcribing`
- [ ] ProcessingState view shows a "Cancel" button during the transcribing phase (not summarizing)
- [ ] No confirmation dialog for cancel (immediate action)
- [ ] Cancelled episodes show grey dot in sidebar
- [ ] Clicking a cancelled episode shows "Transcription cancelled" message with "Restart" button
- [ ] `ingest:retry` accepts `cancelled` status; context menu shows "Restart" (not "Retry") for cancelled episodes
- [ ] On startup, episodes stuck in `transcribing` or `queued` are reset to `cancelled`
- [ ] TypeScript types compile cleanly; existing tests pass

## Blocked by

None — can start immediately.
