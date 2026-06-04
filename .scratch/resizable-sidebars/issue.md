---
title: Resizable sidebars with snap-close
status: done
created: 2026-06-04
---

## What to build

Add drag-to-resize handles between the left sidebar and content pane, and between the content pane and right sidebar. Users can grab the divider edge and drag to resize either sidebar within defined constraints. If a user drags aggressively past the minimum width (~50px below min), the sidebar snaps closed. Reopening (via Cmd+B / Cmd+Shift+L) restores the last-used width.

Constraints:
- Left sidebar: min 200px, max 400px (default 280px)
- Right sidebar: min 300px, max 600px (default 360px)
- No cross-session persistence — widths reset to defaults on app restart

This requires:
- Zustand store additions: `leftSidebarWidth`, `rightSidebarWidth`, setters
- A new ResizableHandle component that handles mousedown/mousemove/mouseup, computes constrained width, and emits snap-close when threshold exceeded
- App.tsx layout changes to use dynamic widths instead of fixed Tailwind classes

## Acceptance criteria

- [ ] Left sidebar can be resized by dragging its right edge between 200px and 400px
- [ ] Right sidebar can be resized by dragging its left edge between 300px and 600px
- [ ] Dragging ~50px past minimum snaps the sidebar closed (same as toggle)
- [ ] Reopening a snapped-closed sidebar restores its last-used width
- [ ] Resize handle shows a visible cursor change on hover (col-resize)
- [ ] Content pane fills remaining space dynamically during resize
- [ ] Unit tests cover constraint clamping logic and snap-close threshold

## Blocked by

None - can start immediately
