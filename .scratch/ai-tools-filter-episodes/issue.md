---
title: Add filter_episodes tool for structured metadata filtering
status: done
created: 2026-06-14
---

## Parent

.scratch/ai-chat-tools-v2/issue.md

## What to build

Add a `filter_episodes` tool that filters episodes by structured metadata criteria. This complements the free-text `search_episodes` tool — it handles "show me all YouTube episodes from last month that are over an hour" without requiring content matching.

**Params (all optional, combined as AND):**
- `folder_id` (string) — filter to a specific folder; null = Inbox only
- `date_from` (string) — ISO date, episodes created on or after
- `date_to` (string) — ISO date, episodes created on or before
- `duration_min` (number) — minimum duration in seconds
- `duration_max` (number) — maximum duration in seconds
- `source_type` (string) — one of: local, youtube, rss, direct
- `has_transcript` (boolean) — filter to episodes that have/lack a transcript

**Returns:** Array of `{ id, title, duration, date, folder, source_type }` for matching episodes.

Implement a new `filterEpisodes` method on `DatabaseService` that builds a dynamic WHERE clause from the provided filters. The executor case delegates to this method.

## Acceptance criteria

- [ ] Each filter param narrows results correctly when provided alone
- [ ] Multiple filters combine as AND (all must match)
- [ ] `folder_id: null` returns only Inbox episodes (folder_id IS NULL)
- [ ] Date range filtering works with ISO date strings
- [ ] Duration filtering works with seconds values
- [ ] `source_type` filter matches the episode's source_type field
- [ ] `has_transcript: true` returns only episodes where transcript is not null/empty
- [ ] Returns all complete episodes when no filters are provided
- [ ] Error handling for invalid date formats or unknown source_type values
- [ ] Tests cover individual filters and combined filters
- [ ] Tests follow the existing `chat-tool-executor.test.ts` pattern

## Blocked by

- .scratch/ai-tools-refactor-services-bag/issue.md
