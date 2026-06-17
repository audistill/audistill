---
title: "Starred Episodes — sidebar quick-access section"
status: done
created: 2026-06-17
---

## What to build

Add a Starred feature to the left sidebar that lets users mark Episodes for quick access. Starred is a cross-cutting shortcut — the Episode remains in its Folder/Inbox and additionally appears in a new "Starred" section at the top of the sidebar tree (between Search and Inbox). The section is collapsible, ordered newest-starred-first, and hidden when empty.

Entry points: a hover ★ icon on episode rows (primary) and a `Cmd+D` keyboard shortcut (power user). The star icon is a symmetric toggle — clicking it stars or unstars in any location.

Any Episode can be starred regardless of processing status.

## Acceptance criteria

- [ ] `episodes` table gains `is_starred` (INTEGER, default 0) and `starred_at` (TEXT, nullable) columns via migration
- [ ] IPC handlers expose `starEpisode(id)` and `unstarEpisode(id)` that toggle the columns (set `starred_at` to current ISO timestamp on star, null on unstar)
- [ ] App store gains `starEpisode` / `unstarEpisode` actions and derives a `starredEpisodes` list (filtered + sorted by `starred_at` descending)
- [ ] Sidebar renders a collapsible "Starred" section above Inbox, using the same two-line episode row component
- [ ] Section is hidden when no episodes are starred; appears immediately on first star
- [ ] Hovering an unstarred episode anywhere in the sidebar shows an outline ☆ icon at the right edge of the row
- [ ] Hovering a starred episode (in any section) shows a filled ★ icon; clicking it unstars
- [ ] In the original location (Inbox/Folder), starred episodes show a small muted filled ★ even without hover
- [ ] `Cmd+D` toggles star state on the currently active episode
- [ ] Starred episodes appear in both the Starred section and their original Inbox/Folder location
- [ ] Collapse state of the Starred section persists across app restarts
- [ ] Star state persists across app restarts (database-backed)

## Blocked by

None — can start immediately.
