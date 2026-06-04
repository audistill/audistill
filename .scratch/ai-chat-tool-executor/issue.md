---
title: "ChatToolExecutor: read-only tools (transcript, summary, metadata, episodes)"
status: done
created: 2026-06-04
---

## Parent

`.scratch/ai-chat-and-canvas/issue.md`

## What to build

A main-process module that implements the 6 read-only tools the AI can call during a chat conversation. Each tool is a pure function that queries DatabaseService and returns a structured result.

Tools to implement:

1. **read_transcript(episode_id?)** — Returns the full transcript text for the specified episode (defaults to current). Returns an error message if the episode doesn't exist or has no transcript.

2. **search_transcript(query, episode_id?)** — Searches the transcript text for the query string. Returns matching lines/segments with their approximate timestamps (parsed from the JSON timestamp format the app uses). Case-insensitive.

3. **search_episodes(query)** — Searches across all episodes by title and summary content (reuses the existing `searchEpisodes` DB method). Returns a list of matching episodes with id, title, duration, and date.

4. **list_episodes(folder_id?)** — Returns all episodes (or filtered by folder) with id, title, duration, date, and status. Only includes completed episodes.

5. **read_summary(episode_id?, view_type)** — Returns the summary content for the specified view type ('brief', 'detailed', 'full'). Returns error if not yet generated.

6. **read_episode_metadata(episode_id?)** — Returns structured metadata: title, filename (basename of file_path), duration formatted as HH:MM:SS, date, folder name.

The module exposes a single dispatch function: `executeTool(toolName: string, args: Record<string, unknown>, context: { currentEpisodeId: string }) => Promise<string>`. This is what ChatService calls during the tool-call loop.

Each tool returns its result as a JSON string (for the LLM to consume as a tool response).

## Acceptance criteria

- [ ] All 6 tools implemented and callable via a single `executeTool` dispatch function
- [ ] `read_transcript` returns transcript text or clear error for missing/no-transcript episodes
- [ ] `search_transcript` finds matching segments case-insensitively and includes timestamp context
- [ ] `search_episodes` returns matching episodes with key metadata
- [ ] `list_episodes` returns completed episodes, filterable by folder
- [ ] `read_summary` returns the correct summary view content or error if not generated
- [ ] `read_episode_metadata` returns all metadata fields in a structured format
- [ ] Default `episode_id` parameter falls back to `context.currentEpisodeId` when omitted
- [ ] Unit tests cover each tool: happy path, missing data, edge cases (empty transcript, no summaries)
- [ ] Tests use a real SQLite database (in-memory) with test fixtures, not mocks

## Blocked by

- `.scratch/ai-chat-service/issue.md`
