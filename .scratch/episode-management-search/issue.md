---
title: "Episode management (rename, move, delete) + search"
status: done
created: 2026-06-02
---

## Parent

`.scratch/library-and-summarization/issue.md` — PRD: Audistill v2 — Library & Summarization

## What to build

Enable users to rename episodes, move them between folders, delete them, and search across their library.

**Rename:** Click the episode title in the detail view (pencil icon on hover) → inline edit → blur or Enter saves to DB. Title persists.

**Move:** Right-click episode in sidebar → context menu showing available folders → select destination → episode moves. The sidebar updates immediately. Moving to "Inbox" sets `folder_id = NULL`.

**Delete:** Right-click episode → "Delete" with confirmation. Removes from DB. If episode had an open tab, that tab closes.

**Search:** The search input at the top of the sidebar performs full-text search across episode titles and summary content. Results filter the sidebar tree in real-time as the user types. Clearing the search restores the full tree.

**Preload/IPC:** `renameEpisode(id, title)`, `moveEpisode(id, folderId)`, `deleteEpisode(id)`, `searchEpisodes(query)`.

## Acceptance criteria

- [ ] Clicking episode title in detail view enables inline editing (pencil icon on hover)
- [ ] Edited title saves to DB and updates sidebar immediately
- [ ] Right-click episode in sidebar shows context menu with "Move to..." and "Delete"
- [ ] Move to folder updates episode's location in sidebar tree
- [ ] Move to Inbox (folder_id = NULL) works
- [ ] Delete episode removes from DB, closes its tab if open, updates sidebar
- [ ] Delete shows confirmation before proceeding
- [ ] Search input filters sidebar by title and summary content
- [ ] Search results update in real-time as user types
- [ ] Clearing search input restores full sidebar tree
- [ ] All operations persist across app restart
- [ ] Renamed/moved episodes reflect correctly in their detail view metadata

## Blocked by

- `.scratch/database-persistence-wiring/issue.md` — DatabaseService + persistence wiring
- `.scratch/folder-management/issue.md` — Folder management (folders must exist to move episodes into)
