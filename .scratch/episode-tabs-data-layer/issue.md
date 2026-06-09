---
title: "Episode tabs data layer: schema, TabService, IPC"
status: ready-for-agent
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

The data layer for per-episode dynamic content tabs. This includes the database schema, a TabService with CRUD operations, and IPC handlers for renderer communication.

End-to-end behavior:
- An `episode_tabs` table stores tabs per episode with: id, episode_id, recipe_id (nullable for blank tabs), tab_name, content, is_pipeline flag, position, timestamps.
- TabService provides: `getTabs(episodeId)`, `createTab(episodeId, options)`, `updateTabContent(tabId, content)`, `deleteTab(tabId)`, `renameTab(tabId, name)`, `reorderTabs(episodeId, tabIds[])`.
- Pipeline tabs (is_pipeline=1) cannot be deleted via `deleteTab()`.
- Creating a tab from a recipe sets recipe_id and uses the recipe name as tab_name.
- Creating a blank tab sets recipe_id to null and tab_name to "Untitled".
- Tab position is auto-assigned (append to end) on creation.
- IPC handlers registered for all TabService operations.
- A Zustand store slice (ContentTabStore) in the renderer holds tab state for the active episode, syncs with main process.

## Acceptance criteria

- [ ] `episode_tabs` table created via migration with columns: id, episode_id, recipe_id, tab_name, content, is_pipeline, position, created_at, updated_at
- [ ] TabService CRUD operations work (create, read, update content, delete, rename, reorder)
- [ ] Pipeline tab cannot be deleted (is_pipeline protection, throws or returns error)
- [ ] Creating tab from recipe populates recipe_id and tab_name from recipe name
- [ ] Creating blank tab sets recipe_id=null, tab_name="Untitled"
- [ ] Tab positions auto-increment on creation
- [ ] IPC handlers for: `tabs:get(episodeId)`, `tabs:create(episodeId, options)`, `tabs:update-content(tabId, content)`, `tabs:delete(tabId)`, `tabs:rename(tabId, name)`
- [ ] ContentTabStore in renderer: holds tabs array, activeTabId, manages loading/syncing
- [ ] Content updates from renderer are debounced (500ms) before IPC persist
- [ ] Switching episodes loads that episode's tabs from the database
- [ ] All tests pass using TDD

## Blocked by

- `.scratch/recipe-data-layer/issue.md`
