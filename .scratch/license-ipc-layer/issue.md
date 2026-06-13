---
title: "Add IPC layer (license: channels) and preload bindings"
status: done
created: 2026-06-13
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

Wire LicenseService to the renderer via IPC channels using the `license:` prefix. The renderer should be able to read license state, activate a key, deactivate, and subscribe to state changes — all through the preload bridge.

IPC channels:
- `license:get-state` — returns the current license state snapshot (state enum + metadata like days remaining, masked key, activation label)
- `license:activate` — takes a license key string, calls LicenseService.activate, returns success or typed error
- `license:deactivate` — calls LicenseService.deactivate, returns success or typed error
- `license:on-state-change` — event channel that pushes state snapshots to the renderer when LicenseService emits a state change

Preload bindings (added to the existing `contextBridge.exposeInMainWorld` in `src/preload/index.ts`):
- `window.api.license.getState(): Promise<LicenseStateSnapshot>`
- `window.api.license.activate(key: string): Promise<ActivateResponse>`
- `window.api.license.deactivate(): Promise<void>`
- `window.api.license.onStateChange(callback): () => void` (returns unsubscribe function)

The `LicenseStateSnapshot` type should include: `state` (enum), `trialDaysRemaining` (number, only in trial), `maskedKey` (string, only when licensed), `activationLabel` (string, only when licensed), `errorType` (string, only on failure).

Follow the existing IPC patterns in the codebase (ipcMain.handle + ipcRenderer.invoke for request/response, ipcRenderer.on for events).

## Acceptance criteria

- [ ] All four IPC channels registered in main process
- [ ] Preload bindings expose the license API on `window.api.license`
- [ ] TypeScript declarations updated in `src/preload/index.d.ts`
- [ ] State snapshot includes all contextual fields per state
- [ ] Activate returns typed errors (invalid-key, activation-limit, network-error) that the renderer can switch on
- [ ] State-change event fires when LicenseService transitions
- [ ] `LicenseRequiredError` from gated services is forwarded to renderer as a recognizable error type

## Blocked by

- `.scratch/license-service-state-machine/` — needs LicenseService to exist
