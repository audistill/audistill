---
title: "Collapsible Inbox + Sort State"
status: done
created: 2026-06-14
---

## Parent

.scratch/mvp-inbox-sort-url-drop-paste-import/issue.md

## What to build

Make the Inbox section in the sidebar collapsible and add a cycle-on-click sort toggle. The Inbox header row gets a chevron (same expand/collapse pattern as folder nodes) and a sort label to the right of the episode count badge. Clicking the sort label cycles through: Newest → Oldest → Longest → Newest. The Inbox episode list respects the chosen sort order.

Both `inboxSort` and `inboxCollapsed` state persist via localStorage so they survive app restarts.

Sort is scoped to Inbox only — Folder episode lists remain in their existing DB order.

## Acceptance criteria

- [ ] Inbox header has a chevron that toggles collapse/expand of the Inbox episode list
- [ ] Collapsed state hides all Inbox episodes; expanded state shows them
- [ ] Sort label displays the current sort mode (e.g. "Newest") to the right of the count badge
- [ ] Clicking the sort label cycles: Newest → Oldest → Longest → Newest
- [ ] Episodes in Inbox are sorted by `created_at` descending (Newest), `created_at` ascending (Oldest), or `duration_sec` descending (Longest)
- [ ] Episodes with null `duration_sec` sort to the bottom when sorting by Longest
- [ ] Both `inboxSort` and `inboxCollapsed` persist in localStorage and restore on app relaunch
- [ ] Folders section is unaffected by sort controls

## Blocked by

None - can start immediately
