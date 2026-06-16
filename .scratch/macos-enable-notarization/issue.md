---
title: Enable notarization in the build pipeline
status: done
created: 2026-06-15
---

## What to build

Configure electron-builder to notarize the signed app with Apple's notary service. Notarization is required for Gatekeeper to show "Apple checked this app" instead of blocking it on first launch.

Auth method (choose one):
- **App Store Connect API key** (preferred) — create a key in App Store Connect → Users and Access → Integrations, download the `.p8` file, set `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` env vars
- **App-specific password** — generate at appleid.apple.com, set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` env vars

Update `electron-builder.yml`:
- Change `notarize: false` to `notarize: true` (or provide notarize options object for API key auth)

Verification: after build, run `spctl --assess --verbose=4 --type execute` and confirm "source=Notarized Developer ID". Also verify `stapler validate` on the DMG.

## Acceptance criteria

- [ ] `electron-builder.yml` has notarization enabled
- [ ] Build uploads to Apple notary service and waits for approval
- [ ] `spctl --assess --verbose=4 --type execute dist/mac-arm64/Audistill.app` shows "Notarized Developer ID"
- [ ] `xcrun stapler validate dist/Audistill-0.1.0-arm64.dmg` passes
- [ ] Notarization credentials are documented (which env vars, where to get them)

## Blocked by

- `.scratch/macos-configure-code-signing`
