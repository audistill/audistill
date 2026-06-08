---
title: "Unit tests for SummarizationService model routing"
status: done
created: 2026-06-08
---

## Parent

[Multi-tier model routing for summarization and chat](../.scratch/multi-tier-model-routing/issue.md)

## What to build

Unit tests for the model routing logic in SummarizationService. Inject a stub DatabaseService and verify that the correct settings key is read for each view type, and that defaults are used when keys are absent.

Do NOT test HTTP calls, streaming, or prompt content — only the model resolution contract.

Follow the existing test pattern in the project: direct unit tests against service classes with a mocked DatabaseService.

## Acceptance criteria

- [ ] Test: `brief` view type causes `model_fast` to be read from DB
- [ ] Test: `detailed` view type causes `model_quality` to be read from DB
- [ ] Test: `full` view type causes `model_quality` to be read from DB
- [ ] Test: when `model_fast` is unset, `google/gemini-3.1-flash-lite` is used
- [ ] Test: when `model_quality` is unset, `google/gemini-3.5-flash` is used
- [ ] Tests pass in CI

## Blocked by

- [Core model routing in SummarizationService](../model-routing-core/issue.md)
