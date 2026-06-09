---
title: "Data migration: episode_summaries + canvas → episode_tabs"
status: ready-for-agent
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

A database migration that moves existing data from `episode_summaries` and `episode_canvas` tables into the new `episode_tabs` table, preserving all user content.

End-to-end behavior:
- On app startup (after the new tables exist), a migration runs that:
  1. For each episode with a `brief` summary in `episode_summaries` (status=complete): creates a pipeline tab (is_pipeline=1, position=0) in `episode_tabs` with that content. Links to the Brief recipe via recipe_id.
  2. For each episode with a `detailed` summary (status=complete, content not empty): creates an additional tab (position=1) named "Detailed Notes" linked to the Detailed recipe.
  3. For each episode with a `full` summary (status=complete, content not empty): creates an additional tab (position=2) named "Full Notes" linked to the Full recipe.
  4. For each episode with content in `episode_canvas`: creates an additional tab named "Canvas" (no recipe_id, treated as a user-authored blank tab) at the next position.
  5. After successful migration, the old tables (`episode_summaries`, `episode_canvas`) are dropped.
- The migration is idempotent — if `episode_tabs` already has data for an episode, it skips that episode.
- Settings migration: if user had `model_fast` set, that becomes the Brief recipe's model_override. If `model_quality` was set, store it as the new global "Default Model" setting. The `custom_instructions` value is discarded (user can re-add to individual recipes if desired) OR appended to built-in recipe prompts — TBD based on simplicity during implementation.
- Episodes that only had `generating` or `error` status summaries get no tabs migrated (the pipeline will re-generate on next open if needed).

## Acceptance criteria

- [ ] Brief summaries (status=complete) migrated to pipeline tabs with correct recipe_id
- [ ] Detailed summaries (status=complete, non-empty) migrated to separate tabs
- [ ] Full summaries (status=complete, non-empty) migrated to separate tabs
- [ ] Canvas content migrated to "Canvas" tabs (no recipe_id)
- [ ] Tab positions assigned correctly (pipeline=0, then by type order)
- [ ] Old tables (`episode_summaries`, `episode_canvas`) dropped after migration
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Episodes with no complete summaries get no migrated tabs
- [ ] Settings migrated: model_fast → Brief model_override, model_quality → default model
- [ ] All tests pass using TDD (test migration with fixture data)

## Blocked by

- `.scratch/recipe-data-layer/issue.md`
- `.scratch/episode-tabs-data-layer/issue.md`
