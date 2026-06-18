---
title: "Appearance setting — dark/light/system toggle"
status: done
created: 2026-06-18
---

## What to build

Add an Appearance preference to Settings that lets users choose between Light, Dark, or System (follow OS). The setting persists across restarts and takes effect immediately without requiring a relaunch.

## Acceptance criteria

- [x] Settings UI shows a segmented toggle (System / Light / Dark) at the top of the page, after the License pane
- [x] Selecting an option immediately switches the app's color scheme
- [x] The value is persisted via `setSetting('appearance', value)` in the SQLite KV store
- [x] On startup, the saved appearance is applied before the window renders (no flash of wrong theme)
- [x] When set to `system`, the app follows the OS dark/light preference (existing CSS media query behavior)
- [x] No changes to existing CSS — Electron's `nativeTheme.themeSource` controls what `prefers-color-scheme` reports to the renderer

## Implementation

### Main process (`src/main/index.ts`)

- Read `db.getSetting('appearance')` after DB init, before `createWindow()`
- Set `nativeTheme.themeSource` to the saved value (defaults to `'system'`)
- In the `db:set-setting` IPC handler, intercept writes to the `appearance` key and update `nativeTheme.themeSource` live

### Settings UI (`src/renderer/src/components/SettingsView.tsx`)

- Added `appearance` state initialized from `getSetting('appearance')` on load
- Three-segment toggle rendered as inline-flex buttons with active/inactive visual states
- On click: updates local state and calls `setSetting('appearance', option)`

### No changes needed

- CSS (`main.css`) — already uses `@media (prefers-color-scheme: dark)` which responds to `nativeTheme` changes
- Preload — uses existing generic `getSetting` / `setSetting` IPC, no new channel needed

## Design decisions

- **Segmented toggle over dropdown** — three mutually exclusive options; toggle is faster to scan and operate
- **Placement after License pane** — appearance is a general app preference, should be visible before API/model config
- **nativeTheme approach over class toggling** — zero CSS changes, leverages Electron's native plumbing, future-proof for native window chrome theming
- **Read before window creation** — prevents flash; DB is synchronous SQLite so no async complexity
