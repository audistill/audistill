---
title: Create Developer ID Application certificate and install in Keychain
status: ready-for-human
created: 2026-06-15
---

## What to build

Generate a "Developer ID Application" certificate and install it in the local login Keychain. This certificate is what electron-builder uses to sign the app for direct distribution outside the Mac App Store.

Steps:
- Open Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority (save to disk)
- In the Apple Developer portal → Certificates → create new → "Developer ID Application"
- Upload the CSR, download the resulting `.cer` file
- Double-click to install in the login Keychain
- Verify with `security find-identity -v -p codesigning` — should show "Developer ID Application: Your Name (TEAM_ID)"

## Acceptance criteria

- [ ] `security find-identity -v -p codesigning` shows a valid "Developer ID Application" identity
- [ ] The certificate is not expired and chain is trusted (no yellow warning in Keychain Access)

## Blocked by

- `.scratch/macos-enroll-apple-developer`
