---
title: "PRD: Multi-tier Summary Views (Brief / Detailed / Full)"
status: ready-for-agent
created: 2026-06-03
---

## Problem Statement

Users process diverse audio content (podcasts, meetings, training sessions, lectures) and need different levels of detail depending on their intent. The current single "Rundown" summary works for quick scanning but is insufficient for users who need comprehensive reference material or a full written alternative to listening. There is no way to get more or less detail from a processed episode without re-prompting externally.

## Solution

Introduce three summary view tiers — **Brief**, **Detailed**, and **Full** — selectable via a segmented control in the episode view. The default view is generated at ingest time (configurable in settings). Additional views are generated on-demand when the user switches to a tab that hasn't been generated yet. Each view uses a dedicated prompt template with dynamic, language-matched section headings and scaling word count guidance.

## User Stories

1. As a user, I want to choose between Brief, Detailed, and Full summary views per episode, so that I get the right level of detail for my current need.
2. As a user, I want to set a default summary view in settings, so that new episodes are automatically summarized at my preferred detail level.
3. As a user, I want the default view generated automatically at ingest time, so that I don't have to manually trigger summarization.
4. As a user, I want non-default views generated on-demand when I switch tabs, so that I don't waste API tokens on views I never read.
5. As a user, I want to see a loading skeleton when a view is being generated, so that I know something is happening without blocking my workflow.
6. As a user, I want to navigate away during on-demand generation and find the result when I return, so that I'm not forced to wait.
7. As a user, I want the segmented control to visually indicate which views are already generated vs. which will trigger generation, so that I have clear expectations before clicking.
8. As a user, I want to regenerate an existing summary view, so that I can get a fresh result after changing my custom instructions or if the first output was poor.
9. As a user, I want summaries in the same language as my audio content with appropriate section headings, so that the output feels native regardless of language.
10. As a user, I want the Brief view to give me a quick scannable overview (150-400 words), so that I can triage many episodes quickly.
11. As a user, I want the Detailed view to organize key information into topical sections with bullet points (500-1500 words), so that I can reference specifics without reading the transcript.
12. As a user, I want the Full view to provide comprehensive chapter-style notes (2000-5000 words), so that I can use it as a written substitute for listening to the full recording.
13. As a user, I want my custom instructions to apply equally across all summary views, so that domain-specific context is always respected.
14. As a user, I want search to find matches across all generated views for an episode, so that detailed information captured in longer summaries is still discoverable.
15. As a user, I want changing my default view in settings to only affect future episodes, so that I don't lose existing summaries or trigger unexpected regeneration.
16. As a user processing meeting recordings, I want the AI to detect appropriate sections (action items, decisions, attendees) rather than forcing podcast-style headings, so that the output matches my content type.
17. As a user processing training sessions, I want the AI to structure output with relevant sections (key concepts, exercises, references) automatically, so that the summary serves as study material.
18. As a new user who hasn't configured preferences, I want Brief as the default, so that my first experience is fast and lightweight.

## Implementation Decisions

### Database Schema

New `episode_summaries` table replaces the `summary` column on episodes:

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

The `summary` column on `episodes` is dropped (no migration of existing data needed — prototype reset).

The `title` remains on the `episodes` table — generated once with the default view and shared across all views.

### Prompt Templates

Three separate prompt files in `src/main/prompts/`:
- `brief.txt` — Quick overview. 150-400 words. Lead sentence, key bullets, significance.
- `detailed.txt` — Structured reference. 500-1500 words. Multiple topical sections with bullets, auto-detected from content.
- `full.txt` — Comprehensive notes. 2000-5000 words. Chapter-style with narrative paragraphs, all key information extracted.

All prompts share these rules:
- Match the language of the transcript (section headings included — no hardcoded English headings).
- Dynamic section headings chosen by the LLM based on content type (meeting, lecture, interview, etc.).
- Scaling guidance: aim for roughly 10-20% of transcript length, within the tier's word range.
- Be specific: names, numbers, comparisons, concrete details.
- Return JSON with `"title"` and `"summary"` fields.

Custom instructions are appended to whichever prompt is active.

### SummarizationService Changes

- `summarize(transcript: string, viewType: 'brief' | 'detailed' | 'full')` — loads the corresponding prompt template, appends custom instructions, calls OpenRouter.
- Title is only used from the response when generating the episode's first summary (episode has no title yet). Subsequent view generations ignore the returned title.
- Prompt templates loaded from files at service initialization.

### On-Demand Generation Flow

