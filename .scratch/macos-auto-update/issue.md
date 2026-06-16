---
title: Add auto-update via electron-updater and GitHub Releases
status: ready-for-human
created: 2026-06-15
---

## What to build

Configure electron-updater to check for updates on app launch, download in the background, and prompt the user to restart when ready. Update artifacts hosted on GitHub Releases.

Setup:
- Add `publish` config to `electron-builder.yml` pointing to the GitHub repo
- electron-updater is already bundled with electron-builder — no new dependency needed
- In main process: call `autoUpdater.checkForUpdatesAndNotify()` after window is ready
- Show a non-intrusive notification when an update is downloaded ("Restart to update")
- Don't block app startup or force-update — user chooses when to restart

Release workflow:
- Bump version in `package.json`
- Run `pnpm release:mac` (produces signed+notarized DMG + zip)
- `electron-builder --publish always` uploads artifacts to a GitHub Release draft
- Manually publish the draft release when ready to ship

electron-builder.yml additions:
```yaml
publish:
  provider: github
  owner: <github-user-or-org>
  repo: <repo-name>
```

## Acceptance criteria

- [ ] `electron-builder.yml` has `publish` config for GitHub
- [ ] Main process checks for updates on launch (after a short delay to not slow startup)
- [ ] Downloaded update shows a user-facing notification (not a blocking modal)
- [ ] User can dismiss and update later, or restart immediately
- [ ] `electron-builder --publish always` uploads DMG + latest-mac.yml to GitHub Releases
- [ ] Update cycle works end-to-end: publish v0.1.1, existing v0.1.0 install detects and updates

## Blocked by

- `.scratch/macos-enable-notarization` (updates must be signed+notarized or Gatekeeper blocks the replacement binary)
