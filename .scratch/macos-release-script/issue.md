---
title: Create local release script (pnpm release:mac)
status: ready-for-human
created: 2026-06-15
---

## What to build

A single command that produces a distribution-ready, signed, and notarized DMG. The script gates each step so failures are caught early and reported clearly.

Pipeline stages:
1. Preflight checks — verify `CSC_NAME` is set, signing identity exists in Keychain, notarization credentials are available
2. Version bump (optional flag) — `npm version patch/minor/major` if `--bump` is passed
3. Typecheck — `pnpm run typecheck`
4. Tests — `pnpm run test`
5. Build — `pnpm run build` (electron-vite)
6. Package, sign, notarize — `electron-builder --mac` (signing + notarization handled by electron-builder config)
7. Post-build verification — `codesign --verify`, `spctl --assess`, `stapler validate`
8. Output — print the path to the final DMG and its size

Add to `package.json` scripts: `"release:mac": "node scripts/release-mac.mjs"`

## Acceptance criteria

- [ ] `pnpm release:mac` runs the full pipeline and produces a notarized DMG
- [ ] Script fails fast with a clear error if signing identity is missing
- [ ] Script fails fast if notarization credentials are not set
- [ ] Typecheck or test failures abort the release before building
- [ ] Post-build verification runs automatically and reports pass/fail
- [ ] `--bump patch|minor|major` flag bumps version before building

## Blocked by

- `.scratch/macos-enable-notarization`
- `.scratch/macos-audit-hardened-runtime-entitlements`
