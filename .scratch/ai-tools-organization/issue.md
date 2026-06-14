---
title: Add organizational tools (list_folders, create_folder, move_episode, rename_episode)
status: done
created: 2026-06-14
---

## Parent

.scratch/ai-chat-tools-v2/issue.md

## What to build

Add four Library organization tools to the AI Chat so users can manage their episodes through conversation. All four delegate to existing `DatabaseService` methods — no new backend logic is needed.

**Tools:**

- `list_folders` — returns all folders with id, name, parent_id. No params.
- `create_folder` — creates a new folder. Params: `name` (required), `parent_id` (optional). Returns the new folder ID.
- `move_episode` — moves an episode to a folder or back to Inbox. Params: `episode_id` (defaults to current), `folder_id` (required, null = Inbox).
- `rename_episode` — renames an episode. Params: `episode_id` (defaults to current), `title` (required).

Each tool needs: a tool definition entry in the `TOOL_DEFINITIONS` array, and an executor case in `ChatToolExecutor`.

## Acceptance criteria

- [ ] `list_folders` returns all folders with id, name, and parent_id
- [ ] `create_folder` creates a folder and returns its ID
- [ ] `create_folder` supports optional `parent_id` for nested folders
- [ ] `move_episode` moves an episode to a specified folder
- [ ] `move_episode` with null folder_id moves episode to Inbox
- [ ] `rename_episode` updates the episode title
- [ ] All tools default to current episode when `episode_id` is not provided
- [ ] Error cases are handled: missing required params, non-existent episode/folder
- [ ] Tests follow the existing `chat-tool-executor.test.ts` pattern

## Blocked by

- .scratch/ai-tools-refactor-services-bag/issue.md
