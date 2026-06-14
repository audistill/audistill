---
title: "Drag-and-drop multi-select"
status: ready-for-agent
created: 2026-06-14
---

## Parent

`.scratch/inbox-multiselect-drag-drop/issue.md`

## What to build

Extend drag-and-drop to work with multi-selected Episodes. Dragging one selected item drags the entire selection; dropping moves all of them.

End-to-end behavior:
- When ≥1 Episode is selected and the user drags one of the selected items, all selected Episodes are included in the drag operation.
- The custom drag layer pill shows the first Episode's title + a "+N" badge (e.g., "+2" for 3 total items being dragged).
- Dropping onto a Folder/Inbox moves ALL selected Episodes to that target via `moveEpisodes(allSelectedIds, targetFolderId)`.
- All moved items fade out with gap collapse; target pulses (same animation as single drag-and-drop).
- After drop completes, selection clears and action bar hides.
- Dragging an UNSELECTED Episode when a selection exists: clears the current selection and drags only that one item (no badge). This matches Finder behavior.
- The count badge on the drag layer updates correctly based on selection size.

## Acceptance criteria

- [ ] Dragging a selected item drags the entire selection
- [ ] Drag layer shows first title + "+N" badge for multi-drag
- [ ] Dropping moves all selected Episodes to target
- [ ] All moved items fade out with gap collapse animation
- [ ] Target folder pulses after multi-drop
- [ ] Selection clears and action bar hides after drop
- [ ] Dragging an unselected item clears selection and drags only that item (no badge)
- [ ] Badge count is correct (total selected - shown title = N in "+N")
- [ ] Works for selections from both Inbox and Folders

## Blocked by

- `.scratch/inbox-multiselect-selection-state/issue.md`
- `.scratch/inbox-multiselect-dnd-single/issue.md`
