---
title: Audit and update hardened runtime entitlements
status: ready-for-agent
created: 2026-06-15
---

## What to build

Verify that the app functions correctly under hardened runtime with the current entitlements. Hardened runtime is mandatory for notarization but restricts what the app can do (JIT, unsigned memory, dynamic library loading).

Current entitlements (`build/entitlements.mac.plist`):
- `com.apple.security.cs.allow-jit` — needed by Electron/V8
- `com.apple.security.cs.allow-unsigned-executable-memory` — needed by Electron/V8

Potential additions needed:
- `com.apple.security.cs.disable-library-validation` — if better-sqlite3's `.node` binary or bundled ffmpeg aren't signed with the same team ID
- `com.apple.security.device.audio-input` — if the app ever records from microphone (check if this is a feature)
- File access entitlements — likely not needed for direct distribution (only App Store sandbox requires these)

Testing approach: sign the app with hardened runtime (`--options runtime` flag — electron-builder does this automatically when a real identity is used), then exercise all core paths: open an Episode, run Transcription (exercises better-sqlite3 + any native audio processing), play audio, use Chat.

## Acceptance criteria

- [ ] App launches and runs under hardened runtime without crashes
- [ ] Transcription completes (better-sqlite3 writes + audio processing work)
- [ ] Audio playback works
- [ ] `entitlements.mac.plist` documents why each entitlement is needed (inline comments or a companion doc)
- [ ] No unnecessary entitlements are granted

## Blocked by

- `.scratch/macos-configure-code-signing`
