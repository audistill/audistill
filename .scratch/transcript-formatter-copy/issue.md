---
title: "TranscriptFormatter module + transcript copy buttons"
status: done
created: 2026-06-11
---

## Parent

`.scratch/copy-export-regenerate/issue.md`

## What to build

A pure-function TranscriptFormatter module that transforms raw JSON transcript segments into readable text in two modes, plus two copy buttons in the transcript panel.

**TranscriptFormatter** takes `[{ start, end, text }]` segments and a format option:

- **With timestamps:** Merge short segments at sentence boundaries (accumulate until `.`, `!`, `?` or ~150 char cap). Prefix each merged line with `m:ss` (or `h:mm:ss` if episode duration ≥ 1 hour). Timestamp is the `start` of the first segment in each group.
- **Without timestamps:** Flowing prose paragraphs. Merge all segments into continuous text. Insert paragraph breaks (blank line) at audio pauses — gaps > 2 seconds between consecutive segments.

**Transcript copy buttons** in the TranscriptPanel: "Copy" (with timestamps) and "Copy plain" (without timestamps). Both write dual-format clipboard (same pattern as tab copy — raw text + HTML rendered from the formatted output).

## Acceptance criteria

- [ ] TranscriptFormatter module exists as a pure function with no side effects
- [ ] Timestamps formatted as `m:ss` for episodes < 1 hour, `h:mm:ss` for ≥ 1 hour
- [ ] Short segments merged at sentence-boundary punctuation (`.!?`) with ~150 char cap
- [ ] No-timestamp mode produces paragraph breaks at pauses > 2 seconds
- [ ] Handles edge cases: empty transcript (returns empty string), single segment, no punctuation (falls back to char-cap grouping), segments with no gaps
- [ ] Unit tests covering the above cases (Vitest, file alongside module)
- [ ] Two buttons in TranscriptPanel: "Copy" and "Copy plain"
- [ ] IPC handler `export:copy-transcript` fetches transcript from DB, formats via TranscriptFormatter, writes dual-format clipboard
- [ ] Duration-based format selection uses episode's `duration_sec`

## Blocked by

None — can start immediately.
