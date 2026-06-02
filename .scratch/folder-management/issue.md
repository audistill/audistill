---
title: "Folder management (create, rename, delete, nest)"
status: done
created: 2026-06-02
---

## Parent

`.scratch/library-and-summarization/issue.md` — PRD: PodCapture v2 — Library & Summarization

## What to build

Enable users to create, rename, delete, and nest folders in the sidebar tree. This wires the folder UI elements (already rendered in the shell) to real CRUD operations persisted in SQLite.

**Interactions:**
- Create folder: context menu or a "New Folder" action in the sidebar. User provides a name. Folder appears in tree.
- Rename folder: double-click folder name or context menu → inline edit.
- Delete folder: context menu with confirmation. Episodes in the deleted folder return to Inbox (`folder_id` set to NULL via ON DELETE SET NULL).
- Nesting: folders can be created inside other folders (`parent_id`). Tree renders nested structure with indentation and expand/collapse.
- Sort order: folders maintain their `sort_order` position.

**Preload/IPC:** `createFolder(name, parentId?)`, `renameFolder(id, name)`, `deleteFolder(id)`.

## Acceptance criteria

- [ ] User can create a new folder (appears in sidebar tree immediately)
- [ ] User can rename a folder (inline edit, persists to DB)
- [ ] User can delete a folder (with confirmation — episodes return to Inbox)
- [ ] Folders can be nested (create folder inside another folder)
- [ ] Nested folders render with proper indentation and expand/collapse chevrons
- [ ] Folder operations persist across app restart
- [ ] Deleting a parent folder cascades to child folders (episodes orphaned to Inbox)
- [ ] Empty folder shows appropriate empty state when selected

## Blocked by

- `.scratch/database-persistence-wiring/issue.md` — DatabaseService + persistence wiring
