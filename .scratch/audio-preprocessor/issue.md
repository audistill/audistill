---
title: "AudioPreprocessor: convert audio to PCM via FFmpeg"
status: ready-for-agent
created: 2026-06-02
---

## Parent

[PRD: PodCapture — Minimum Prototype](.scratch/podscribe-prototype-prd/issue.md)

## What to build

A main-process module (`AudioPreprocessor`) that accepts a file path and converts it to 16kHz mono 32-bit float PCM suitable for ONNX inference. Uses `ffmpeg-static` to bundle a platform-appropriate FFmpeg binary. Command: `ffmpeg -i input -ar 16000 -ac 1 -f f32le output.pcm`.

Interface: `preprocess(inputPath: string): Promise<Buffer>` — returns the raw PCM buffer. Validates that the input file exists and has a supported extension (MP3, M4A, WAV, FLAC, MP4) before spawning FFmpeg. Returns a clear error message for unsupported or missing files.

## Acceptance criteria

- [ ] Accepts MP3, M4A, WAV, FLAC, and MP4 files
- [ ] Output is 16kHz mono float32 PCM (verifiable by byte length relative to duration)
- [ ] Uses `ffmpeg-static` — no system FFmpeg dependency
- [ ] Returns a descriptive error for unsupported formats or missing files
- [ ] Does not write intermediate files to disk (pipes stdout or uses temp file cleaned up after)

## Blocked by

- [Scaffold Electron app with electron-vite](../scaffold-electron-app/issue.md)
