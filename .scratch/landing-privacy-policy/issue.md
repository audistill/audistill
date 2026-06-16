---
title: Privacy Policy page content
status: ready-for-agent
created: 2025-06-16
---

## Parent

.scratch/landing-page-visual-variety/issue.md

## What to build

Rewrite the `/privacy` page with full Privacy Policy content adapted for Audistill's architecture. Use VoiceInk's Privacy Policy (tryvoiceink.com/privacy) as a structural template, adapted for:

- **App name:** Audistill
- **Platform:** macOS Electron desktop app
- **Local storage:** SQLite database for transcripts/tabs/episodes, OS keychain for API keys, local filesystem for audio files
- **Local processing:** Transcription via Parakeet ONNX — audio never leaves the device
- **Cloud opt-in:** Only transcribed text sent to OpenRouter when user provides their own API key. Never audio.
- **No telemetry/analytics:** The app does not phone home (unless this changes — state current truth)
- **Data control:** User has full control — delete, export, edit all data locally

Key sections to include:
1. Introduction (privacy-first, local by default)
2. Data We Collect (local: transcripts, tabs, audio, settings, recipes; cloud opt-in: text to OpenRouter)
3. Data Storage (local SQLite, OS keychain for API keys, app support directory for audio)
4. Data Retention (user-controlled, no automatic deletion unless configured)
5. Third-Party Services (OpenRouter — link to their privacy policy)
6. Your Privacy Rights (access, delete, export, edit, opt-out of cloud)
7. Data Security (local encryption via OS, no servers)
8. Children's Privacy (not intended for under 13)
9. Changes to This Policy
10. Contact (info@audistill.com)

The page should use the shared layout (Nav/Footer) and have clean, readable typography.

## Acceptance criteria

- [ ] `/privacy` page renders with full Privacy Policy content
- [ ] Uses shared Nav and Footer (from layout extraction)
- [ ] Correctly states audio never leaves the device
- [ ] Correctly describes what IS sent to OpenRouter (text only, user's API key)
- [ ] Describes local data storage (SQLite, keychain, filesystem)
- [ ] States user has full control over data retention and deletion
- [ ] Lists OpenRouter as the only third-party service, links to their policy
- [ ] Contact email: info@audistill.com
- [ ] Clean, readable typography with heading hierarchy
- [ ] No placeholder or lorem ipsum content

## Blocked by

- .scratch/landing-extract-shared-layout (needs shared Nav/Footer)
