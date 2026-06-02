---
title: "TranscriptionService: orchestrate pipeline with IPC"
status: ready-for-agent
created: 2026-06-02
---

## Parent

[PRD: PodCapture — Minimum Prototype](.scratch/podscribe-prototype-prd/issue.md)

## What to build

A main-process orchestrator (`TranscriptionService`) that wires together the full transcription pipeline. When the renderer sends `start-transcription` with a file path via IPC:

1. Calls `AudioPreprocessor.preprocess(filePath)` to get PCM audio
2. Spawns the `TranscriptionWorker` with the PCM buffer and model path
3. Relays worker messages back to the renderer as IPC events: `transcription-progress`, `transcription-segment`, `transcription-complete`, `transcription-error`

Also handles `select-file` IPC by opening a native macOS file dialog filtered to supported audio formats.

## Acceptance criteria

- [ ] Listens for `start-transcription` IPC from renderer
- [ ] Calls AudioPreprocessor then spawns TranscriptionWorker sequentially
- [ ] Relays `transcription-progress` (percent) to renderer
- [ ] Relays `transcription-segment` ({start, end, text}) to renderer
- [ ] Sends `transcription-complete` when worker emits `done`
- [ ] Sends `transcription-error` with message on any pipeline failure (preprocess or worker)
- [ ] `select-file` IPC opens native dialog filtered to MP3, M4A, WAV, FLAC, MP4
- [ ] UI remains responsive during the entire pipeline (no main thread blocking)

## Blocked by

- [TranscriptionWorker: ONNX inference in worker thread](../transcription-worker/issue.md)
