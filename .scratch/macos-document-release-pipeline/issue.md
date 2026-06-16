---
title: Document the macOS release pipeline
status: done
created: 2026-06-15
---

## What to build

A developer-facing document covering everything needed to produce a release on a fresh machine or after credential rotation. Lives in `docs/` (not a README — a reference for the release process).

Contents:
- Prerequisites: Apple Developer Program (renewal date), Xcode CLI tools
- Certificate setup: how to create/export/import the Developer ID Application cert
- Notarization credentials: which env vars, where to generate API keys, how to rotate
- Running a release: `pnpm release:mac` usage and flags
- Troubleshooting: common failures (expired cert, notarization rejection, entitlement crash)
- Annual maintenance: cert renewal, Apple Developer Program renewal
- Secrets inventory: what sensitive values exist, where they live (Keychain, env vars), what happens if lost

## Acceptance criteria

- [ ] Document exists at `docs/release-macos.md`
- [ ] A developer with a fresh macOS machine and Apple Developer account can follow it end-to-end
- [ ] Covers certificate creation, notarization setup, and running the release script
- [ ] Lists all required environment variables with descriptions
- [ ] Includes troubleshooting section for the 3 most common failure modes

## Blocked by

- `.scratch/macos-release-script`
