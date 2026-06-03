---
title: "Ingest pipeline: use default summary view + settings UI"
status: done
created: 2026-06-03
---

## Parent

[PRD: Multi-tier Summary Views](.scratch/summary-views/issue.md)

## What to build

Wire the ingest pipeline's summarization step to use the new multi-tier SummarizationService and write results to the `episode_summaries` table. Add a "Default summary view" setting to the SettingsView UI.

Ingest pipeline changes:
1. Read `default_summary_view` from settings (default to `brief` if not set).
2. Call `summarize(transcript, defaultViewType)` instead of the old `summarize(transcript)`.
3. Insert the result into `episode_summaries` via `createSummary(episodeId, viewType)` then `updateSummary(...)` with content and status `complete`.
4. Continue to set `episodes.title` from the response (only when episode has no title).
5. Remove the old `updateEpisode(..., { summary })` call.

Settings:
- New setting key: `default_summary_view` with values `brief`, `detailed`, `full`.
- SettingsView UI: add a segmented control or dropdown labeled "Default summary view" with options Brief, Detailed, Full. Reads/writes via `getSetting`/`setSetting`.
- Default value when not yet configured: `brief`.

## Acceptance criteria

- [ ] Ingest pipeline reads `default_summary_view` setting before summarizing
- [ ] Ingest calls `summarize(transcript, viewType)` with the user's chosen default
- [ ] Summary result is written to `episode_summaries` table (not to `episodes.summary`)
- [ ] Episode title is still set on the `episodes` table from the response
- [ ] SettingsView has a "Default summary view" control with Brief/Detailed/Full options
- [ ] Setting persists across app restarts
- [ ] Changing the setting only affects future episodes (no batch regeneration)
- [ ] Default is `brief` for new users who haven't configured it

## Blocked by

- [summary-db-schema](.scratch/summary-db-schema/issue.md)
- [summary-prompt-templates](.scratch/summary-prompt-templates/issue.md)
