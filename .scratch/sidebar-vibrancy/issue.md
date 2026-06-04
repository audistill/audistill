---
title: Left sidebar vibrancy effect
status: done
created: 2026-06-04
---

## What to build

Add a native macOS frosted-glass/vibrancy effect to the left sidebar, similar to Finder and Notes. This gives the app a more native macOS feel.

Approach options (try in order):
1. Electron's `vibrancy` BrowserWindow option with `visualEffectState: 'active'` — but this applies to the entire window, so may need a secondary approach
2. CSS `backdrop-filter: blur()` with a semi-transparent background on the Sidebar component to simulate the frosted-glass effect on just the left panel

The effect should respect the current theme (dark/light) and not make text unreadable.

## Acceptance criteria

- [ ] Left sidebar has a frosted-glass/translucent appearance on macOS
- [ ] Text and icons in the sidebar remain clearly readable
- [ ] Effect works in both light and dark system themes
- [ ] Content pane and right sidebar are not affected by the vibrancy
- [ ] Performance is not noticeably impacted (no janky scroll or resize)

## Blocked by

None - can start immediately
