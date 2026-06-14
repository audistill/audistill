---
title: "Selection state + action bar shell"
status: done
created: 2026-06-14
---

## Parent

`.scratch/inbox-multiselect-drag-drop/issue.md`

## What to build

Add multi-select capability to the Sidebar's Episode lists (Inbox and Folders) with a floating action bar that appears when items are selected.

End-to-end behavior:
- Cmd+click on an Episode toggles its selection without navigating. Shift+click selects a contiguous range from the last-toggled item to the clicked item based on visible order (across date-group dividers).
- Cmd+A selects all Episodes in the currently focused container (Inbox or the expanded Folder the user last interacted with).
- Selection is scoped to a single container. Cmd+clicking an Episode in a different container clears the previous selection and starts fresh.
- All Episode statuses are selectable (complete, error, downloading, etc.).
- When ≥1 Episode is selected, a floating action bar appears at the bottom of the sidebar showing: "[N] selected" label, Move to... button, Delete button, Export button, and ✕ dismiss button.
- The action bar buttons are wired but do nothing yet (subsequent slices implement each action).
- Deselection via: ✕ button on bar, Escape key, plain click on an unselected Episode (clears and navigates), click on empty sidebar space.
- Selected Episodes get a subtle visual indicator (highlight background or checkmark).

Store additions:
- `selectedEpisodeIds: Set<string>`
- `selectionContainer: 'inbox' | string` (folder ID)
- `toggleEpisodeSelection(id, container)`
- `selectEpisodeRange(fromId, toId, container)`
- `selectAllInContainer(container)`
- `clearSelection()`

## Acceptance criteria

- [ ] Cmd+click toggles an Episode's selection state
- [ ] Shift+click selects a range in visible order
- [ ] Cmd+A selects all Episodes in the current container
- [ ] Selection is single-container scoped — selecting in a different container clears previous
- [ ] Floating action bar appears at sidebar bottom when ≥1 selected
- [ ] Action bar shows correct count, Move to / Delete / Export buttons, and ✕
- [ ] Escape clears selection and hides bar
- [ ] ✕ button clears selection and hides bar
- [ ] Plain click on unselected item clears selection and navigates
- [ ] Click on empty sidebar space clears selection
- [ ] Selected items have a visual indicator
- [ ] Works in both Inbox and Folder episode lists
- [ ] All Episode statuses are selectable
- [ ] Store unit tests pass for toggle, range, selectAll, clear, and container scoping

## Blocked by

None — can start immediately.
