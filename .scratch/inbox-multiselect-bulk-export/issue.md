---
title: "Bulk export"
status: ready-for-agent
created: 2026-06-14
---

## Parent

`.scratch/inbox-multiselect-drag-drop/issue.md`

## What to build

Wire the action bar's "Export" button to export all selected Episodes as individual Markdown files into a user-chosen directory.

End-to-end behavior:
- Clicking "Export" in the action bar opens a native folder picker dialog (`dialog.showOpenDialog` with directory selection).
- If the user selects a folder, each selected Episode is exported as an individual Markdown file into that folder. Reuses the same export logic as the existing single-episode `exportSaveEpisode` (same content format, filename derived from episode title).
- After export completes, selection clears and action bar hides.
- If the user cancels the folder picker, nothing happens (selection preserved).
- Episodes without content (e.g., still in-progress) are skipped or exported with whatever content is available.

## Acceptance criteria

- [ ] Action bar "Export" button opens native folder picker
- [ ] Each selected Episode exported as individual Markdown file
- [ ] Export format matches existing single-episode export
- [ ] Filenames derived from Episode titles (sanitized for filesystem)
- [ ] Selection clears and bar hides after successful export
- [ ] Cancelling folder picker preserves selection (no-op)
- [ ] Works for any episode status (exports available content)
- [ ] IPC handler for batch export registered

## Blocked by

- `.scratch/inbox-multiselect-selection-state/issue.md`
