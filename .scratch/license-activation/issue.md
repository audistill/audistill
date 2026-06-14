---
title: "PRD: License activation — 14-day trial + Polar license keys"
status: needs-triage
created: 2026-06-10
updated: 2026-06-13
---

# PRD: License Activation — 14-Day Trial + Polar License Keys

## Problem Statement

Audistill is moving to an open-source + paid-binary model (VoiceInk-style): free if you build from source, $29 one-time for the notarized, auto-updating download. Today the app has no concept of a license at all — there is no way to trial it with a deadline, no way to purchase, and no way to activate a purchased license. Without this, the paid distribution channel cannot exist: users who download the official build would simply have the full app forever, and there would be no conversion mechanism funding development.

From the user's perspective: "I downloaded Audistill and want to evaluate it properly, then pay once and keep using it on my Macs — without a subscription, without creating an account, and without the app phoning home with my data."

## Solution

A trial-then-license flow modeled on VoiceInk's, built on Polar's license key system (Polar is already the chosen merchant of record — it handles payment, EU VAT, key issuance, and the customer self-service portal):

- On first launch of the official build, a **14-day full-featured trial** starts automatically. No account, no email, no key required. A persistent thin banner at the top of the window shows days remaining.
- At any time the user can buy a license via the Polar checkout (linked directly from the banner and Settings → License) and receives a license key by email. They paste it into Settings → License; the app activates it against Polar's customer-portal API, which enforces the per-license device limit.
- When the trial expires without a license, the app enters **library read-only mode**: every Episode, EpisodeSummary, and chat conversation already in the library remains fully viewable and searchable, but new ingests, transcriptions, summarizations, recipes, and chat messages are blocked. Each blocked action triggers an inline prompt pointing to purchase/activation. The user's data is never held hostage.
- An activated license revalidates against Polar on each app launch. The app tolerates being offline for up to **30 days** before treating the license as unverified; transient network failures never interrupt usage.
- Users can deactivate a device from inside the app (or via the Polar customer portal) to free an activation slot for a new Mac. Deactivation is allowed from any state where an activation ID exists locally.

## User Stories

1. As a new user, I want a full-featured trial to start automatically on first launch, so that I can evaluate Audistill without entering an email, key, or payment details.
2. As a new user, I want to see how many trial days remain at a glance via a persistent banner, so that I'm never surprised by expiry.
3. As a trial user, I want every feature available during the trial (ingest, transcription, all summary views, chat, recipes), so that my purchase decision is based on the real product.
4. As a trial user approaching expiry, I want the banner to become more visually prominent in the final 2 days, so that I can decide before losing functionality.
5. As a user whose trial expired, I want my entire existing library — episodes, transcripts, summaries, chat history — to remain viewable and searchable, so that my data is never held hostage.
6. As a user whose trial expired, I want blocked actions (new ingest, new summary, new recipe, new chat message) to show an inline prompt explaining why and linking to purchase/activation, so that the path forward is obvious.
7. As a buyer, I want to purchase with a one-time payment through Polar checkout (linked directly from the app) and receive my license key by email, so that there is no subscription and no account to maintain.
8. As a buyer, I want to paste my license key into the app and activate in one step, so that unlocking takes seconds.
9. As a buyer, I want clear, specific inline error messages when activation fails (invalid key, device limit reached, network error), so that I know whether to retype, deactivate another Mac, or retry later.
10. As a licensed user, I want my license status visible in Settings (key masked, activation state, device usage), so that I can confirm I'm in good standing.
11. As a licensed user, I want the app to work normally when I'm offline, so that a flight or network outage never locks me out of an app I paid for.
12. As a licensed user, I want revalidation to happen silently on app launch, so that licensing never interrupts my work.
13. As a licensed user replacing my Mac, I want to deactivate the old device from within the app or via the Polar portal, so that I can activate my new machine without contacting support.
14. As a licensed user who hits the device limit, I want the error to tell me where to manage my devices (with a direct link to the Polar customer portal), so that I can resolve it myself.
15. As a licensed user whose key was refunded or revoked, I want the app to revert to the expired-trial (read-only) state rather than deleting anything, so that my local data survives even a billing dispute.
16. As a user who lost my license key email, I want to retrieve my key from the Polar customer portal using my purchase email, so that I never need to contact support.
17. As a build-from-source user, I want the app to work without any license enforcement, so that the open-source promise is real.
18. As a privacy-conscious user, I want licensing checks to transmit nothing beyond the license key, organization ID, and a hashed machine identifier, so that licensing never compromises the local-first promise.
19. As the developer, I want trial state to survive app reinstalls in the common case, so that wiping and reinstalling isn't a trivial trial reset.
20. As the developer, I want all license/trial state managed by a single main-process service, so that enforcement, UI, and persistence can't drift out of sync.
21. As the developer, I want the Polar HTTP integration isolated behind a narrow client interface, so that the state machine is testable without the network and a provider switch stays cheap.

