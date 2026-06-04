---
title: Taller window drag region
status: done
created: 2026-06-04
---

## What to build

Increase the title bar / top toolbar drag region from the current 40px to ~48-50px, giving users more area to grab and drag the window. Adjust the traffic light position accordingly so it remains vertically centered in the taller bar.

The TabBar and any interactive elements within the toolbar must remain clickable (WebkitAppRegion: 'no-drag').

## Acceptance criteria

- [ ] Title bar height is 48px (up from 40px)
- [ ] Traffic light position is adjusted to remain vertically centered (~y:18-20)
- [ ] Window can be dragged from anywhere in the toolbar that isn't a button/tab
- [ ] All tabs and toolbar buttons remain fully clickable
- [ ] Layout does not shift or overflow due to the height change

## Blocked by

None - can start immediately
