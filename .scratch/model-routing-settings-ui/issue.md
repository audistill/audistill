---
title: "Settings UI — two model pickers for fast and quality tiers"
status: done
created: 2026-06-08
---

## Parent

[Multi-tier model routing for summarization and chat](../.scratch/multi-tier-model-routing/issue.md)

## What to build

Replace the single model combobox in SettingsView with two independent model pickers:

1. **"Brief Summary Model"** — subtitle: "Used for brief summaries" — saves to `model_fast`
2. **"Detailed & Chat Model"** — subtitle: "Used for detailed, full summaries and chat" — saves to `model_quality`

Each picker uses the same searchable combobox pattern already in SettingsView (filter input, dropdown, click-to-select). Default values shown when no setting exists: `google/gemini-3.1-flash-lite` for fast, `google/gemini-3.5-flash` for quality.

## Acceptance criteria

- [ ] Two separate model pickers render in Settings
- [ ] Each has a label and subtitle explaining its usage
- [ ] Fast picker reads/writes `model_fast` setting
- [ ] Quality picker reads/writes `model_quality` setting
- [ ] Correct defaults shown when settings are empty
- [ ] Old single "Model" picker is removed

## Blocked by

- [Core model routing in SummarizationService](../model-routing-core/issue.md)
