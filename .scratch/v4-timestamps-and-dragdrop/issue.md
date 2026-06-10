---
title: "PRD: Audistill v4 — Timestamped Transcripts & Drag-and-Drop Import"
status: done
created: 2026-06-02
---

## Problem Statement

Audistill transcribes audio but discards the temporal information during ingestion — segments are joined into a plain string, losing the start/end times that the transcription model produces. Users cannot see *where* in an episode something was said, making long transcripts hard to navigate.

Separately, the only way to import audio is through the native file picker dialog. Users expect to drag files from Finder onto the app window — the absence of drag-and-drop makes the app feel like a prototype rather than a native macOS tool.

## Solution

1. **Timestamped transcripts:** Preserve segment timing from the transcription worker and display timestamps alongside transcript text, so users can scan and locate content within a long episode.

2. **Drag-and-drop import:** Accept audio files dropped anywhere on the app window, filter for supported formats, and route them into the existing ingest pipeline — making import feel as natural as it does in Finder, Apple Music, or any macOS media app.

## User Stories

1. As a user, I want to see timestamps in the transcript section of an episode, so that I know roughly when in the recording each passage occurs.
2. As a user, I want timestamps displayed as muted time markers (e.g. "0:42", "12:15") at the start of each segment, so that they're visible but don't clutter the reading experience.
3. As a user, I want transcript segments to correspond to the transcription model's natural output chunks (~30 seconds), so that timestamps are honest and accurate.
4. As a user, I want to drag audio files from Finder onto the Audistill window, so that I can import without navigating a file picker.
5. As a user, I want a visual overlay to appear when I drag files over the window, so that I know the app is ready to accept my drop.
6. As a user, I want the drop overlay to use the app's terracotta accent color with a dashed border, icon, and "Drop audio files to import" message, so that it's consistent with the app's design language.
7. As a user, I want the overlay to disappear immediately when I drag away or drop, so that it doesn't obstruct my view.
8. As a user, I want non-audio files to be silently filtered out when I drop a mixed selection, so that I don't get error dialogs for irrelevant files.
9. As a user, I want a brief toast notification when I drop files and none are supported audio formats, so that I understand why nothing happened.
10. As a user, I want dropped audio files to go to the Inbox, so that import behavior is predictable regardless of what folder or view is active.
11. As a user, I want drag-and-drop to work even before I've completed onboarding (set an API key), so that I can start transcribing immediately.
12. As a user, I want the overlay to remain visible while dragging over any part of the window (sidebar, tab bar, content pane), so that I don't have to aim at a specific target.

## Implementation Decisions

### Modules to Modify

1. **IngestPipeline** (modify) — Change `runTranscriptionWorker()` to collect segment objects with `{start, end, text}` instead of plain text strings. Store the result as a JSON-serialized array in the `transcript` column. The transcription worker already emits segments with timing data — the change is to stop discarding them at the join step.

2. **EpisodeView** (modify) — Parse the `transcript` field as JSON. Render each segment as a block with a muted timestamp prefix formatted as `m:ss` (or `h:mm:ss` for episodes over an hour). The timestamp uses a smaller font size and muted text color. The transcript section remains collapsible.

3. **DropOverlay** (new component) — A presentational component that renders the full-window drop overlay: semi-transparent dark backdrop, centered dashed-border box with terracotta accent (`#d97757`), download/import icon (from lucide-react), and "Drop audio files to import" text. Accepts a `visible` boolean prop.

4. **App.tsx** (modify) — Add window-level drag event handlers:
   - `dragenter` / `dragover`: show the DropOverlay, prevent default browser behavior
   - `dragleave`: hide overlay (only when leaving the window, not entering a child element — use a counter or `relatedTarget` check)
   - `drop`: collect files, filter by supported extensions (`.mp3`, `.m4a`, `.wav`, `.flac`, `.mp4`), send file paths to the main process via existing IPC channel for ingestion. Show toast if zero valid files.
   - Disable Electron's default file drop behavior (`event.preventDefault()` on `webContents`)

