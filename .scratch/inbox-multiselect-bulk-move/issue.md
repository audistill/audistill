---
title: "Bulk move with folder-tree popover"
status: done
created: 2026-06-14
---

## Parent

`.scratch/inbox-multiselect-drag-drop/issue.md`

## What to build

Wire the action bar's "Move to..." button to a folder-tree popover that moves all selected Episodes to the chosen Folder. Replace the single-Episode context menu's flyout "Move to..." submenu with the same popover component.

End-to-end behavior:
- Clicking "Move to..." in the action bar opens a folder-tree popover vertically centered within the sidebar.
- The popover displays the full folder hierarchy (same nesting as the sidebar tree). No "New Folder" button.
- Clicking a Folder in the popover calls `moveEpisodes(selectedIds, folderId)` via IPC, closes the popover, clears the selection, and hides the action bar.
- Clicking the Inbox entry in the popover moves selected Episodes to Inbox (folderId = null).
- The source container is not shown as a selectable target (e.g., if all selected are in Inbox, Inbox is not listed or is greyed out).
- Click outside the popover closes it without acting.
- Single-Episode context menu "Move to..." action now opens the same popover (positioned vertically centered in sidebar) instead of the old flyout submenu. It moves just that one Episode.
- The popover component is shared/reusable between both call sites.

## Acceptance criteria

- [ ] Action bar "Move to..." button opens folder-tree popover
- [ ] Popover shows full folder hierarchy with nesting
- [ ] Clicking a folder moves all selected Episodes there and clears selection
- [ ] Clicking Inbox entry moves Episodes to Inbox
- [ ] Source container not shown as valid target
- [ ] Click outside closes popover without action
- [ ] Popover vertically centered within sidebar
- [ ] Single-Episode context menu "Move to..." uses the same popover
- [ ] Old flyout submenu removed from context menu
- [ ] Store's local episode state updated after move (folder_id changes reflected)
- [ ] Popover component is shared between action bar and context menu

## Blocked by

- `.scratch/inbox-multiselect-selection-state/issue.md`
- `.scratch/inbox-multiselect-db-batch/issue.md`
