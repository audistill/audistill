---
title: "Chat sidebar defaults to quality tier model"
status: done
created: 2026-06-08
---

## Parent

[Multi-tier model routing for summarization and chat](../.scratch/multi-tier-model-routing/issue.md)

## What to build

Change the chat sidebar's model fallback so it reads `model_quality` instead of `summarization_model`. The chat sidebar currently resolves its model as:

```
selectedModel || getSetting('summarization_model') || 'google/gemini-3.5-flash'
```

Change to:

```
selectedModel || getSetting('model_quality') || 'google/gemini-3.5-flash'
```

The per-session model override picker in the chat header stays unchanged — users can still pick any model for a specific conversation.

## Acceptance criteria

- [ ] Chat sidebar reads `model_quality` setting as its default model
- [ ] Fallback is `google/gemini-3.5-flash` when no setting exists
- [ ] Per-session model picker override still works
- [ ] No reference to `summarization_model` remains in chat code

## Blocked by

- [Core model routing in SummarizationService](../model-routing-core/issue.md)
