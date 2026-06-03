---
title: "DB schema: episode_summaries table + CRUD methods + tests"
status: done
created: 2026-06-03
---

## Parent

[PRD: Multi-tier Summary Views](.scratch/summary-views/issue.md)

## What to build

Introduce the `episode_summaries` table and remove the `summary` column from the `episodes` table. This is the data foundation for multi-tier summaries.

Schema:

```sql
CREATE TABLE IF NOT EXISTS episode_summaries (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  view_type TEXT NOT NULL CHECK (view_type IN ('brief', 'detailed', 'full')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'complete', 'error')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(episode_id, view_type)
);
```

Add DatabaseService methods:
- `createSummary(episodeId, viewType, status?)` — inserts a row (status defaults to `generating`)
- `updateSummary(episodeId, viewType, fields)` — updates content, status, error_message
- `getSummaries(episodeId)` — returns all summary rows for an episode
- `getSummary(episodeId, viewType)` — returns a single summary row or undefined

Remove the `summary` column from the `episodes` table definition. Remove `summary` from the `Episode` interface, `updateEpisode` allowed fields, and `searchEpisodes` (search will be handled in a separate slice).

## Acceptance criteria

- [ ] `episode_summaries` table is created in `DatabaseService.init()`
- [ ] `summary` column no longer exists on the `episodes` table
- [ ] `Episode` interface no longer has a `summary` field
- [ ] `createSummary`, `updateSummary`, `getSummaries`, `getSummary` methods exist and work
- [ ] UNIQUE constraint on `(episode_id, view_type)` is enforced (attempting duplicate insert throws)
- [ ] Cascading delete: deleting an episode removes its summaries
- [ ] Status transitions work: `generating` → `complete`, `generating` → `error`
- [ ] Integration tests (vitest, in-memory SQLite) cover all of the above
- [ ] Renderer store `Episode` type updated (remove `summary` field)
- [ ] Any existing references to `episode.summary` in the renderer compile without error (can render `null`/empty for now)

## Blocked by

None - can start immediately.
