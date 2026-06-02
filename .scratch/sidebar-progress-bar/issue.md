---
title: Sidebar inline progress bar
status: ready-for-agent
created: 2026-06-03
---

## What to build

Add a slim progress bar to the sidebar episode list item when an episode is being transcribed. The bar reads percent from the Zustand progress store and renders as a thin horizontal fill indicator below the episode title. No text labels — just a visual bar that fills left-to-right.

## Acceptance criteria

- [ ] Progress bar appears on sidebar items whose episodeId exists in the progress store
- [ ] Bar width reflects current percent (0-100%)
- [ ] Bar disappears when progress entry is cleared (transcription complete or error)
- [ ] Bar does not interfere with existing sidebar layout (episode title, status dot)
- [ ] Smooth width transitions (CSS transition on width property)

## Blocked by

- `.scratch/progress-store-wiring`
