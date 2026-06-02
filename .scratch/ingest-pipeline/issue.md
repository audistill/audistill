---
title: "Ingest pipeline: add files → transcribe → summarize → display"
status: done
created: 2026-06-02
---

## Parent

`.scratch/library-and-summarization/issue.md` — PRD: PodCapture v2 — Library & Summarization

## What to build

Wire the full ingest pipeline end-to-end: user clicks "+ Add", selects audio files via native dialog, files appear in Inbox with live processing status, and complete with a generated summary displayed in the episode detail view.

**IngestPipeline module (new, main process):** Orchestrates the full flow:
1. Receives file paths from renderer (multi-file select)
2. Creates episode records in DB with status `queued`
3. Processes sequentially: preprocess audio (existing AudioPreprocessor) → transcribe (refactored TranscriptionService) → summarize (SummarizationService) → update DB record (status `complete`)
4. Emits progress/status events to renderer via IPC at each stage

**TranscriptionService refactor:** Change the existing service to collect all segments and return the full transcript as a string (instead of streaming directly to renderer). Progress events still emitted for UI updates. The IngestPipeline calls this, gets the result, passes to SummarizationService.

**State machine per episode:** `queued → transcribing → summarizing → complete | error`

**Error handling:**
- Transcription failure → status `error`, error_message stored, shown in Inbox with retry
- LLM failure → transcript preserved in DB, status `error`, episode view shows "Generate Summary" button
- Principle: never lose completed work — each stage persists before the next begins

**Renderer wiring:** "+ Add" button opens native multi-file dialog. Selected files trigger `addFiles` IPC call. Inbox updates live via `onEpisodeUpdated` events. Completed episodes navigable with full summary content.

## Acceptance criteria

- [ ] "+ Add" button opens native file dialog with multi-select (MP3, M4A, WAV, FLAC, MP4)
- [ ] Selected files immediately appear in Inbox with status "Queued"
- [ ] Episodes process sequentially (not in parallel)
- [ ] Inbox shows live status: queued → transcribing (with %) → summarizing → complete
- [ ] Completed episodes show LLM-generated title and Rundown-style summary in detail view
- [ ] Transcript stored and viewable (collapsed section in episode view)
- [ ] TranscriptionService refactored to return full transcript text (not stream to renderer)
- [ ] Transcription failure: episode shows error state with retry button in Inbox
- [ ] LLM failure: transcript preserved, "Generate Summary" button shown on episode view
- [ ] Retry re-runs the failed stage (not the entire pipeline if transcript already exists)
- [ ] Multiple files queued at once process one by one
- [ ] Episode duration_sec populated from audio metadata
- [ ] Preload/IPC exposes: `addFiles(filePaths[])`, `retryEpisode(id)`, `onEpisodeUpdated` event

## Blocked by

- `.scratch/onboarding-settings/issue.md` — Onboarding flow + Settings (API key needed for summarization)
