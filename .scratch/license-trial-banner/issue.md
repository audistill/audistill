---
title: "Implement trial banner (persistent top bar with escalating urgency)"
status: done
created: 2026-06-13
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

A persistent, full-width, thin (32px) banner at the top of the main window that displays trial status. Visible only during the `trial` state — hidden when licensed or expired (the expired state is handled by blocked-action prompts instead).

Banner behavior:
- Days 14–3: neutral styling, text: "Trial — X days remaining · [Enter License Key]"
- Days 2–1: terracotta accent background, text: "Trial ends tomorrow · [Buy Audistill] · [Enter Key]" (or "Trial ends in 2 days")
- "Enter License Key" navigates to Settings → License pane
- "Buy Audistill" opens the Polar checkout URL in the system browser

The banner should:
- Sit above all other content (pushes content down, not overlay)
- Subscribe to `window.api.license.onStateChange()` to reactively show/hide
- Use the existing brand palette (warm paper background, terracotta for urgency)
- Disappear immediately when state transitions to `licensed`

## Acceptance criteria

- [ ] Banner visible during `trial` state with correct days-remaining count
- [ ] Banner hidden in `licensed`, `trial-expired`, and `license-invalid` states
- [ ] Visual escalation in final 2 days (terracotta accent, more urgent copy)
- [ ] "Enter License Key" link navigates to Settings → License
- [ ] "Buy Audistill" link opens Polar checkout in system browser via `shell.openExternal`
- [ ] Banner pushes content down (not an overlay that clips content)
- [ ] Reactively updates when license state changes (e.g. disappears on activation)
- [ ] Follows existing brand typography and color tokens

## Blocked by

- `.scratch/license-ipc-layer/` — needs preload bindings to read license state
