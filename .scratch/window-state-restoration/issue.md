---
title: Window state restoration
status: done
created: 2026-06-04
---

## What to build

Save the window's size and position when the app closes, and restore it on next launch. This is standard macOS app behavior — users expect their window to reappear where they left it.

Save window bounds (x, y, width, height) and maximized state. Store in the existing SQLite database (a simple key-value settings table already exists) or electron-store. Listen to `resize`, `move`, and `close` events on BrowserWindow, debounce saves (e.g., 500ms after last event).

On launch, read saved bounds. If the saved position is off-screen (e.g., external monitor disconnected), fall back to centering on the primary display.

## Acceptance criteria

- [ ] Window position and size persist across app restarts
- [ ] Maximized state is restored correctly
- [ ] If saved position is off-screen, window centers on primary display
- [ ] First launch (no saved state) uses default size (900x670, centered)
- [ ] Saves are debounced (not on every pixel of a resize drag)
- [ ] Unit tests cover save/restore logic and off-screen fallback

## Blocked by

None - can start immediately
