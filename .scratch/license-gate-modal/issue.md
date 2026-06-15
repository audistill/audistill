---
title: "Add license gate modal component and store state"
status: done
created: 2026-06-15
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

A dismissible modal that surfaces when a gated action is attempted in `trial-expired` or `license-invalid` state. This is the single, consistent UI entrypoint for license gating feedback — it replaces inline prompts and toasts.

Store addition (Zustand app store):
- `licenseGateModal: { open: boolean; action: string }` — `action` is a human-readable description of what was blocked (e.g. "Sending messages", "Ingesting new episodes", "Running recipes")
- `openLicenseGateModal(action: string)` — sets open to true with the action
- `closeLicenseGateModal()` — sets open to false

Modal behavior:
- Dismissible: Escape key, click outside, X button
- Reads current license state from `window.api.license.getState()` to determine headline/subtext
- Contextual line below headline: "{action} requires an active license."

Content per license state:
- `trial-expired`: Headline "Trial ended" / Subtext "Your 14-day trial has ended. Your library remains accessible."
- `license-invalid`: Headline "License inactive" / Subtext "Your license could not be verified. It may have been revoked or used on another device."

CTAs:
- Primary: "Buy Audistill" → opens `audistill.com/#pricing` in system browser, closes modal
- Secondary: "Enter License Key" → calls `openSettings()`, closes modal

Mount `<LicenseGateModal />` in `App.tsx` (reads from store, renders nothing when closed).

## Acceptance criteria

- [ ] Modal opens when `openLicenseGateModal` is called with an action string
- [ ] Modal displays correct headline and subtext for `trial-expired` state
- [ ] Modal displays correct headline and subtext for `license-invalid` state
- [ ] Contextual action line shows the blocked action (e.g. "Sending messages requires an active license.")
- [ ] "Buy Audistill" opens external URL and closes modal
- [ ] "Enter License Key" navigates to Settings and closes modal
- [ ] Modal closes on Escape key press
- [ ] Modal closes on click outside
- [ ] Modal closes on X button click
- [ ] Modal follows brand styling (warm palette, rounded corners, existing design tokens)

## Blocked by

None - can start immediately
