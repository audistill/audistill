---
title: "Bulk delete with confirmation modal"
status: done
created: 2026-06-14
---

## Parent

`.scratch/inbox-multiselect-drag-drop/issue.md`

## What to build

Wire the action bar's "Delete" button (and the Delete/Backspace keyboard shortcut) to a styled confirmation modal that deletes all selected Episodes. Upgrade single-Episode delete to use the same modal.

End-to-end behavior:
- Clicking "Delete" in the action bar (or pressing Delete/Backspace with items selected) opens a custom confirmation modal.
- Modal shows title: "Delete N episodes?" (or "Delete episode?" for single).
- Modal body lists the first 2-3 Episode titles. If count > 3, adds "and N more" text.
- Two buttons: "Cancel" (secondary style) and "Delete" (destructive red).
- Confirming calls `deleteEpisodes(selectedIds)` via IPC, closes the modal, clears selection, hides the action bar.
- Cancelling closes the modal with no action.
- Single-Episode "Delete" from the context menu now opens the same modal (showing just that episode's title) instead of `window.confirm()`.
- The modal component is shared between bulk and single delete.

## Acceptance criteria

- [ ] Action bar "Delete" button opens confirmation modal
- [ ] Delete/Backspace keyboard shortcut opens the same modal when items are selected
- [ ] Modal shows "Delete N episodes?" title with correct count
- [ ] Modal body shows first 2-3 titles + "and N more" for larger selections
- [ ] "Delete" button has destructive red styling
- [ ] Confirming deletes all selected Episodes via batch IPC call
- [ ] Selection clears and action bar hides after confirmed delete
- [ ] Cancel closes modal without deleting
- [ ] Single-Episode context menu "Delete" uses the same modal
- [ ] `window.confirm()` removed from delete flows
- [ ] Modal component is shared between single and bulk delete
- [ ] Store's local episode state updated after delete (episodes removed from list)

## Blocked by

- `.scratch/inbox-multiselect-selection-state/issue.md`
- `.scratch/inbox-multiselect-db-batch/issue.md`
