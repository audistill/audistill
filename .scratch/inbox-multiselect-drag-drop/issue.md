---
title: "Inbox multi-select, drag-and-drop, and bulk actions"
status: done
created: 2026-06-14
---

## Problem Statement

Users who accumulate many Episodes in the Inbox (or in Folders) have no efficient way to organize them in bulk. Moving, deleting, or exporting Episodes one at a time via the context menu is tedious when dealing with more than a handful. There is also no way to drag Episodes into Folders — the only path is the "Move to..." submenu.

## Solution

Add three interconnected capabilities to the Sidebar's Episode lists:

1. **Multi-select** — Cmd+click to toggle individual Episodes, Shift+click for range selection. A floating action bar appears at the bottom of the sidebar when ≥1 Episode is selected.
2. **Drag-and-drop** — any Episode (or multi-selected set) can be dragged onto a Folder node or the Inbox header to move it. Custom drag layer shows first title + count badge.
3. **Bulk actions via action bar** — Move to..., Delete, Export operate on the full selection.

Additionally, the single-Episode context menu is upgraded: "Move to..." opens the same folder-tree popover (replacing the flyout submenu), and Delete uses a styled custom modal instead of `window.confirm()`.

## User Stories

1. As a user, I want to Cmd+click multiple Episodes in the Inbox so that I can act on them as a group.
2. As a user, I want to Shift+click to select a range of Episodes so that I can quickly select a contiguous block.
3. As a user, I want to press Cmd+A to select all Episodes in the current container (Inbox or Folder) so that I can act on everything at once.
4. As a user, I want to see a floating action bar at the bottom of the sidebar when I have items selected so that I know what bulk actions are available.
5. As a user, I want to click "Move to..." in the action bar to open a folder-tree popover so that I can move all selected Episodes to a Folder.
6. As a user, I want to click "Delete" in the action bar to delete all selected Episodes after confirming in a styled modal.
7. As a user, I want to click "Export" in the action bar to export all selected Episodes as individual Markdown files into a folder I choose.
8. As a user, I want to drag an Episode from the Inbox onto a Folder node to move it there without using a menu.
9. As a user, I want to drag a multi-selected set of Episodes onto a Folder so that all selected items move together.
10. As a user, I want to see a custom drag layer (pill with title + count badge) while dragging so I know what I'm moving and how many.
11. As a user, I want Folder nodes and the Inbox header to highlight when I drag over them so I know where I can drop.
12. As a user, I want items to fade out with a gap collapse animation and the target folder to pulse when I drop so I get clear visual feedback.
13. As a user, I want to clear my selection by pressing Escape, clicking the ✕ button, clicking an unselected item, or clicking empty space in the sidebar.
14. As a user, I want dragging an unselected Episode to clear my current selection and drag only that item (matching Finder behavior).
15. As a user, I want Delete/Backspace to trigger bulk delete (with confirmation) when items are selected.
16. As a user, I want the selection to clear and the action bar to disappear after any completed action.
17. As a user, I want to multi-select Episodes inside a Folder (not just Inbox) with the same interactions.
18. As a user, I want to drag Episodes of any status (including errored or in-progress) so I can organize them before they finish processing.
19. As a user, I want the single-Episode "Move to..." context menu action to open the same folder-tree popover (vertically centered in the sidebar) instead of the flyout submenu.
20. As a user, I want the single-Episode "Delete" action to use the same styled confirmation modal as bulk delete.
21. As a user, I want the delete confirmation modal to show 2-3 Episode titles + "and N more" so I can verify I'm deleting the right things.

## Implementation Decisions

### Selection state

- New state in the app store: `selectedEpisodeIds: Set<string>`, scoped to a single container at a time (tracked via `selectionContainer: 'inbox' | string` where string is a folder ID).
- Actions: `toggleEpisodeSelection(id)`, `selectEpisodeRange(fromId, toId)`, `selectAllInContainer()`, `clearSelection()`.
- Cmd+click toggles. Shift+click selects range based on visible order. Cmd+A selects all in the current container across date-group dividers.

### Drag-and-drop

- Native HTML Drag and Drop API (Chromium-only target, no library needed).
- Drag starts anywhere on the Episode row with a 5px movement threshold (no hold delay, no drag handle).
- Dragging a selected Episode drags the entire selection. Dragging an unselected Episode clears selection and drags that one item.
- Custom drag layer: a portal-rendered pill showing the first Episode title (truncated) and a "+N" badge if multiple.
- Drop targets: Folder nodes + Inbox header. Drop on collapsed folder moves into it without expanding. Source container is not a valid drop target (no highlight).
- No reordering within Inbox — drag is for moving between containers only.

