---
title: "Pipeline recipe execution on ingest"
status: done
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

Wire the ingest pipeline to execute the designated pipeline recipe after transcription completes, creating the auto-generated pipeline tab for the episode.

End-to-end behavior:
- When transcription finishes and episode status moves to `summarizing`, the pipeline reads the `pipeline_recipe_id` setting to determine which recipe to run.
- RecipeService.executeRecipe() is called with that recipe and the transcript.
- A pipeline tab (is_pipeline=1) is created in `episode_tabs` before generation starts (status tracking via the tab's content being empty → streaming → final).
- Tokens stream into the pipeline tab. The renderer receives IPC events and updates the tab content live.
- On completion, the tab content is the full generated markdown. The episode title is extracted from the JSON response (same as current behavior — recipe output includes title + summary fields).
- On error, the tab shows an error state with a retry button.
- The existing SummarizationService code path is removed/replaced by this new flow.
- Broadcasting pattern: `tab:stream-start(tabId)`, `tab:stream-token(tabId, token)`, `tab:stream-end(tabId)`, `tab:stream-error(tabId, message)`.

## Acceptance criteria

- [ ] After transcription completes, the pipeline recipe is fetched from settings
- [ ] RecipeService executes the pipeline recipe against the transcript
- [ ] A pipeline tab is created for the episode before generation begins
- [ ] Streaming tokens are forwarded to the renderer via IPC events
- [ ] Renderer updates the pipeline tab content live during streaming
- [ ] On completion, tab holds full generated content and episode title is updated
- [ ] On error, tab shows error state with retry capability
- [ ] Old SummarizationService call path in the ingest flow is removed
- [ ] Old `summary:generate` / `summary:regenerate` IPC handlers are replaced by tab-based equivalents
- [ ] Regenerate works: user can trigger re-execution of the pipeline recipe on the pipeline tab
- [ ] All tests pass using TDD

## Blocked by

- `.scratch/recipe-data-layer/issue.md`
- `.scratch/episode-tabs-data-layer/issue.md`
