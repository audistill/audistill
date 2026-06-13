---
title: "Implement LicenseService state machine"
status: done
created: 2026-06-13
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

The core LicenseService — a main-process service owning the license/trial state machine. It orchestrates PolarClient and the license database record to determine the current license state and expose state transitions.

States: `trial`, `trial-expired`, `licensed`, `license-invalid`

Transitions:
- First launch (no `trial_started_at` in DB) → write `trial_started_at = now`, state = `trial`
- `trial` + 14 days elapsed → `trial-expired`
- `trial`/`trial-expired` + successful activate → `licensed`
- `licensed` + validate returns revoked/disabled → `license-invalid`
- `licensed` + 30 days since `last_validated_at` without successful validate → `license-invalid`
- `license-invalid` + successful validate → `licensed`

Key behaviors:
- **Validate-first on activate:** when the user enters a key, call validate first. If an existing activation's `meta.machineId` matches the local machine ID (from `node-machine-id`), reuse that activation ID instead of creating a new one. Only call activate if no matching activation exists.
- **Revalidation on launch:** on service initialization (app launch), if state is `licensed`, call validate. On success, update `last_validated_at`. On network failure, keep `licensed` (grace window). On revoked/disabled, transition to `license-invalid`.
- **`__OFFICIAL_BUILD__` check:** if the build flag is `false`, immediately set state to `licensed` and skip all logic (no DB reads, no network calls).
- **Deactivate:** allowed from any state with a local `activation_id`. Calls PolarClient.deactivate, clears `activation_id` and `license_key` from DB, transitions to `trial-expired` (or `trial` if days remain).
- Emits a state-change event (EventEmitter pattern) that the IPC layer will subscribe to.

Constructor dependencies (injected): DatabaseService (for license record), PolarClient, a clock function (for testable time), machine ID string.

## Acceptance criteria

- [ ] LicenseService class exported from `src/main/license-service.ts`
- [ ] Computes correct state from database record on initialization
- [ ] Trial starts on first launch, expires after 14 days
- [ ] Activation with validate-first logic (reuses existing activation if machine ID matches)
- [ ] Revalidation on init updates `last_validated_at` or transitions state appropriately
- [ ] 30-day offline grace window: state stays `licensed` until grace expires
- [ ] Immediate `license-invalid` on revoked/disabled response
- [ ] Deactivate clears local state and calls PolarClient
- [ ] `__OFFICIAL_BUILD__ = false` bypasses all enforcement (returns `licensed` immediately)
- [ ] Emits state-change events on every transition
- [ ] All tests use injected clock and fake PolarClient — no real time or network
- [ ] Tests cover: fresh trial start, trial expiry, activate (new device), activate (existing device via validate-first), revalidation success, revalidation network failure within grace, revalidation network failure after grace, revocation, deactivation, official-build bypass

## Blocked by

- `.scratch/license-db-migration/` — needs the license table and access methods
- `.scratch/license-polar-client/` — needs the PolarClient for API calls
