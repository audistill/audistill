---
title: "Expand ingest allowlist to 11 formats"
status: done
created: 2026-06-10
---

## What to build

Add `.mov`, `.mkv`, `.webm`, `.aac`, `.ogg`, `.opus` to the shared supported-formats module, bringing the total to 11 extensions. These are all reliably decoded by the bundled ffmpeg-static binary.

No changes to FFmpeg arguments — the existing `-i input -ar 16000 -ac 1 -f f32le pipe:1` handles all of these. For multi-track video files, FFmpeg's default behavior (first audio stream) is intentional and correct.

Update the Electron file-filter label to "Audio & Video Files" (or similar) to reflect that video containers are now accepted.

## Acceptance criteria

- [ ] Shared module lists all 11 extensions: .mp3, .m4a, .wav, .flac, .mp4, .mov, .mkv, .webm, .aac, .ogg, .opus
- [ ] File picker dialog shows the expanded filter
- [ ] Drag-and-drop accepts the 6 new extensions
- [ ] Preprocessing succeeds for at least one test file of each new format (manual or automated)
- [ ] Sequential processing is maintained — only one file preprocesses at a time

## Blocked by

- [Extract SUPPORTED_EXTENSIONS into a shared module](../shared-supported-formats/issue.md)
