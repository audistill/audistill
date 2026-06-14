---
title: Fix stale built-in recipe prompts still referencing JSON format
status: done
created: 2026-06-14
---

## What to build

The built-in recipes (Brief, Detailed, Full) were seeded into the database with prompts that instruct the LLM to "Return a JSON object with two fields: title, summary." The app has since moved to a markdown response format (`TITLE:\n---\n<body>`), meaning the recipe prompt contradicts the system frame on every summarization call.

Additionally, `seedBuiltins()` only ran on first install — any prompt file updates never propagated to existing databases.

## Changes made

1. **`recipe-service.ts` — sync built-in prompts on every startup.** If built-in recipes exist, compare each prompt to the file on disk and update if they differ.
2. **`recipe-service.ts` — absorbed `validateApiKey()`** from the now-deleted `SummarizationService`.
3. **`index.ts` — removed `SummarizationService`** wiring; `validate-api-key` IPC handler now calls `recipeService.validateApiKey()`.
4. **Deleted dead code:** `summarization-service.ts`, `summarization-service.test.ts`, `shared/markdown-guidance.ts`.

## Acceptance criteria

- [x] Built-in recipe prompts in the DB match the prompt files on disk after app startup
- [x] Future edits to prompt files propagate to existing installs without a manual migration
- [x] `SummarizationService` fully removed — no dangling imports or dead code
- [x] TypeScript compiles cleanly
