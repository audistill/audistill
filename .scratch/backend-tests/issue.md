---
title: "Tests: DatabaseService, SummarizationService, IngestPipeline"
status: done
created: 2026-06-02
---

## Parent

`.scratch/library-and-summarization/issue.md` — PRD: PodCapture v2 — Library & Summarization

## What to build

Automated test suite for the three core backend modules. Tests verify external behavior through module interfaces — no implementation detail testing. All tests runnable without the 670MB model file and without hitting real APIs. Use vitest (already configured in this project).

**DatabaseService tests (integration, in-memory SQLite):**
- Schema creation on init
- Episode CRUD: create, read, update, delete
- Folder CRUD: create, read, update, delete with nesting
- Cascading behavior: deleting a folder orphans episodes to Inbox (folder_id → NULL)
- Cascading behavior: deleting an episode removes its open_tabs entry
- Tab persistence: save and load open_tabs
- Settings: get/set/overwrite
- Search: full-text match on title and summary fields
- Edge cases: duplicate folder names allowed, empty search returns all

**SummarizationService tests (unit, mocked HTTP):**
- Prompt construction: base XML instructions + user custom instructions + transcript assembled correctly
- JSON response parsing: extracts title and summary from valid response
- Malformed JSON: returns graceful error (not crash)
- Missing fields in response: returns error
- validateApiKey: returns true for valid key response, false for 401
- Custom instructions appended correctly (not replacing base prompt)

**IngestPipeline tests (integration, mocked transcription + mocked HTTP):**
- State transitions: queued → transcribing → summarizing → complete
- Progress events emitted at each stage
- Transcription error: episode status set to error, error_message stored
- Summarization error: transcript preserved in DB, status set to error
- Retry after transcription error: re-runs full pipeline
- Retry after summarization error: skips transcription (transcript exists), re-runs summarization only
- Multiple queued files process sequentially (not parallel)
- Episode record created immediately on queue (before processing starts)

Prior art: `tests/audio-preprocessor.test.ts` and `tests/model-manager.test.ts` in this repo — follow the same vitest patterns.

## Acceptance criteria

- [ ] `pnpm test` runs all new tests and passes
- [ ] DatabaseService: minimum 10 test cases covering CRUD, cascading, search, settings
- [ ] SummarizationService: minimum 6 test cases covering prompt construction, parsing, validation, error handling
- [ ] IngestPipeline: minimum 7 test cases covering state machine, error recovery, queue behavior
- [ ] No tests require network access or the 670MB model file
- [ ] Tests use in-memory SQLite (`:memory:`) for DatabaseService
- [ ] Tests use mocked HTTP (msw or manual mocks) for SummarizationService and IngestPipeline

## Blocked by

- `.scratch/ingest-pipeline/issue.md` — Ingest pipeline (all three modules must exist to test)