### Drop feedback animation

- Source: items fade out (~150ms) then gap collapses.
- Target: folder row background pulses with accent color (~300ms).

### Floating action bar

- Appears at the bottom of the sidebar when `selectedEpisodeIds.size > 0`.
- Shows: "[N] selected" label, Move to... button, Delete button, Export button, ✕ dismiss button.
- All actions clear selection and hide bar on completion.

### "Move to..." popover

- Shared component used by both the action bar button and the single-Episode context menu.
- Shows folder tree (same hierarchy as sidebar). No inline "New Folder" button.
- Positioned vertically centered within the sidebar panel.
- Clicking a folder executes the move and closes the popover.

### Delete confirmation modal

- Custom styled modal (not `window.confirm()`).
- Shows title: "Delete N episodes?"
- Body: first 2-3 Episode titles listed + "and N more" if count > 3.
- Buttons: Cancel (secondary) and Delete (destructive red).
- Used for both single and bulk delete (single just shows one title).

### Bulk export

- One Markdown file per Episode exported into a user-chosen folder (native folder picker via `dialog.showOpenDialog`).
- Reuses existing `exportSaveEpisode` logic batched across the selection.

### Deselection

- ✕ button on action bar.
- Escape key.
- Plain click on an unselected item (clears selection and navigates).
- Click on empty space in the sidebar.

### Keyboard shortcuts

- Cmd+A: select all in current container.
- Escape: clear selection.
- Delete/Backspace: bulk delete with confirmation.
- Accessibility (keyboard-only selection via Space/Arrow) deferred.

### Scope

- Multi-select works in both Inbox and Folder episode lists.
- Selection is single-container only — Cmd+clicking in a different container clears the previous selection.
- All Episode statuses are selectable and draggable.

## Testing Decisions

Tests should verify external behavior (state transitions, IPC calls, database results) not implementation details (internal method calls, render structure).

### App store (bulk actions) — unit tests

Test the selection state management and bulk action dispatching through the Zustand store. Pattern: mock `window.api`, call store actions, assert resulting state and API calls. Prior art: `tests/content-tab-store.test.ts`.

Tests to write:
- `toggleEpisodeSelection` adds/removes from set
- `selectEpisodeRange` selects correct contiguous block based on visible order
- `selectAllInContainer` selects all episodes in Inbox (folder_id === null) or all in a given folder
- `clearSelection` empties the set
- Selection scoping: selecting in a different container clears previous
- `moveEpisodes(ids, folderId)` calls `window.api.moveEpisode` for each ID and updates local state
- `deleteEpisodes(ids)` calls `window.api.deleteEpisode` for each ID and removes from local state
- `exportEpisodes(ids)` calls the export API for each ID
- Actions clear selection after completion

### Database service (batch operations) — unit tests

Test batch move and delete at the database layer with in-memory SQLite. Prior art: `tests/database-service.test.ts`.

Tests to write:
- `moveEpisodes(ids[], folderId)` updates folder_id for all specified episodes in one transaction
- `moveEpisodes` with null folderId moves episodes back to Inbox
- `deleteEpisodes(ids[])` removes all specified episodes in one transaction
- Batch operations are atomic — if one fails, none persist
- Batch operations with empty array are no-ops
- Batch move/delete don't affect other episodes

## Out of Scope

- Keyboard-only selection (accessibility via Space/Arrow keys) — deferred.
- Manual reordering of Episodes within the Inbox.
- Cross-container multi-select (selecting from Inbox and a Folder simultaneously).
- Inline "New Folder" creation inside the Move to popover.
- Drag-and-drop for Folder reordering or nesting.
- Touch/mobile interactions.

## Further Notes

- The native HTML DnD API is appropriate here because the app runs on Chromium only (Electron). No cross-browser quirks to handle.
- The custom drag layer can be implemented via `setDragImage()` with a pre-rendered offscreen element, or a portal that tracks mouse position during drag events.
- The folder-tree popover component should be extracted as a shared component since it's used from both the action bar and the context menu.
- The existing `handleMoveEpisode(episodeId, folderId)` in the Sidebar should be generalized to handle arrays.
