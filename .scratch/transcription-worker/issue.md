---
title: "TranscriptionWorker: ONNX inference in worker thread"
status: done
created: 2026-06-02
---

## Parent

[PRD: Audistill — Minimum Prototype](.scratch/podscribe-prototype-prd/issue.md)

## What to build

A Node.js `worker_threads` worker that loads the Parakeet-TDT ONNX model via `onnxruntime-node` and performs speech-to-text inference. Receives PCM audio as a SharedArrayBuffer, processes it in ~30-second windows, and posts messages back to the parent thread with progress updates and timestamped transcript segments.

Message protocol:
- Inbound: `{type: 'start', audioBuffer: SharedArrayBuffer, modelPath: string}`
- Outbound: `{type: 'progress', percent: number}` | `{type: 'segment', start: number, end: number, text: string}` | `{type: 'done'}` | `{type: 'error', message: string}`

The worker handles multilingual transcription (25 European languages) with automatic language detection — no language parameter needed.

## Acceptance criteria

- [ ] Runs in a `worker_threads` worker (does not block main thread or renderer)
- [ ] Loads model from the path provided in the start message
- [ ] Processes audio in ~30s windows and emits segments with start/end timestamps
- [ ] Emits progress percentage as chunks are processed
- [ ] Emits `done` when all audio is processed
- [ ] Emits `error` with a descriptive message on inference failure
- [ ] Supports multilingual input with automatic language detection
- [ ] Uses SharedArrayBuffer for zero-copy audio transfer

## Blocked by

- [ModelManager: download & cache Parakeet ONNX model](../model-manager/issue.md)
- [AudioPreprocessor: convert audio to PCM via FFmpeg](../audio-preprocessor/issue.md)
