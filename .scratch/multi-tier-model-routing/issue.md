---
title: "Multi-tier model routing for summarization and chat"
status: done
created: 2026-06-08
---

## Problem Statement

The app currently uses a single model for all summarization views and chat. Brief summaries don't need expensive models — they're short, structured extractions. But detailed/full summaries and chat require strong reasoning to handle complex, knowledge-dense content well. Users pay for quality they don't need on brief views, and get subpar results on detailed views if they've picked a cheap default.

## Solution

Introduce a two-tier model system: a "fast" model for brief summaries and a "quality" model for detailed summaries, full summaries, and chat. The app auto-routes based on view type — no per-request model decision needed from the user. Settings exposes two model pickers with clear labels explaining where each is used.

## User Stories

1. As a user, I want brief summaries to use a cheap fast model, so that I don't waste money on simple extractions.
2. As a user, I want detailed and full summaries to use a quality model, so that complex topics are handled well.
3. As a user, I want chat to always use the quality model, so that follow-up questions get thoughtful responses.
4. As a user, I want to configure which model is used for each tier independently, so that I can upgrade to better models as I see fit.
5. As a user, I want sensible defaults for both tiers, so that the app works well out of the box without model research.
6. As a user, I want to see which tier a view type uses before generating, so that I understand the cost implication of clicking Generate.
7. As a user, I want cached summaries to load instantly when switching tabs, so that I only pay for generation once per view type.
8. As a user, I want a regenerate action to re-run with the current tier model, so that I can get a fresh summary if I've changed models.
9. As a user, I want uncached view tabs to be visually distinct from cached ones, so that I know which clicks are free and which trigger an API call.
10. As a user, I want an explicit Generate button (not auto-fire on tab click) for uncached views, so that I'm never surprised by unintended API usage.

## Implementation Decisions

### Settings keys

Replace the single `summarization_model` setting with two keys:
- `model_fast` — default: `google/gemini-3.1-flash-lite`
- `model_quality` — default: `google/gemini-3.5-flash`

The old `summarization_model` key becomes unused (no migration needed — prototype).

### Model routing in SummarizationService

`SummarizationService.summarize()` resolves the model based on view type:
- `brief` → reads `model_fast` setting
- `detailed` | `full` → reads `model_quality` setting

This is the only place routing logic lives. The IPC handlers and renderer don't need to know about tiers — they pass the view type and the service resolves the model internally.

### Chat sidebar model default

The chat sidebar currently falls back to `summarization_model`. Change the fallback chain to read `model_quality` instead. The user can still override per-session via the existing model picker in the chat header.

### Settings UI

Replace the single "Model" picker with two pickers:
- **"Brief Summary Model"** — subtitle: "Used for brief summaries"
- **"Detailed & Chat Model"** — subtitle: "Used for detailed, full summaries and chat"

Each picker uses the same searchable combobox pattern already in place.

### Summary caching (already in place)

The existing DB-backed summary cache (`summaries` table, keyed by episode + view type) already prevents re-generation on tab switch. No changes needed — the cache is already respected by the `summary:generate` IPC handler which returns early if a summary exists.

### UX: explicit generation (already implemented)

Tabs for uncached views show a sparkle icon. Clicking an uncached tab shows an interstitial with a "Generate" button and tier hint ("Uses your fast model" / "Uses your quality model") instead of auto-firing the API. This was implemented ahead of this PRD.

## Testing Decisions

### What makes a good test here

Tests should verify the external contract of model routing: given a view type, the correct settings key is read. They should NOT test HTTP calls, streaming, or prompt content — those are separate concerns already in the service.

### Module to test: SummarizationService

Test the model resolution logic:
- `brief` view type reads `model_fast` from the database
- `detailed` view type reads `model_quality` from the database
- `full` view type reads `model_quality` from the database
- Fallback defaults are used when settings are not configured

### Prior art

The `test-model-manager` and `backend-tests` issues in `.scratch/` indicate the project uses direct unit tests against service classes with a mocked `DatabaseService`. Follow the same pattern: inject a stub DB, assert the service reads the correct key.

## Out of Scope

- Per-request cost tracking or token usage display
- Model badge/indicator on generated summaries
- Automatic model recommendations based on transcript length or complexity
- Migration from old `summarization_model` key (not needed — prototype)
- Changing the chat sidebar's per-session model override UX (it stays as-is)
- Model validation (checking if selected model supports JSON mode or tool calling)

## Further Notes

The tier hint in the generate interstitial currently shows generic "Uses your fast/quality model" text. A future enhancement could show the actual model name (e.g. "Uses Gemini 3.1 Flash Lite") but this adds coupling between renderer and settings that isn't needed now.
