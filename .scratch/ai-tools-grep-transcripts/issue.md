---
title: Add grep_transcripts tool for cross-episode regex search
status: done
created: 2026-06-14
---

## Parent

.scratch/ai-chat-tools-v2/issue.md

## What to build

Add a `grep_transcripts` tool that searches across all episodes' transcripts in a single call, with optional regex support and surrounding context segments. This is the highest-value search tool — it turns "which episodes mentioned X?" from a multi-tool-call loop into one call.

**Params:**
- `pattern` (string, required) — search term or regex
- `is_regex` (boolean, default false) — whether to treat pattern as a regex
- `context_segments` (number, default 2) — number of segments before/after match to include
- `episode_ids` (string[], optional) — limit search to specific episodes
- `folder_id` (string, optional) — limit search to a folder
- `max_results` (number, default 20) — cap total results

**Returns:** Array of `{ episode_id, episode_title, timestamp, matched_text, context_before, context_after }`

Transcripts are stored as JSON arrays of `{ timestamp, text }` segments. The tool must parse each episode's transcript and search segment-by-segment. For plain-text transcripts (non-JSON), fall back to line-by-line search.

## Acceptance criteria

- [ ] Plain text search finds matches across multiple episodes
- [ ] Regex search works when `is_regex: true` (e.g. `"LLM|large language model"`)
- [ ] Invalid regex returns an error rather than crashing
- [ ] `context_segments` returns N segments before and after each match
- [ ] `episode_ids` filter limits search to specified episodes only
- [ ] `folder_id` filter limits search to episodes in that folder
- [ ] Results are capped at `max_results`
- [ ] Handles episodes with no transcript gracefully (skips them)
- [ ] Handles plain-text (non-JSON) transcripts as fallback
- [ ] Tests follow the existing `chat-tool-executor.test.ts` pattern

## Blocked by

- .scratch/ai-tools-refactor-services-bag/issue.md
