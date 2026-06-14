---
title: "Drag-and-drop single Episode"
status: done
created: 2026-06-14
---

## Parent

`.scratch/inbox-multiselect-drag-drop/issue.md`

## What to build

Enable dragging a single Episode from the Inbox or a Folder onto a Folder node (or Inbox header) to move it. Includes the custom drag layer, drop target highlighting, and drop feedback animation.

End-to-end behavior:
- Any Episode row in the sidebar is draggable. Drag starts anywhere on the row after a 5px movement threshold (no hold delay, no explicit drag handle).
- While dragging, a custom drag layer (portal-rendered pill) shows the Episode title (truncated). Follows the cursor.
- Valid drop targets: all Folder nodes in the sidebar + the Inbox header. The source container (where the Episode currently lives) does not highlight.
- When dragging over a valid target, the Folder row gets a subtle background highlight. Dropping on a collapsed Folder moves into it without expanding.
- On drop: the Episode's `folder_id` updates via `moveEpisodes([id], targetFolderId)` IPC call. The source item fades out (~150ms) then the gap collapses. The target Folder row pulses with accent color (~300ms).
- Dragging an Episode that is currently selected clears the multi-selection first and drags only that one item (multi-drag is a separate slice).
- All Episode statuses are draggable.
- Uses native HTML Drag and Drop API (no library).

## Acceptance criteria

- [ ] Episode rows are draggable after 5px movement threshold
- [ ] Custom drag layer shows episode title in a pill, follows cursor
- [ ] Folder nodes and Inbox header highlight when dragged over
- [ ] Source container does not highlight as a drop target
- [ ] Dropping on a Folder moves the Episode there via batch IPC
- [ ] Dropping on Inbox header moves Episode to Inbox (folder_id = null)
- [ ] Collapsed Folders accept drops without expanding
- [ ] Source item fades out and gap collapses after drop
- [ ] Target Folder pulses with accent color after drop
- [ ] All Episode statuses are draggable
- [ ] Native HTML DnD API used (no library)
- [ ] Does not conflict with existing file/URL drop handler in App.tsx
- [ ] Store's local state updated after move

## Blocked by

- `.scratch/inbox-multiselect-db-batch/issue.md`
