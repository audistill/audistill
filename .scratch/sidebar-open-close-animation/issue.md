---
title: Smooth sidebar open/close animation
status: done
created: 2026-06-04
---

## What to build

Add a ~200ms slide transition when sidebars open or close, replacing the current instant show/hide. When a sidebar opens, it slides in from the edge; when it closes (via toggle or snap-close), it slides out. The content pane should smoothly expand/contract to fill the freed space.

This should feel native to macOS — use an ease-out curve for opening and ease-in for closing.

## Acceptance criteria

- [ ] Left sidebar animates open/closed with ~200ms slide transition
- [ ] Right sidebar animates open/closed with ~200ms slide transition
- [ ] Content pane smoothly resizes during the animation (no jarring reflow)
- [ ] Animation does not interfere with drag-to-resize behavior
- [ ] Keyboard shortcuts (Cmd+B, Cmd+Shift+L) trigger the animated transition

## Blocked by

- .scratch/resizable-sidebars (sidebar rendering changes from conditional to width-based)
