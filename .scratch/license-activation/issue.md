---
title: "PRD: License activation — 7-day trial + Polar license keys"
status: needs-triage
created: 2026-06-10
---

# PRD: License Activation — 7-Day Trial + Polar License Keys

## Problem Statement

Audistill is moving to an open-source + paid-binary model (VoiceInk-style): free if you build from source, $29 one-time for the notarized, auto-updating download. Today the app has no concept of a license at all — there is no way to trial it with a deadline, no way to purchase, and no way to activate a purchased license. Without this, the paid distribution channel cannot exist: users who download the official build would simply have the full app forever, and there would be no conversion mechanism funding development.

From the user's perspective: "I downloaded Audistill and want to evaluate it properly, then pay once and keep using it on my Macs — without a subscription, without creating an account, and without the app phoning home with my data."

## Solution

A trial-then-license flow modeled on VoiceInk's, built on Polar's license key system (Polar is already the chosen merchant of record — it handles payment, EU VAT, key issuance, and the customer self-service portal):

- On first launch of the official build, a **7-day full-featured trial** starts automatically. No account, no email, no key required. A subtle banner shows days remaining.
- At any time the user can buy a license on the website (Polar checkout) and receives a license key by email. They paste it into Settings → License; the app activates it against Polar's API, which enforces the per-license device limit.
- When the trial expires without a license, the app enters **library read-only mode**: every Episode, EpisodeSummary, and chat conversation already in the library remains fully viewable and searchable, but new ingests, transcriptions, summarizations, and chat messages are blocked, each blocked action pointing to the purchase/activation flow. The user's data is never held hostage.
- An activated license revalidates against Polar opportunistically in the background. The app tolerates being offline for up to **30 days** before treating the license as unverified; transient network failures never interrupt usage.
- Users can deactivate a device from inside the app (or via the Polar customer portal) to free an activation slot for a new Mac.

## User Stories

1. As a new user, I want a full-featured trial to start automatically on first launch, so that I can evaluate Audistill without entering an email, key, or payment details.
2. As a new user, I want to see how many trial days remain at a glance, so that I'm never surprised by expiry.
3. As a trial user, I want every feature available during the trial (ingest, transcription, all summary views, chat, recipes), so that my purchase decision is based on the real product.
4. As a trial user approaching expiry, I want a clear, non-intrusive heads-up in the final days, so that I can decide before losing functionality.
5. As a user whose trial expired, I want my entire existing library — episodes, transcripts, summaries, chat history — to remain viewable and searchable, so that my data is never held hostage.
6. As a user whose trial expired, I want blocked actions (new ingest, new summary, new chat message) to explain why they're blocked and link me to purchase/activation, so that the path forward is obvious.
7. As a buyer, I want to purchase with a one-time payment through Polar checkout and receive my license key by email, so that there is no subscription and no account to maintain.
8. As a buyer, I want to paste my license key into the app and activate in one step, so that unlocking takes seconds.
9. As a buyer, I want clear, specific error messages when activation fails (invalid key, device limit reached, network error), so that I know whether to retype, deactivate another Mac, or retry later.
10. As a licensed user, I want my license status visible in Settings (key masked, activation state, device usage), so that I can confirm I'm in good standing.
11. As a licensed user, I want the app to work normally when I'm offline, so that a flight or network outage never locks me out of an app I paid for.
12. As a licensed user, I want background revalidation to be silent and non-blocking, so that licensing never interrupts my work.
13. As a licensed user replacing my Mac, I want to deactivate the old device from within the app or via the Polar portal, so that I can activate my new machine without contacting support.
14. As a licensed user who hits the device limit, I want the error to tell me where to manage my devices, so that I can resolve it myself.
15. As a licensed user whose key was refunded or revoked, I want the app to revert to the expired-trial (read-only) state rather than deleting anything, so that my local data survives even a billing dispute.
16. As a user who lost my license key email, I want to retrieve my key from the Polar customer portal using my purchase email, so that I never need to contact support.
17. As a build-from-source user, I want the app to work without any license enforcement, so that the open-source promise is real.
18. As a privacy-conscious user, I want licensing checks to transmit nothing beyond the license key and an anonymous instance identifier, so that licensing never compromises the local-first promise.
19. As the developer, I want trial state to survive app reinstalls in the common case, so that wiping and reinstalling isn't a trivial trial reset.
20. As the developer, I want all license/trial state managed by a single main-process service, so that enforcement, UI, and persistence can't drift out of sync.
21. As the developer, I want the Polar HTTP integration isolated behind a narrow client interface, so that the state machine is testable without the network and a provider switch stays cheap.

