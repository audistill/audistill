---
title: "Extract SUPPORTED_EXTENSIONS into a shared module"
status: done
created: 2026-06-10
---

## What to build

A shared module (e.g., `src/shared/supported-formats.ts`) that exports the canonical set of accepted file extensions and a derived Electron file-filter array. All existing consumers — `audio-preprocessor.ts`, `App.tsx`, `ingest-pipeline.ts`, `transcription-service.ts` — should import from this single source of truth instead of maintaining their own copies.

The module should export at minimum:
- A `Set<string>` of lowercase dotted extensions (e.g., `.mp3`)
- A file-filter object compatible with Electron's `dialog.showOpenDialog` (name + extensions array without dots)

## Acceptance criteria

- [ ] Single shared module exports the extension set and file-filter
- [ ] All 4 existing declaration sites import from the shared module (no local SUPPORTED_EXTENSIONS remaining)
- [ ] App compiles and existing formats (.mp3, .m4a, .wav, .flac, .mp4) continue to work in drag-and-drop and file picker
- [ ] No runtime behavior change — this is a pure refactor

## Blocked by

None - can start immediately
