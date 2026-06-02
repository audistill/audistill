---
title: "PRD: PodCapture — Minimum Prototype"
status: done
created: 2026-06-02
---

## Problem Statement

Knowledge workers consume hours of audio content daily — podcasts, lectures, meetings, interviews — but retain almost none of it. Existing tools are either cloud-dependent (NotebookLM, limited to 50 sources and scoped to notebooks), transcription-only without retrieval (MacWhisper), or dictation-focused rather than long-form ingestion (VoiceInk). There is no local-first, privacy-respecting tool that turns audio files into searchable, retrievable knowledge on macOS.

## Solution

PodCapture is a macOS desktop app that transcribes audio files entirely on-device using NVIDIA's Parakeet-TDT v3 multilingual model. The user picks an audio file, the app transcribes it locally (no cloud, no cost per minute), and displays timestamped transcript segments. This prototype validates the core pipeline: local file → on-device transcription → readable output.

The prototype is the foundation for a growing personal audio knowledge base with RAG search, but this phase proves only that the transcription pipeline works end-to-end on Apple Silicon.

## User Stories

1. As a knowledge worker, I want to open an MP3 file from my machine, so that I can get a transcript without uploading anything to the cloud.
2. As a user launching the app for the first time, I want the transcription model to download automatically, so that I don't need to manually find and place model files.
3. As a user waiting for the model to download, I want to see download progress, so that I know it's working and can estimate how long it will take.
4. As a user who has already downloaded the model, I want the app to start instantly without re-downloading, so that subsequent launches are fast.
5. As a user, I want to pick an audio file using a native macOS file dialog, so that the interaction feels like a real desktop app.
6. As a user, I want the app to accept common audio formats (MP3, M4A, WAV, FLAC, MP4), so that I don't need to manually convert files before transcribing.
7. As a user, I want to see a progress bar with percentage during transcription, so that I know how far along the process is and can estimate completion time.
8. As a user, I want the app to remain responsive during transcription, so that the window doesn't freeze or become unresponsive.
9. As a user, I want to see the transcript displayed as timestamped segments, so that I can navigate to specific parts of the audio content.
10. As a user, I want to copy the full transcript to my clipboard, so that I can paste it into other tools (notes, docs, messages).
11. As a user, I want to see a clear error message if something goes wrong (bad file, missing model, inference failure), so that I understand what happened and can try again.
12. As a user, I want the app to support both dark and light mode following my macOS system preference, so that it feels native and comfortable in any environment.
13. As a user, I want multilingual transcription support, so that I can transcribe audio in any of the 25 supported European languages without configuration.
14. As a user, I want automatic language detection, so that I don't need to specify the language before transcribing.
15. As a user whose model download fails, I want to be able to retry by restarting the app, so that a flaky connection doesn't permanently break the setup.

## Implementation Decisions

### Architecture

- **Electron app** scaffolded with `electron-vite` (React + TypeScript template). The template determines the Electron version (expected 31-33 range).
- **pnpm** as the package manager.
- **Main process** handles file dialog, model management, audio preprocessing, and spawning the transcription worker.
- **Worker thread** (`worker_threads`) runs ONNX inference off the main thread to keep the UI responsive.
- **Renderer process** is a single-page React app with three states: idle, processing, complete.

### Module Design

Four deep modules with simple interfaces, plus the renderer:

1. **ModelManager** — Checks for model existence in `app.getPath('userData')/models/`, downloads from HuggingFace if missing, reports progress. Interface: `ensureModel(): Promise<string>` returns the path to model directory. Emits progress events during download.

2. **AudioPreprocessor** — Accepts any audio/video file path, uses bundled FFmpeg (`ffmpeg-static`) to convert to 16kHz mono 32-bit float PCM. Interface: `preprocess(inputPath: string): Promise<Buffer>`. Validates input file exists and is a supported format before processing.

3. **TranscriptionWorker** — Runs inside a `worker_threads` worker. Loads the ONNX model via `onnxruntime-node`, processes PCM audio in chunks (~30s windows), emits progress and timestamped segments. Message protocol:
   - Inbound: `{type: 'start', audioBuffer: SharedArrayBuffer, modelPath: string}`
   - Outbound: `{type: 'progress', percent: number}` | `{type: 'segment', start: number, end: number, text: string}` | `{type: 'done'}` | `{type: 'error', message: string}`

4. **TranscriptionService** — Main-process orchestrator. Receives file path from renderer via IPC, calls AudioPreprocessor, spawns TranscriptionWorker, relays progress and results back to renderer via IPC. Single method: `transcribe(filePath: string)` with IPC event callbacks.

5. **Renderer UI** — Single React component tree using shadcn/ui + Tailwind CSS. Three view states managed by React state (no router). Warm companion aesthetic with Claude-inspired design system (see Design System section below).

### Technical Choices