## Implementation Decisions

### Polar Integration

- **Polar's customer-portal API is the licensing backend.** The app calls three unauthenticated endpoints directly — no API secret, no server proxy:
  - `POST https://api.polar.sh/v1/customer-portal/license-keys/validate`
  - `POST https://api.polar.sh/v1/customer-portal/license-keys/activate`
  - `POST https://api.polar.sh/v1/customer-portal/license-keys/deactivate`
- These endpoints require only `key` and `organization_id` in the request body. Rate limit: 3 req/s.
- Sandbox environment (`https://sandbox-api.polar.sh`) is used during development, selected via `POLAR_SANDBOX=true` environment variable. Production is the default in packaged builds.
- Both sandbox and production `organizationId` values live as constants in the PolarClient module, selected by the environment flag.
- The device limit is configured on the Polar product (single tier: $29, multi-Mac allowance) and enforced server-side via activation instances. No self-hosted licensing server.

### PolarClient

- **PolarClient (new, thin module)** wraps the three endpoints using Electron's built-in `net.fetch` (already used for OpenRouter calls). Maps Polar's responses/errors to a small internal result type. No HTTP library dependency.
- Injected into LicenseService so tests run against a fake.
- Handles three error cases from activate: 404 (invalid key), 403 (device limit reached), network failure.

### Device Identification

- **`node-machine-id`** (the only new npm dependency) provides a hashed hardware UUID as the stable device fingerprint. Used to detect "already activated on this machine" during validate-first flow.
- **`os.hostname()`** is passed as the human-readable `label` shown in Polar's customer portal (e.g. "Gabor's MacBook Pro").
- **Validate-first on reinstall:** if a user reinstalls and re-enters their key, the app calls validate first and checks existing activations for a matching machine ID before creating a new activation. This prevents silently consuming activation slots on reinstall.

### State Machine

- **LicenseService (new main-process service) is the single deep module** owning the entire state machine. States: `trial` (with started/expiry timestamps), `trial-expired`, `licensed` (with key, activation id, last-validated timestamp), `license-invalid`.
- Transitions:
  - `[first launch of official build]` → `trial`
  - `trial` + 14 days elapsed → `trial-expired`
  - `trial`/`trial-expired` + successful activate → `licensed`
  - `licensed` + validate returns "revoked"/"disabled" → `license-invalid`
  - `licensed` + 30 days without successful validate → `license-invalid`
  - `license-invalid` + successful validate → `licensed`
- Exposes current state, an activate-with-key operation, a deactivate operation, and a state-change event. Nothing outside this service computes license logic.
- Deactivation is allowed from any state where an `activation_id` exists locally.
- Revocation is detected on next app launch only — no mid-session checks.

### Persistence

