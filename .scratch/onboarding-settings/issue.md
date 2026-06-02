---
title: "Onboarding flow + Settings (with API key validation)"
status: done
created: 2026-06-02
---

## Parent

`.scratch/library-and-summarization/issue.md` — PRD: PodCapture v2 — Library & Summarization

## What to build

Wire the onboarding and settings views to real functionality. Create the SummarizationService module (main process) — an OpenRouter API client that constructs XML-structured prompts and can validate API keys.

**Onboarding flow:** On app launch, if no `openrouter_api_key` exists in the settings table, show the OnboardingView. User enters their API key → app calls `SummarizationService.validateApiKey()` (lightweight test request to OpenRouter) → on success, stores the key in settings and transitions to the empty library. On failure, shows inline error and lets user retry. A note says "You can change this later in Settings."

**Settings tab:** Gear icon opens Settings as a closable tab. Three fields wired to the database:
- API key (password input, stored/loaded from settings table)
- Model selector (dropdown, default `google/gemini-3.5-flash`, options include a few popular models)
- Custom instructions (textarea, appended to base prompt)

Changes in settings save immediately to the database.

**SummarizationService:** For this slice, only `validateApiKey(key)` needs to work end-to-end. The full `summarize()` method is wired in the next slice (ingest pipeline). But the module should be complete — prompt construction, JSON parsing, error handling — ready to be called.

## Acceptance criteria

- [ ] SummarizationService module created with `validateApiKey(key): Promise<boolean>` and `summarize(transcript): Promise<{title, summary}>`
- [ ] Prompt uses XML structure with base Rundown instructions + `{{user_custom_instructions}}` + `{{transcript}}`
- [ ] Fresh app (no API key in DB) shows OnboardingView on launch
- [ ] Entering a valid API key → validation succeeds → key stored → transitions to empty library
- [ ] Entering an invalid API key → inline error shown → user can retry
- [ ] After onboarding, subsequent launches skip onboarding and show library directly
- [ ] Settings tab: API key field loads/saves from DB
- [ ] Settings tab: model selector loads/saves from DB (default: `google/gemini-3.5-flash`)
- [ ] Settings tab: custom instructions textarea loads/saves from DB
- [ ] Settings tab opens from gear icon, appears as closable tab
- [ ] Preload/IPC exposes `validateApiKey`, `getSetting`, `setSetting`

## Blocked by

- `.scratch/database-persistence-wiring/issue.md` — DatabaseService + persistence wiring
