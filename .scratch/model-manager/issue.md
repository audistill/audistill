---
title: "ModelManager: download & cache Parakeet ONNX model"
status: ready-for-agent
created: 2026-06-02
---

## Parent

[PRD: PodCapture — Minimum Prototype](.scratch/podscribe-prototype-prd/issue.md)

## What to build

A main-process module (`ModelManager`) that manages the Parakeet-TDT v3 int8 ONNX model files (~670MB total: encoder, decoder, joiner). On first launch it downloads the model from HuggingFace to `app.getPath('userData')/models/`. On subsequent launches it detects the existing files and returns immediately. During download it emits progress events that the main process can relay to the renderer via the `model-download-progress` and `model-download-complete` IPC channels.

Interface: `ensureModel(): Promise<string>` — returns the path to the model directory. Emits progress events during download. If the download is interrupted, no partial/corrupt files remain (atomic write or temp-then-rename pattern).

## Acceptance criteria

- [ ] `ensureModel()` downloads all required model files on first call
- [ ] Progress events fire with percentage during download
- [ ] Subsequent calls detect existing model and resolve immediately without network requests
- [ ] Partial/failed downloads do not leave corrupt state — next launch retries cleanly
- [ ] Model stored at `~/Library/Application Support/PodCapture/models/`
- [ ] Works with the `parakeet-tdt-0.6b-v3` int8 quantized ONNX export from HuggingFace

## Blocked by

- [Scaffold Electron app with electron-vite](../scaffold-electron-app/issue.md)
