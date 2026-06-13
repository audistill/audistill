---
title: "Implement Settings → License pane (all four states)"
status: done
created: 2026-06-13
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

A License section in the existing Settings view that shows license status and provides activation/deactivation controls. The pane renders differently based on the current license state.

**Trial state:**
- "Trial — X days remaining"
- License key input field + "Activate" button
- "Buy Audistill" link (→ Polar checkout URL, opens in system browser)
- "Learn more" link (→ landing page URL, opens in system browser)

**Trial-expired state:**
- "Trial ended"
- License key input field + "Activate" button
- "Buy Audistill" + "Learn more" links

**Licensed state:**
- "Licensed" badge/indicator
- Masked key display (e.g. `****-E304DA`)
- Activation device label (e.g. "Gabor's MacBook Pro")
- "Deactivate" button
- "Manage license" link (→ Polar customer portal URL)

**License-invalid state:**
- Explanation text: "License could not be verified" (network) or "License revoked" (revoked)
- License key input field (to re-enter or try a new key)
- "Buy Audistill" + "Manage license" links

**Activation errors (inline below key input):**
- Invalid key (404): "This key wasn't recognized. Double-check for typos."
- Device limit (403): expanded inline section explaining the limit, with a link to the Polar portal to manage devices
- Network error: "Couldn't reach the license server. Check your connection and try again."

All actions go through `window.api.license.activate()` / `window.api.license.deactivate()`. Error copy follows the brand voice — calm and confident.

## Acceptance criteria

- [ ] License section appears in Settings view
- [ ] Correct layout rendered for each of the four states
- [ ] Key input + Activate button works: calls activate, shows loading state, handles success (transitions to licensed)
- [ ] Deactivate button works: calls deactivate, shows loading state, handles success
- [ ] Inline error messages for all three failure modes (invalid key, device limit with portal link, network error)
- [ ] "Buy Audistill" opens Polar checkout in system browser
- [ ] "Learn more" opens landing page in system browser
- [ ] "Manage license" opens Polar customer portal in system browser
- [ ] Masked key display shows last 6 characters only
- [ ] Pane reactively updates on state changes
- [ ] Error copy follows brand voice (calm, not hostile)

## Blocked by

- `.scratch/license-ipc-layer/` — needs preload bindings for activate/deactivate/state
