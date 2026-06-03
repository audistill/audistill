---
title: "Search across all summary views"
status: ready-for-agent
created: 2026-06-03
---

## Parent

[PRD: Multi-tier Summary Views](.scratch/summary-views/issue.md)

## What to build

Update the `searchEpisodes` method in DatabaseService to search across all generated summary views in the `episode_summaries` table, in addition to episode titles. Results remain deduplicated at the episode level.

The current query searches `episodes.title` and `episodes.summary`. The new query should:
1. JOIN `episode_summaries` on `episode_id`.
2. Match the search pattern against `episodes.title` OR `episode_summaries.content`.
3. Return distinct episodes (deduplicated — an episode appears once even if multiple views match).
4. Maintain existing sort order (`created_at DESC`).

## Acceptance criteria

- [ ] `searchEpisodes(query)` matches against `episode_summaries.content` for all view types
- [ ] An episode with matches in multiple views appears only once in results
- [ ] Title matching still works (search by episode title)
- [ ] Episodes with no summaries yet can still appear if title matches
- [ ] Existing integration tests updated or new tests added for the JOIN behavior
- [ ] Query performance is acceptable (LEFT JOIN, not subquery per row)

## Blocked by

- [summary-db-schema](.scratch/summary-db-schema/issue.md)
