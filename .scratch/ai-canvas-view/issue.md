---
title: "Canvas view: markdown editor with persistence"
status: done
created: 2026-06-04
---

## Parent

`.scratch/ai-chat-and-canvas/issue.md`

## What to build

The CanvasView component — a full markdown editor that replaces the placeholder introduced in the layout shell slice. It persists content per episode to SQLite.

End-to-end behavior:
- When the user switches to Canvas view (via the icon in the metadata row), they see a markdown editor.
- The editor has a Preview/Source segmented control in the same position where Brief/Detailed/Full appears in Episode view. Source mode shows a textarea for raw markdown editing. Preview mode renders the markdown as formatted HTML (read-only).
- When the canvas is empty, ghost placeholder text appears: "Ask the AI to create something, or start typing..."
- Any user edit auto-saves to the database immediately (debounced ~500ms). No explicit save button.
- Navigating away and returning to Canvas shows the persisted content.
- Switching episodes loads that episode's canvas content (or empty state if none exists).

Database changes:
- New `episode_canvas` table: `id TEXT PRIMARY KEY, episode_id TEXT UNIQUE REFERENCES episodes(id) ON DELETE CASCADE, content TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now'))`.
- New IPC handlers: `canvas:get-content(episodeId)`, `canvas:save-content(episodeId, content)`.
- DatabaseService gains `getCanvas(episodeId)` and `saveCanvas(episodeId, content)` methods.

Renderer:
- CanvasStore (Zustand slice or addition to app-store): holds `canvasContent`, `canvasMode` ('preview' | 'source'), `canvasLoading`.
- CanvasView component renders based on store state.
- Markdown rendering can reuse the same library already used for summary rendering.

## Acceptance criteria

- [ ] CanvasView replaces the placeholder from the layout shell slice
- [ ] Preview/Source segmented control in the same visual position as the summary segmented control
- [ ] Source mode: editable textarea, monospace font, fills available height
- [ ] Preview mode: rendered markdown, read-only, matches summary rendering style
- [ ] Ghost placeholder text visible when canvas is empty (disappears on first keystroke)
- [ ] Content auto-saves on edit (debounced); persists across navigation and app restart
- [ ] Each episode has independent canvas content
- [ ] `episode_canvas` table created in database migration
- [ ] IPC round-trip works: load on episode switch, save on edit
- [ ] No regressions to Episode view or summary display

## Blocked by

- `.scratch/ai-layout-shell/issue.md`