## Implementation Decisions

- **Polar is the licensing backend.** The app uses Polar's customer-portal license endpoints — activate, validate, deactivate — which require no API secret and are safe to call from a desktop client. The device limit is configured on the Polar product (single tier: $29, multi-Mac allowance) and enforced server-side via activation instances. No self-hosted licensing server.
- **LicenseService (new main-process service) is the single deep module** owning the entire state machine. States: `trial` (with started/expiry timestamps), `trial-expired`, `licensed` (with key, activation id, last-validated timestamp), `license-invalid`. It exposes current state, an activate-with-key operation, a deactivate operation, and a state-change event. Nothing outside this service computes license logic.
- **PolarClient (new, thin)** wraps the three Polar endpoints and maps their responses/errors to a small internal result type. Injected into LicenseService so tests run against a fake.
- **Persistence in the existing SQLite database** via the existing database service: a key-value style license/trial record (trial start, license key, activation id, last successful validation). Reuses the existing migration mechanism. Storing trial start in the user-data directory means a full app-data wipe resets the trial — accepted; determined users can always build from source anyway, so anti-tamper effort beyond this is deliberately minimal.
- **Trial: 7 days, full-featured, starts on first launch** of an enforcement-enabled build. No clock-tamper countermeasures beyond persisting the start timestamp (rationale above).
- **Expiry behavior: library read-only.** Enforcement happens in the main process at the entry points of the ingest pipeline, summarization service, and chat service — gated operations are rejected with a typed "license required" error when state is `trial-expired` or `license-invalid`. Read paths (library browsing, search, viewing transcripts/summaries/chat history, export of existing data) are never gated.
- **Offline grace: 30 days.** Revalidation runs in the background on launch and periodically; a successful validation refreshes the last-validated timestamp. Validation failures distinguish "network unreachable" (keep `licensed` until grace expires) from "Polar says invalid/revoked" (transition to `license-invalid` immediately). Grace expiry without any successful validation transitions to `license-invalid` until the next successful check.
- **IPC surface:** one channel exposing license state snapshots/changes to the renderer, plus invocable activate and deactivate actions. Renderer never talks to Polar directly.
- **Renderer UI:** trial banner with days remaining (prominent in last 2 days), Settings → License pane (key entry, masked key display, status, deactivate button, link to Polar portal), and a purchase/activation prompt surfaced by blocked actions in read-only mode.
- **Open-source builds:** enforcement is compiled in but the official-distribution flag (build-time) controls whether the trial clock applies. Source builds run unrestricted. The licensing code itself stays in the open repo — obscurity is not the security model; Polar's server-side activation limit is.

## Testing Decisions

- Tests assert **external behavior only**: state transitions, returned errors, and emitted events — never internal timers, private fields, or call ordering.
- **LicenseService** (highest value): trial countdown and expiry, activation success/failure paths, revoked-key handling, offline grace window (clock injected, not slept), state-change events. Run against a fake PolarClient.
- **PolarClient**: mapping of Polar API responses and error shapes (valid, invalid key, activation limit reached, network failure) to the internal result type, using recorded response fixtures.
- **Gating enforcement**: ingest, summarization, and chat entry points reject with the typed license error in `trial-expired`/`license-invalid` states and pass through in `trial`/`licensed` states.
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

## Further Notes

- Mirrors VoiceInk's proven flow (7-day trial → Polar key → portal self-service), which this audience already understands; their docs are useful reference material for support copy.
- Polar's activate/deactivate endpoints intentionally require no authentication, which is what makes a serverless desktop integration possible.
- The README's "$29 one-time / free from source" framing depends on this feature shipping before the repo goes public alongside the paid download.
- Error copy should follow the brand voice ("calm and confident, never loud") — especially the trial-expired state, which should feel like an invitation, not a wall.