When the user switches to a view that doesn't exist in `episode_summaries`:
1. Insert a row with `status: 'generating'` immediately.
2. Emit `summary-updated` event to renderer (triggers skeleton UI).
3. Call `SummarizationService.summarize()` with the episode's transcript and requested view type.
4. On success: update row with `status: 'complete'`, `content: result.summary`.
5. On failure: update row with `status: 'error'`, `error_message`.
6. Emit `summary-updated` event again.

The episode's top-level `status` is never modified during on-demand generation — it stays `complete`.

### Ingest Pipeline Changes

The ingest pipeline's summarization step now:
1. Reads the user's default view setting (`default_summary_view`, defaults to `brief`).
2. Calls `summarize(transcript, defaultViewType)`.
3. Inserts into `episode_summaries` with the appropriate view type.
4. Updates `episodes.title` from the response.

### Settings Addition

New setting: `default_summary_view` — stored in the `settings` table. Values: `brief`, `detailed`, `full`. Default: `brief`.

UI: A segmented control or dropdown in SettingsView labeled "Default summary view" with options Brief, Detailed, Full.

### UI: Episode View Summary Section

Replace the current static summary rendering with:
1. **Segmented control** (right-aligned in summary header): Brief | Detailed | Full.
2. Tabs with generated content display normally.
3. Tabs without generated content are visually dimmed (lower opacity or subtle indicator).
4. Active tab shows content via existing Markdown renderer.
5. If active tab is `generating` status: show shimmer/skeleton in the content area.
6. If active tab is `error` status: show error message with retry button.
7. **Regenerate button**: small refresh icon adjacent to the segmented control. Triggers re-generation of the currently active view (overwrites existing content).

### IPC Surface Changes

New IPC methods:
- `getSummaries(episodeId: string): EpisodeSummary[]`
- `generateSummary(episodeId: string, viewType: string): void` (triggers on-demand generation)
- `regenerateSummary(episodeId: string, viewType: string): void`

New IPC event:
- `summary-updated` — emitted when a summary row changes (generation starts, completes, or errors). Payload: `{ episodeId, viewType, status, content? }`.

### Search Changes

`searchEpisodes(query)` is updated to JOIN against `episode_summaries` and match across all generated views for an episode. Results remain deduplicated at the episode level.

### Store Changes

App store updated to hold summaries per episode keyed by view type:
```
summaries: Record<episodeId, Record<viewType, { content: string, status: string }>>
```

## Testing Decisions

Good tests verify external behavior through module interfaces. Tests should be runnable without the Whisper model file and without hitting real APIs.

### Modules to test:

1. **DatabaseService** — Integration tests with in-memory SQLite. Verify:
   - `episode_summaries` table CRUD operations
   - UNIQUE constraint on `(episode_id, view_type)` is enforced
   - Cascading delete removes summaries when episode is deleted
   - `searchEpisodes` queries across all view types in `episode_summaries`
   - `getSummaries(episodeId)` returns all views for an episode
   - Status transitions (`generating` → `complete`, `generating` → `error`)

   Prior art: existing tests in this repo use vitest with in-memory SQLite.

2. **SummarizationService** — Unit tests with mocked HTTP (msw or similar). Verify:
   - Correct prompt template is loaded based on `viewType` parameter
   - Custom instructions are appended to all three templates
   - JSON response parsing extracts title and summary
   - Handles malformed JSON gracefully
   - Each prompt file produces structurally valid prompt text when combined with a transcript

### Modules NOT tested:

- **Renderer UI** — Validated by running the app. No component tests at this stage.
- **On-demand coordinator** — Thin orchestration layer, tested implicitly via manual testing.
- **Preload/IPC** — Relay layer, tested implicitly.

## Out of Scope

- Per-tier custom instructions (one shared instruction applies to all views)
- Per-tier model selection (one model for all views)
- Batch regeneration of existing episodes when default changes
- Timestamps or transcript position references in summaries
- Version history for regenerated summaries
- Sidebar progress indication for on-demand generation
- Custom/user-defined prompt templates (future consideration)
- Export summaries to external formats
- Confirmation dialog before on-demand generation

## Further Notes

- **Content-type agnostic:** Prompts must work for any audio source (podcasts, meetings, trainings, lectures, interviews). Section heading detection is left to the LLM with examples in the prompt of various content types.
- **Language handling:** All three prompts instruct the LLM to match transcript language for everything including section headings. No English is hardcoded in prompt output structure.
- **Token cost awareness:** Brief is cheapest (~150-400 word output), Full is most expensive (~2000-5000 word output). The default of Brief minimizes cost for users who don't actively choose otherwise.
- **Future extensibility:** The `episode_summaries` table and view-type architecture supports adding custom prompt templates later without schema changes — just add new valid values to the `view_type` check constraint.
- **Prototype scope:** No data migration needed. Existing episodes will be manually cleared before this feature ships.
