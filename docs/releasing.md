# Releasing

How to cut a release of Audistill for macOS.

For the full private-dev/public-snapshot workflow, see [Public release workflow](./public-release.md).

## Overview

Public releases are driven by `pnpm release:public`. The private repo keeps normal development history, while the public `audistill/audistill` repo receives one squashed source snapshot per release.

```
preflight → version bump → release-note content → typecheck → test → clean → build → package + sign + notarize → commit private release → publish public snapshot → create GitHub Release → update Homebrew tap → verify download route
```

## Prerequisites

### Apple Developer credentials

You need a Developer ID Application certificate installed in your Keychain, plus an App Store Connect API key for notarization.

| Environment variable | Description |
|---------------------|-------------|
| `CSC_NAME` | Code signing identity name (e.g., `"Developer ID Application: Your Name (TEAM_ID)"`) |
| `APPLE_API_KEY_ID` | App Store Connect API key ID |
| `APPLE_API_ISSUER` | App Store Connect API issuer UUID |
| `APPLE_API_KEY` | Path to the `.p8` private key file |

### GitHub bot token

`AUDISTILL_PUBLIC_GH_TOKEN` must be set to a token for the public publishing bot/machine user. The token needs push access to:

- `audistill/audistill`
- `audistill/homebrew-tap`

For a fine-grained PAT, grant **Contents: Read and write** and **Metadata: Read** for both repositories, then approve the token in the `audistill` organization if required.

### GitHub CLI

The `gh` CLI must be installed. The public release script passes `AUDISTILL_PUBLIC_GH_TOKEN` to `gh`, so your personal `gh auth login` is not used for the public release.

## Commands

### Bump version and publish end to end

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm release:public -- --bump patch
```

Bump levels: `patch` (0.1.0 → 0.1.1), `minor` (0.1.0 → 0.2.0), `major` (0.1.0 → 1.0.0).

The script bumps `package.json`, compiles release-note fragments, builds/signs/notarizes locally, commits and pushes the private release commit, publishes the public snapshot/release, updates Homebrew, and verifies `https://audistill.com/download`.

### Publish without bumping

Use this when `package.json` is already at the intended version:

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm release:public -- --no-bump
```

### Retry or replace an existing release

If a publish step failed after the build completed, reuse the existing `dist/` artifacts:

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm release:public -- --no-bump --skip-build --recreate
```

`--recreate` replaces the public snapshot tag and GitHub Release for the current version. Use it carefully.

### Build and verify locally (no publish)

```bash
pnpm release:mac
```

Runs typecheck, tests, build, signing, notarization, and local verification only. Useful for testing the build without publishing.

### Compile Release Notes without publishing

To compile unreleased fragments for the current `package.json` version without publishing:

```bash
node scripts/content-system.mjs compile-release-notes --version "$(node -p "require('./package.json').version")"
```

### Low-level public snapshot publish

Usually prefer `pnpm release:public`. Use `snapshot:public` directly only when the private release commit and `dist/` artifacts already exist:

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm snapshot:public -- --init --push --publish-release --update-brew
```

Useful options:

```bash
pnpm snapshot:public -- --dry-run
pnpm snapshot:public -- --recreate --push --publish-release
pnpm snapshot:public -- --public-dir ~/git/audistill_public
```

Do not use `pnpm release:mac --publish` after the private/public split. `pnpm release:mac:publish` is kept as a compatibility alias for `pnpm release:public -- --no-bump`.

## Release-note fragments

Audistill bundles local Markdown from `content/`. User-visible work should add a fragment under `content/releases/unreleased/`:

```md
---
type: added | improved | fixed
title: Short user-facing title
---

Concise user-facing Markdown body.
```

When `pnpm release:public -- --bump <level>` runs, the script uses the bumped package version, reads unreleased fragments, and generates or updates `content/releases/versions/v{version}.md`. Entries are grouped as Added, Improved, and Fixed. Consumed fragments are moved to `content/releases/archive/v{version}/` instead of being deleted.

If no unreleased fragments exist, release and recreate flows reuse an existing `content/releases/versions/v{version}.md`. Publishing fails clearly when neither unreleased fragments nor a versioned Release Note exists for the target version. The GitHub Release body uses the same bundled versioned Release Note, with the download and install boilerplate appended.

## What the script produces

| Artifact | Location | Purpose |
|----------|----------|---------|
| `Audistill-{version}-arm64.dmg` | `dist/` | Signed, notarized installer for direct download |
| `Audistill-{version}-arm64-mac.zip` | `dist/` | ZIP for electron-updater auto-updates |
| `latest-mac.yml` | `dist/` | Update manifest consumed by electron-updater |
| `Audistill.app` | `dist/mac-arm64/` | The built application bundle |

## What gets published

When `pnpm release:public` publishes:

1. **Public source snapshot** — squashed commit and tag in `audistill/audistill`
2. **GitHub Release** — tagged `v{version}`, contains DMG + ZIP + `latest-mac.yml`
3. **Homebrew tap** — `audistill/homebrew-tap` cask is updated with new version and SHA-256

## Auto-update flow

Existing installations check for updates via `electron-updater`, which reads `latest-mac.yml` from the latest GitHub Release. When a new version is found:

1. The ZIP is downloaded silently in the background
2. A banner appears at the top of the app: "Audistill v{X} is available"
3. The user clicks "Restart" to apply, or dismisses until later

## Verification steps (automatic)

The release scripts verify the build before publishing:

- `codesign --verify --deep --strict` — validates code signature
- `spctl --assess` — Gatekeeper assessment (notarization check)
- `xcrun stapler validate` — confirms notarization ticket is stapled to DMG

## Troubleshooting

### "Signing identity not found in Keychain"

Ensure `CSC_NAME` matches your certificate exactly. List available identities:

```bash
security find-identity -v -p codesigning
```

### "Gatekeeper assessment failed"

Usually means notarization didn't complete. Check the Apple Developer dashboard or re-run — sometimes Apple's service has transient failures.

### "DMG not found" / "ZIP not found"

The script cleans `dist/` before building. If you see this error, electron-builder failed silently. Check its output above the error.

### Re-running after a partial failure

If the script fails during the public publish step after `dist/` was built, you can usually re-run:

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm release:public -- --no-bump --skip-build --recreate
```

If `dist/` was already cleaned or the build failed before artifacts were produced, fix the problem and rerun with `--no-bump` if the local `v{version}` release commit was already created.
