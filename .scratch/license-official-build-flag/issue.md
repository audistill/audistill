---
title: "Add __OFFICIAL_BUILD__ flag and wire into build config"
status: done
created: 2026-06-13
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

A build-time constant `__OFFICIAL_BUILD__` that controls whether license enforcement is active. Defaults to `false` in source (dev builds skip enforcement). The release/CI build configuration sets it to `true`.

Wire it into the electron-vite (or equivalent) build config so that:
- `pnpm dev` → `__OFFICIAL_BUILD__ = false`
- `pnpm build` (local) → `__OFFICIAL_BUILD__ = false`
- Release CI build → `__OFFICIAL_BUILD__ = true` (via an environment variable or explicit define override)

Add a TypeScript global declaration so the constant is recognized without import.

The LicenseService already checks this flag (from the state machine issue) — this issue is solely about defining and injecting the constant at the build layer.

## Acceptance criteria

- [ ] `__OFFICIAL_BUILD__` is available as a global constant in main-process code
- [ ] TypeScript declaration file declares the global (no type errors)
- [ ] Default value is `false` in all local builds (dev and production builds from source)
- [ ] A documented mechanism (env var or config override) allows CI to set it to `true`
- [ ] Dev builds run with enforcement disabled (verified by checking LicenseService behavior in dev mode)

## Blocked by

- `.scratch/license-service-state-machine/` — the flag must be consumed by LicenseService
