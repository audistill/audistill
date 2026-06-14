---
title: Fix search_episodes — add transcript search and match snippets
status: done
created: 2026-06-14
---

## Parent

.scratch/ai-chat-tools-v2/issue.md

## What to build

Fix the `search_episodes` tool so it actually finds episodes where a term appears in the transcript. Currently it only searches `episodes.title`, `episode_summaries.content`, and `episode_tabs.content` — missing the primary content source.

Changes:
1. Add `episodes.transcript LIKE ?` to the WHERE clause in `DatabaseService.searchEpisodes()`
2. Remove the LEFT JOIN on `episode_summaries` — this table is vestigial and no longer the active content path
3. Return a `snippet` field (~150 characters of context around the first match) and a `matched_in` field (`"title"`, `"transcript"`, or `"tab:<name>"`) in each search result so the AI knows why it matched

The executor's `searchEpisodes` method and the tool definition description in the renderer should be updated to reflect the enhanced return shape.

## Acceptance criteria

- [ ] Searching for a term that only exists in a transcript returns that episode
- [ ] The `episode_summaries` JOIN is removed from the query
- [ ] Each result includes a `snippet` field with ~150 chars of context around the match
- [ ] Each result includes a `matched_in` field indicating the match source
- [ ] Existing search-by-title and search-by-tab-content behavior is preserved
- [ ] Tests cover: transcript-only match, title match, tab content match, snippet content, matched_in values

## Blocked by

None - can start immediately
