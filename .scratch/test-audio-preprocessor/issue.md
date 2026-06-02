---
title: "Unit test: AudioPreprocessor with fixture MP3"
status: done
created: 2026-06-02
---

## Parent

[PRD: PodCapture — Minimum Prototype](.scratch/podscribe-prototype-prd/issue.md)

## What to build

A unit test suite for the AudioPreprocessor module using a small (~2 second) MP3 fixture file checked into the repo. Verify that the output buffer is 16kHz mono float32 PCM with the correct byte length for the input duration (2 seconds × 16000 samples/sec × 4 bytes/sample = 128,000 bytes, approximately). Also verify the error case: an invalid/missing file path returns a clear, descriptive error.

## Acceptance criteria

- [ ] Test: valid MP3 produces a Buffer of approximately correct byte length for its duration
- [ ] Test: output is parseable as float32 samples (values in -1.0 to 1.0 range)
- [ ] Test: invalid file path returns a descriptive error (not a crash)
- [ ] Test: unsupported file extension returns a descriptive error
- [ ] A ~2 second MP3 fixture is committed to the test fixtures directory
- [ ] Tests run in under 5 seconds

## Blocked by

- [AudioPreprocessor: convert audio to PCM via FFmpeg](../audio-preprocessor/issue.md)
