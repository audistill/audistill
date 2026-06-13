---
title: "Gate ingest, summarization, chat, and recipe services behind license state"
status: done
created: 2026-06-13
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

Add license enforcement to the entry points of the four gated services: ingest pipeline, summarization service, chat service, and recipe service. When the license state is `trial-expired` or `license-invalid`, these services reject new operations with a typed error.

The enforcement pattern:
- Each gated service receives a reference to LicenseService (via constructor injection or a shared getter)
- At the top of the operation entry point, check `licenseService.getState()`
- If state is `trial-expired` or `license-invalid`, throw/return a typed `LicenseRequiredError` with a `reason` field (e.g. `'trial-expired'` or `'license-invalid'`)
- If state is `trial` or `licensed`, proceed normally

Read paths (getting episodes, viewing transcripts, searching, exporting existing data) are NEVER gated.

The `LicenseRequiredError` should be a distinct error type that the IPC layer can recognize and forward to the renderer for UI handling.

## Acceptance criteria

- [ ] Ingest pipeline rejects new ingests in `trial-expired`/`license-invalid` states
- [ ] Summarization service rejects new summarizations in gated states
- [ ] Chat service rejects new messages in gated states
- [ ] Recipe service rejects new recipe executions in gated states
- [ ] All four pass through normally in `trial`/`licensed` states
- [ ] A typed `LicenseRequiredError` is thrown/returned (not a generic error)
- [ ] Existing read operations remain ungated (no regressions)
- [ ] Tests for each service cover: allowed in trial, allowed when licensed, rejected when trial-expired, rejected when license-invalid
- [ ] Existing service tests still pass

## Blocked by

- `.scratch/license-service-state-machine/` — needs LicenseService to check state
