---
title: "Inbox Date Group Dividers"
status: done
created: 2026-06-14
---

## Parent

.scratch/mvp-inbox-sort-url-drop-paste-import/issue.md

## What to build

Add date-based group dividers to the Inbox episode list. A pure function buckets episodes into three groups based on `created_at`: "Today" (same calendar day), "This Week" (within last 7 days excluding today), and "Earlier" (everything else).

When the Inbox sort mode is Newest or Oldest, render thin horizontal dividers between groups with centered labels in the existing secondary text style (`text-[10px] text-[var(--secondary)]`). When sort mode is Longest, render a flat list with no dividers (duration sort doesn't map to date groups).

Empty groups are not shown (e.g. if no episodes are from today, the "Today" divider is omitted).

## Acceptance criteria

- [ ] Pure sort/group function exists that takes `Episode[]` + sort mode and returns grouped buckets `{ label: string, episodes: Episode[] }[]`
- [ ] Date bucketing: "Today" = same calendar day, "This Week" = last 7 days excluding today, "Earlier" = everything else
- [ ] Dividers render between non-empty groups when sort is Newest or Oldest
- [ ] No dividers render when sort is Longest (flat sorted list)
- [ ] Empty groups are omitted (no empty "Today" section if there are no episodes from today)
- [ ] Divider styling matches existing secondary text: thin rule with centered small text
- [ ] Unit tests cover: all-today episodes, mixed buckets, empty list, null duration handling, oldest-first ordering within groups

## Blocked by

- .scratch/inbox-collapsible-sort-state/issue.md
