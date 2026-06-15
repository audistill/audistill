---
title: Configure electron-builder for real code signing
status: ready-for-agent
created: 2026-06-15
---

## What to build

Wire up the Developer ID Application certificate so `electron-builder --mac` produces a properly signed app bundle. The ad-hoc `afterPack` hook (`scripts/fix-ad-hoc-signing.cjs`) should remain as a fallback for local dev builds without the certificate, but real builds must use the Developer ID identity.

Configuration approach:
- Set `CSC_NAME` environment variable to the identity name (e.g., "Developer ID Application: Name (TEAM_ID)")
- Alternatively, export the cert as `.p12` and use `CSC_LINK` + `CSC_KEY_PASSWORD` for portability
- Update `electron-builder.yml` `mac.identity` if needed
- The `afterPack` hook already skips when `CSC_LINK` or `CSC_NAME` is set — no changes needed there

Verification: the built `.app` passes `codesign --verify --deep --strict` and `spctl --assess --type execute` reports "accepted" with source "Developer ID".

## Acceptance criteria

- [ ] `pnpm run build:mac` with `CSC_NAME` set produces a validly signed DMG
- [ ] `codesign --verify --deep --strict dist/mac-arm64/Audistill.app` passes
- [ ] `spctl --assess --type execute dist/mac-arm64/Audistill.app` reports accepted
- [ ] Build still works without `CSC_NAME` set (falls back to ad-hoc via the afterPack hook)

## Blocked by

- `.scratch/macos-create-developer-id-cert`
