---
title: "Implement PolarClient with validate/activate/deactivate"
status: done
created: 2026-06-13
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

A thin PolarClient module that wraps Polar's three customer-portal license key endpoints using Electron's built-in `net.fetch`. It maps Polar's HTTP responses and errors to a small internal result type that the LicenseService will consume.

Endpoints:
- `POST /v1/customer-portal/license-keys/validate` — body: `{ key, organization_id, activation_id? }`
- `POST /v1/customer-portal/license-keys/activate` — body: `{ key, organization_id, label, meta? }`
- `POST /v1/customer-portal/license-keys/deactivate` — body: `{ key, organization_id, activation_id }`

Base URLs:
- Production: `https://api.polar.sh`
- Sandbox: `https://sandbox-api.polar.sh`

Environment selection: read `process.env.POLAR_SANDBOX` — if truthy, use sandbox URL and sandbox org ID. Otherwise production. Both org IDs are constants in the module.

Internal result types the client returns (not Polar's raw shapes):
- `ValidateResult`: `{ status: 'granted' | 'revoked' | 'disabled', activation?: { id, label, meta }, expiresAt?: string }`
- `ActivateResult`: `{ activationId: string, licenseKey: { status, limitActivations } }`
- `DeactivateResult`: `{ success: true }`
- `PolarError`: `{ type: 'invalid-key' | 'activation-limit' | 'network-error' | 'unknown', message: string }`

The client should be a class with constructor accepting an optional config (for dependency injection in tests), and methods: `validate()`, `activate()`, `deactivate()`.

## Acceptance criteria

- [ ] PolarClient class exported from a new `polar-client.ts` module in `src/main/`
- [ ] Uses `net.fetch` for HTTP calls (consistent with existing OpenRouter calls)
- [ ] Correctly selects sandbox vs production base URL based on `POLAR_SANDBOX` env var
- [ ] Maps 200 responses to typed internal results
- [ ] Maps 404 → `invalid-key` error, 403 → `activation-limit` error, network failure → `network-error`
- [ ] Unit tests use recorded response fixtures (no real network calls)
- [ ] Tests cover: successful validate, successful activate, successful deactivate, invalid key, activation limit reached, network timeout

## Blocked by

None — can start immediately.