### Key Technical Decisions

- **Transcript storage format:** JSON array — `[{"start": 0.0, "end": 30.5, "text": "..."}, ...]` — stored in the existing `transcript TEXT` column. No schema migration needed.
- **No backward compatibility:** Existing episodes with plain-text transcripts will be deleted manually. No format detection logic.
- **Segment granularity:** One JSON object per transcription worker chunk (~30 seconds). No sub-sentence splitting.
- **Timestamp formatting:** `Math.floor(seconds / 60)` + `:` + zero-padded seconds. No hours digit unless episode exceeds 60 minutes.
- **Drop target scope:** Entire `<html>` document body. Uses a `dragenter` counter to handle child element boundary crossings without flickering.
- **File filtering:** Allowlist of extensions: `.mp3`, `.m4a`, `.wav`, `.flac`, `.mp4`. Check `file.name` or `file.path` extension. Case-insensitive.
- **Toast notification:** A simple auto-dismissing element (3 seconds) positioned at the bottom-center. No toast library — a small inline component with `setTimeout` removal.
- **No Electron native drag** — using standard web Drag and Drop API within the renderer, which Electron supports fully.
- **IPC reuse:** Dropped file paths are sent via the same IPC channel used by the file picker (`ingest-files` or equivalent). The main process doesn't know or care whether files came from a picker or a drop.

### Interaction Details

- **Overlay entrance:** Appears with a fast fade (150ms opacity transition) on first `dragenter`.
- **Overlay exit:** Disappears immediately on `drop` or when drag counter reaches zero (left window).
- **During ingest:** After drop, the ingest pipeline queues files and shows progress in the sidebar as it already does for file-picker imports. No new progress UI needed.
- **Electron `webContents` default:** Must call `event.preventDefault()` in the renderer's `dragover` handler to prevent Electron from navigating to the dropped file.

## Testing Decisions

Tests will cover the IngestPipeline timestamp change — the part where data transformation happens and correctness matters most.

**What makes a good test here:** Verify the output shape (JSON array with start/end/text fields) of the transcription result as seen by the database layer. Test the external interface — what `runTranscriptionWorker` returns — not the internal worker message handling.

**Modules to test:**
- **IngestPipeline** — test that after transcription completes, the episode's `transcript` field is a valid JSON string containing an array of segment objects with numeric `start`, numeric `end`, and string `text` fields.

**Prior art:** Existing tests in `tests/ingest-pipeline.test.ts` mock the transcription worker and verify pipeline state transitions. The new test extends this pattern to assert on transcript shape.

**Not tested (manual verification):**
- DropOverlay visual appearance (verify in app)
- Drag event handling edge cases (verify by dragging files in dev mode)
- Toast notification timing

## Out of Scope

- Audio playback or clickable timestamps that seek to a position
- Drag-and-drop onto specific folders (context-aware drop targets)
- Re-transcription of existing episodes to backfill timestamps
- Sub-sentence timestamp precision or speaker diarization
- Toast notification library or global notification system
- Drag-and-drop of URLs or non-file content (e.g., dragging a link from a browser)
- Folder/episode drag-and-drop reordering within the sidebar

## Further Notes

- **Timestamp display as a future audio playback hook:** The timestamps are rendered as distinct elements, making it straightforward to later add `onClick` handlers that seek an audio player to that position. This PRD does not implement playback — only the visual scaffolding.
- **Worker segment shape:** The transcription worker (`transcription-worker.ts`) already sends messages with `{type: 'segment', start, end, text}`. The change in IngestPipeline is purely about what to *keep* vs. what to discard.
- **Drag counter pattern:** The standard technique for full-window drop zones. Increment on `dragenter`, decrement on `dragleave`. Show overlay when counter > 0. Reset to 0 on `drop`. This prevents flickering as the cursor moves between child elements.
