---
title: Terms of Service page content
status: done
created: 2025-06-16
---

## Parent

.scratch/landing-page-visual-variety/issue.md

## What to build

Rewrite the `/terms` page with full Terms of Service content adapted for Audistill's architecture. Use VoiceInk's ToS (tryvoiceink.com/terms) as a structural template, adapted for:

- **App name:** Audistill
- **Platform:** macOS Electron desktop app (not Swift/native)
- **Licensing model:** Open source + commercial compiled version (dual license — specifics of which open-source license TBD, use placeholder language like "the applicable open-source license")
- **Cloud services:** OpenRouter for LLM features — only transcribed text is sent, never audio. User provides their own API key.
- **Local processing:** Transcription via Parakeet ONNX, always on-device
- **Purchase model:** One-time purchase via Polar, tiers determine device count
- **Refund policy:** 14 days

Key sections to include:
1. Acceptance of Terms
2. License and Services (open source + commercial)
3. Cloud Services (OpenRouter — text only, user's own API key)
4. Restrictions (compiled version only)
5. Updates
6. Refund Policy (14 days)
7. Disclaimer of Warranty
8. Limitation of Liability
9. Termination
10. Contact (info@audistill.com)

The page should use the shared layout (Nav/Footer) and have clean, readable typography with appropriate heading hierarchy.

## Acceptance criteria

- [ ] `/terms` page renders with full Terms of Service content
- [ ] Uses shared Nav and Footer (from layout extraction)
- [ ] Correctly describes dual licensing model (open source + commercial)
- [ ] Correctly states audio never leaves the device
- [ ] Correctly describes OpenRouter as the LLM provider (text only, user's API key)
- [ ] Includes 14-day refund policy
- [ ] Contact email: info@audistill.com
- [ ] Clean, readable typography with heading hierarchy
- [ ] No placeholder or lorem ipsum content

## Blocked by

- .scratch/landing-extract-shared-layout (needs shared Nav/Footer)
