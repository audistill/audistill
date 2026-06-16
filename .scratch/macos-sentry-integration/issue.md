---
title: Integrate Sentry error reporting (main + renderer)
status: done
created: 2026-06-15
---

## What to build

Add `@sentry/electron` to capture unhandled errors and promise rejections in both the main process and renderer process. Free tier account (5K errors/month, 30-day retention).

Setup steps:
- Create a Sentry account and project (platform: Electron)
- Install `@sentry/electron`
- Initialize in main process entry (before other code runs)
- Initialize in renderer entry
- Configure DSN via environment variable or build-time define (not hardcoded — DSN is not secret but should be configurable)
- Set release version from `app.getVersion()` for tracking which version introduced a bug
- Attach `app.isPackaged` as a tag to distinguish dev crashes from production

What NOT to do:
- No performance monitoring (unnecessary cost at this stage)
- No native crash / minidump upload (stable native deps, not worth the symbol upload overhead)
- No user identification (privacy-first product)

## Acceptance criteria

- [ ] Sentry free-tier account created with an Electron project
- [ ] `@sentry/electron` initialized in main process — captures unhandled rejections and exceptions
- [ ] `@sentry/electron` initialized in renderer — captures React errors and unhandled exceptions
- [ ] Errors appear in Sentry dashboard with release version tag
- [ ] DSN is configurable (not hardcoded in source)
- [ ] Verify by triggering a test error in production build and confirming it appears in Sentry

## Blocked by

None - can start immediately
