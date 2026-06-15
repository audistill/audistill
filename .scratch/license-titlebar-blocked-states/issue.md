---
title: "Extend titlebar indicator for trial-expired and license-invalid states"
status: done
created: 2026-06-15
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

The existing `TrialBanner` component renders only during the `trial` state. Extend it to also render in `trial-expired` and `license-invalid` states with differentiated copy and CTA order.

The banner occupies the same position — an absolutely-positioned overlay inside the titlebar drag region, centered horizontally. It uses the terracotta accent color (`var(--accent)`) for text in both blocked states.

Copy and CTA order per state:
- `trial-expired`: "Trial ended · [Buy Audistill] · [Enter Key]"
- `license-invalid`: "License inactive · [Enter Key] · [Buy Audistill]"

Link behavior:
- "Buy Audistill" → opens `audistill.com/#pricing` in the system browser via `shell:open-external`
- "Enter Key" → calls `openSettings()` from the app store (navigates to Settings pane where LicensePane is the first section)

The existing `trial` state rendering (days remaining + "Enter License Key") stays unchanged.

## Acceptance criteria

- [ ] Banner visible in `trial-expired` state with "Trial ended · Buy Audistill · Enter Key"
- [ ] Banner visible in `license-invalid` state with "License inactive · Enter Key · Buy Audistill"
- [ ] Banner hidden in `licensed` state
- [ ] "Buy Audistill" link opens `audistill.com/#pricing` in system browser
- [ ] "Enter Key" link navigates to Settings
- [ ] CTA order differs between the two states (Buy first for expired, Enter Key first for invalid)
- [ ] Uses terracotta accent color for text in blocked states
- [ ] Does not break titlebar drag region or traffic light alignment
- [ ] Buttons remain clickable (pointer-events-auto, no-drag)

## Blocked by

None - can start immediately