- **ASR model:** `parakeet-tdt-0.6b-v3` int8 quantized ONNX (~670MB total: encoder ~624MB, decoder ~6.9MB, joiner ~1.7MB). Sourced from HuggingFace community ONNX export.
- **Inference runtime:** `onnxruntime-node` — runs on Apple Silicon via CPU. No CUDA, no CoreML bridge needed for prototype.
- **Audio conversion:** `ffmpeg-static` bundles a platform-specific FFmpeg binary. Command: `ffmpeg -i input -ar 16000 -ac 1 -f f32le output.pcm`.
- **Model storage:** `~/Library/Application Support/PodCapture/models/` via Electron's `app.getPath('userData')`.
- **Transcript persistence:** None. In-memory React state only. Lost on window close.
- **Error handling:** All errors surface as inline messages in the UI (no native dialogs, no silent failures).
- **Model download:** Simple HTTP fetch from HuggingFace. No resume on failure — app retries from scratch on next launch.

### Design System

**Brand personality:** Warm companion — approachable, friendly, not intimidating. Inspired by Claude/Anthropic's brand palette.

**Color tokens (CSS variables):**

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `--bg` | `#141413` | `#faf9f5` |
| `--text` | `#faf9f5` | `#141413` |
| `--secondary` | `#b0aea5` | `#b0aea5` |
| `--surface` | `#1e1e1c` | `#e8e6dc` |
| `--accent` | `#d97757` | `#d97757` |

**Typography:**
- Headings: Poppins (500/600/700 weights)
- Body/transcripts: SF Pro (-apple-system, BlinkMacSystemFont, system-ui)

**Spatial design:**
- Corner radius: 12px (macOS-native rounding)
- Spacing: generous padding, breathable layout
- Rounded + spacious philosophy — inviting, not cramped

**Theme:** Follows macOS system preference automatically (`nativeTheme.themeSource = 'system'`). No manual toggle in prototype.

**Design principles:**
1. Content first — transcript is the main character, UI chrome is minimal
2. Warm, not cold — soft shadows, rounded corners, orange accent is a gentle glow
3. Native-feeling — respect macOS conventions, system theme, SF Pro for reading
4. Single-purpose clarity — one screen, one action at a time, no clutter

**Validated prototype:** `/tmp/podcapture-prototype/index.html` (HTML/Tailwind mock showing all three states)

### IPC Contract (Main ↔ Renderer)

- `select-file` → main opens native dialog, returns file path
- `start-transcription` (filePath) → main begins pipeline
- `transcription-progress` (percent) → renderer updates progress bar
- `transcription-segment` ({start, end, text}) → renderer appends segment
- `transcription-complete` → renderer switches to complete state
- `transcription-error` (message) → renderer shows inline error
- `model-download-progress` (percent) → renderer shows download progress
- `model-download-complete` → renderer allows transcription to proceed

## Testing Decisions

Good tests for this prototype verify external behavior through module interfaces, not internal implementation details. Tests should be runnable without the 670MB model file (mock or fixture-based where needed).

### Modules to test:

1. **ModelManager** — Integration test with mocked HTTP. Verify: detects missing model → initiates download → writes files to correct directory → subsequent calls return immediately. Test failure case: partial download leaves no corrupted state.

2. **AudioPreprocessor** — Unit test with a small fixture MP3 (~2 seconds). Verify: output buffer is 16kHz mono float32 PCM with correct byte length for the input duration. Test failure case: invalid file path returns a clear error.

### Modules NOT tested (prototype):

- **TranscriptionWorker** — Requires the full 670MB model. Validated by running the app manually.
- **Renderer UI** — Validated by running the app. No component tests at prototype stage.
- **TranscriptionService** — Thin orchestration layer; tested implicitly via end-to-end manual testing.

## Out of Scope

- Persistent storage / SQLite database / library view
- RAG search / vector embeddings / cross-episode queries
- LLM-powered summaries (OpenRouter integration)
- RSS feed subscription / auto-download
- Podcast discovery or browsing
- Multi-user, authentication, or cloud sync
- Translation features
- Content creator features (social posts, show notes, blog outlines)
- Resume/retry logic for model downloads
- Drag-and-drop file input (native file picker only for v1)
- Windows or Linux support
- Mac App Store distribution
- Pricing, payment, or licensing logic
- Auto-update mechanism

## Further Notes

- **App name:** PodCapture. A local-first podcast knowledge base for macOS.
- This prototype is a **throwaway validation** of the transcription pipeline. The architecture is intentionally simple — no premature abstractions for features that don't exist yet.
- The Parakeet-TDT v3 model is licensed CC-BY-4.0 — free for commercial use with attribution.
- VoiceInk (GPL v3, Swift/macOS) serves as a technical reference for how local Parakeet transcription works, but no code is reused.
- The upgrade path from this prototype to the full product involves adding: SQLite persistence, vector store (vectra or FAISS), OpenRouter integration for summaries/RAG, and a library UI with search.
- Performance expectation: ~30x real-time on Apple Silicon CPU via ONNX. A 1-hour podcast should transcribe in ~2 minutes.
- **Future business model:** One-time purchase + BYOK (user brings own OpenRouter API key for LLM features). Distribution via direct notarized .dmg download, eventually SetApp.