- **Single-row `license` table in SQLite** (via existing database service and migration mechanism):
  - `trial_started_at` — timestamp, set on first official-build launch
  - `license_key` — string, null until activated
  - `activation_id` — string (from Polar's response), null until activated
  - `last_validated_at` — timestamp, updated on each successful validate
  - `machine_id` — hashed hardware UUID from `node-machine-id`
- SQLite lives in `~/Library/Application Support/Audistill/`, which survives normal app uninstall (drag-to-Trash doesn't delete app data on macOS). A full app-data wipe resets the trial — accepted; no Keychain or external persistence.
- No anti-tamper beyond the persisted timestamp. Determined users build from source.

### Trial

- **14 days, full-featured, starts on first launch** of an official build. No clock-tamper countermeasures.
- Trial state is computed from `trial_started_at` + 14 days vs. current time.

### Expiry Behavior

- **Library read-only.** Enforcement happens in the main process at the entry points of: ingest pipeline, summarization service, chat service, and recipe service — gated operations are rejected with a typed "license required" error when state is `trial-expired` or `license-invalid`.
- Read paths (library browsing, search, viewing transcripts/summaries/chat history, export of existing data) are never gated.
- Blocked actions remain clickable but trigger an inline prompt: "Your trial has ended — your library is still here. [Buy Audistill — $29] [Enter License Key]". Calm tone, invitation not a wall.

### Revalidation

- **On app launch only.** A successful validation refreshes `last_validated_at`. No periodic timers, no wake-from-sleep checks.
- Validation failures distinguish "network unreachable" (keep `licensed` until 30-day grace expires) from "Polar says invalid/revoked" (transition to `license-invalid` immediately).
- Grace expiry (30 days without any successful validation) transitions to `license-invalid` until the next successful check.
- Reinstall-while-offline requires one network validation before the app unlocks — accepted as an extremely rare edge case.

### Official Build Flag

- **`__OFFICIAL_BUILD__`** — a build-time constant, defaulting to `false` in source. The release CI pipeline sets it to `true`.
- When `false`, LicenseService immediately returns `licensed` state — no trial clock, no validation calls, no license table writes. Same pattern as VoiceInk's `LOCAL_BUILD` Swift flag.
- Source builders and dev-mode runs get unrestricted access without modifying code.

### IPC Surface

- **`license:` prefix** for all channels: `license:get-state`, `license:activate`, `license:deactivate`, and a state-change event channel.
- Renderer never talks to Polar directly — all network calls go through LicenseService in the main process.

### Renderer UI

- **Trial banner:** persistent, full-width, thin (32px) bar at the top of the window. Shows "Trial — X days remaining · [Enter License Key]". In the final 2 days, uses the terracotta brand accent with more urgent copy: "Trial ends tomorrow · [Buy Audistill] · [Enter Key]". Disappears entirely when licensed.
- **Settings → License pane (four states):**
  - *Trial:* days remaining, key input + Activate button, "Buy Audistill" link (→ Polar checkout), "Learn more" link (→ landing page)
  - *Trial-expired:* "Trial ended", key input + Activate button, purchase + landing page links
  - *Licensed:* "Licensed" with masked key, device info (activation label), Deactivate button, "Manage license" link (→ Polar customer portal)
  - *License-invalid:* explanation of why (network vs revoked), key input for re-entry, purchase + portal links
- **Activation errors:** inline below the key input field. Simple text for 404 (invalid key) and network errors. Richer inline expansion for 403 (device limit) with explanation and portal link.
- **Purchase flow:** primary CTA opens Polar checkout URL directly in system browser. Secondary "Learn more" link opens the landing page.

### Dependencies

- **New:** `node-machine-id` (hashed hardware UUID)
- **No other new dependencies.** HTTP via Electron's built-in `net.fetch`. No `@polar-sh/sdk`.

## Testing Decisions

- Tests assert **external behavior only**: state transitions, returned errors, and emitted events — never internal timers, private fields, or call ordering.
- **LicenseService** (highest value): trial countdown and expiry (14 days), activation success/failure paths, validate-first logic (machine ID matching), revoked-key handling, offline grace window (clock injected, not slept), state-change events. Run against a fake PolarClient.
- **PolarClient**: mapping of Polar API responses and error shapes (valid, invalid key, activation limit reached, network failure) to the internal result type, using recorded response fixtures.
- **Gating enforcement**: ingest, summarization, chat, and recipe entry points reject with the typed license error in `trial-expired`/`license-invalid` states and pass through in `trial`/`licensed` states.
- **License UI**: renderer component tests for the three surfaces (banner, settings pane, blocked-action prompt) across license states.
- Prior art: existing main-process service test suites (database, ingest pipeline, summarization, migration, tab service) establish the pattern — Vitest, services constructed with injected dependencies, behavior-level assertions.

## Out of Scope

- Multiple pricing tiers, volume/team licenses, or upgrade paths (single $29 tier only).
- "1 year of updates" enforcement — update-channel gating by purchase date is a later concern; this PRD treats a valid license as valid for all updates.
- In-app checkout/payment UI — purchase happens in the browser via Polar checkout; the app only handles key activation.
- Clock-tamper or anti-cracking hardening beyond persisted timestamps (free source build makes this pointless).
- License key retrieval/recovery UI inside the app (handled by linking out to the Polar customer portal).
- App Store distribution and its receipt-based licensing.
- Telemetry or analytics of any kind.
- Keychain persistence for license state (SQLite-only accepted).
- Mid-session revocation detection (launch-only revalidation accepted).

## Further Notes

- Mirrors VoiceInk's proven flow (14-day trial → Polar key → portal self-service), adapted for a lower price point ($29 vs VoiceInk's pricing). The longer trial (14 vs 7 days) compensates — podcast knowledge apps need time to build a library and demonstrate value.
- Polar's customer-portal endpoints (`/v1/customer-portal/license-keys/*`) are explicitly documented as "safe for public clients" and require no authentication. Confirmed stable since Dec 2024 (path migration from `/users/...`), with no deprecation signals.
- The only value embedded in the binary is `organizationId` (public by design — every client request includes it).
- The README's "$29 one-time / free from source" framing depends on this feature shipping before the repo goes public alongside the paid download.
- Error copy should follow the brand voice ("calm and confident, never loud") — especially the trial-expired state, which should feel like an invitation, not a wall.
- Rate limit on customer-portal endpoints is 3 req/s — validate on launch only, well within limits.
- No existing user base to migrate — first launch after feature ships starts a fresh trial.
