---
title: "Database batch operations for move and delete"
status: ready-for-agent
created: 2026-06-14
---

## Parent

`.scratch/inbox-multiselect-drag-drop/issue.md`

## What to build

Add batch `moveEpisodes` and `deleteEpisodes` methods to the DatabaseService and expose them via IPC so the renderer can move or delete multiple Episodes in a single transactional call.

End-to-end behavior:
- `moveEpisodes(ids: string[], folderId: string | null)` updates `folder_id` for all specified Episodes atomically. Pass `null` to move back to Inbox.
- `deleteEpisodes(ids: string[])` removes all specified Episodes atomically (same cleanup as the existing single `deleteEpisode` — file deletion, tab cleanup, chat history).
- Both operations are wrapped in a SQLite transaction — if any row fails, the entire batch rolls back.
- Empty arrays are no-ops (no error, no transaction opened).
- IPC handlers registered: `moveEpisodes`, `deleteEpisodes`.
- Preload/API types updated to expose the new batch methods.

## Acceptance criteria

- [ ] `moveEpisodes(ids[], folderId)` updates folder_id for all specified Episodes
- [ ] `moveEpisodes(ids[], null)` moves Episodes back to Inbox
- [ ] `deleteEpisodes(ids[])` removes all specified Episodes and their associated data
- [ ] Both operations are atomic (transaction wraps all writes)
- [ ] Empty array input is a no-op
- [ ] Operations don't affect unspecified Episodes
- [ ] IPC handlers registered and callable from renderer
- [ ] Preload API types updated
- [ ] Database service unit tests pass (in-memory SQLite)

## Blocked by

None — can start immediately.
