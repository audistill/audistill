---
title: Canvas button glow animation
status: done
created: 2026-06-04
---

## What to build

Add a subtle pulse/glow animation to the CanvasToggleButton (the document-with-pencil icon in EpisodeView) to teach users the canvas feature exists. The glow fires once per session per episode — the first time a user views an episode, the button pulses for ~2-3 seconds, then settles to its normal state. Viewing the same episode again in the same session does not retrigger.

Track "already seen" state in a module-level Set or React ref (not persisted — resets on app restart).

## Acceptance criteria

- [ ] Canvas button shows a subtle glow/pulse animation on first render of each episode per session
- [ ] Animation lasts ~2-3 seconds then stops cleanly
- [ ] Revisiting the same episode in the same session does not retrigger the animation
- [ ] Visiting a different episode triggers the animation for that new episode
- [ ] Animation is subtle (not distracting) — a soft glow or opacity pulse, not a bouncing icon
- [ ] Button size and placement remain unchanged

## Blocked by

None - can start immediately
