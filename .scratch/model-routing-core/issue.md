---
title: "Core model routing in SummarizationService"
status: done
created: 2026-06-08
---

## Parent

[Multi-tier model routing for summarization and chat](../.scratch/multi-tier-model-routing/issue.md)

## What to build

Change the SummarizationService so that `summarize()` resolves the model based on view type instead of reading a single settings key:

- `brief` → read `model_fast` setting, default `google/gemini-3.1-flash-lite`
- `detailed` | `full` → read `model_quality` setting, default `google/gemini-3.5-flash`

The routing logic lives entirely within SummarizationService. The IPC handlers and renderer remain unchanged — they pass view type and the service resolves the correct model internally.

The old `summarization_model` key becomes unused.

## Acceptance criteria

- [ ] `brief` summarization uses the value from `model_fast` setting
- [ ] `detailed` summarization uses the value from `model_quality` setting
- [ ] `full` summarization uses the value from `model_quality` setting
- [ ] When `model_fast` is not set, defaults to `google/gemini-3.1-flash-lite`
- [ ] When `model_quality` is not set, defaults to `google/gemini-3.5-flash`
- [ ] No changes to the IPC interface or renderer

## Blocked by

None — can start immediately.
