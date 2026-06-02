---
title: "Renderer UI: three-state interface with file picker"
status: ready-for-agent
created: 2026-06-02
---

## Parent

[PRD: PodCapture — Minimum Prototype](.scratch/podscribe-prototype-prd/issue.md)

## What to build

A single-page React app (no router) with three view states managed by React state:

1. **Idle** — Welcome message, "Select Audio File" button that triggers the `select-file` IPC. If the model is downloading, show download progress bar instead of the file picker.
2. **Processing** — File name displayed, progress bar with percentage, animated state to indicate work is happening. Segments appear incrementally as they arrive via `transcription-segment` IPC.
3. **Complete** — Full timestamped transcript displayed as a scrollable list of segments (each showing `[MM:SS]` timestamp and text). "Copy to Clipboard" button copies all segment text. "Transcribe Another" button returns to idle state.

Inline error messages replace the current view content when `transcription-error` fires — with a "Try Again" button that returns to idle.

Uses the PodCapture design system: warm companion aesthetic, accent color for primary actions, generous spacing, 12px radius, Poppins headings, SF Pro body. Follows system dark/light mode.

## Acceptance criteria

- [ ] Idle state shows file picker button (or model download progress if model is downloading)
- [ ] Processing state shows file name, progress bar with percentage, and segments appearing live
- [ ] Complete state shows all segments with `[MM:SS]` timestamps in a scrollable area
- [ ] "Copy to Clipboard" copies the full transcript text
- [ ] "Transcribe Another" resets to idle state
- [ ] Error state shows inline message with "Try Again" button
- [ ] Respects dark/light mode via CSS custom properties
- [ ] Uses PodCapture design tokens (colors, typography, spacing, radius)
- [ ] UI never freezes during transcription (all work is off main thread)

## Blocked by

- [TranscriptionService: orchestrate pipeline with IPC](../transcription-service/issue.md)
