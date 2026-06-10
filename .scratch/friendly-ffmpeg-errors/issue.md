---
title: "Friendly error messages for FFmpeg decode failures"
status: done
created: 2026-06-10
---

## What to build

Pattern-match common FFmpeg stderr output in `audio-preprocessor.ts` to produce user-friendly error messages instead of raw FFmpeg output. The episode error state should display a message a non-technical user can act on.

Patterns to handle:

| stderr pattern | Friendly message |
|---|---|
| "does not contain any stream" or "Output file does not contain any stream" | "This file contains no audio track." |
| "Invalid data found" or "corrupt" | "This file appears to be corrupted or incomplete." |
| "Decoder ... not found" or "codec not currently supported" | "This audio format is not supported." |
| Everything else | "Could not process this file. Try converting it to MP3 first." |

No retry mechanism — users delete the failed episode and re-drop a corrected file.

## Acceptance criteria

- [ ] "No audio stream" stderr maps to a friendly message
- [ ] "Corrupt/invalid data" stderr maps to a friendly message
- [ ] "Decoder not found" stderr maps to a friendly message
- [ ] Unknown errors get the generic fallback message
- [ ] The raw FFmpeg stderr is not shown to the user
- [ ] Episode error state displays the friendly message

## Blocked by

- [Extract SUPPORTED_EXTENSIONS into a shared module](../shared-supported-formats/issue.md)
