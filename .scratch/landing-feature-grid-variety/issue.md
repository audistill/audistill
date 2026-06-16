---
title: Feature Grid visual variety (textures, borders, icon shapes)
status: done
created: 2025-06-16
---

## Parent

.scratch/landing-page-visual-variety/issue.md

## What to build

Break the visual monotony of the 6-card Feature Grid by applying differentiated treatments to individual cards. This does NOT include the hero card span (that's a separate issue) — this is about the 5 non-hero cards getting texture, border, and icon shape variety.

Specific treatments:
- **"On-device transcription" card:** Warmer border (`border-accent/10`) to signal its importance as a privacy differentiator
- **1-2 cards:** Subtle background texture — use existing `diagonal-lines` pattern at ~4% opacity or `dot-grid` at ~2% opacity behind card content
- **Icon container shapes:** Vary between `rounded-[8px]` (current square-ish) and `rounded-full` (circular) across the cards. No single shape for all — mix them based on what the icon semantically suggests
- **Hover states:** Slightly varied border-accent opacities on hover across cards (not all identical `hover:border-accent/20`)

All textures/patterns already exist in `globals.css` — reuse them, don't create new ones.

## Acceptance criteria

- [ ] "On-device transcription" card has a visibly warmer border than default cards
- [ ] At least 1-2 cards have a subtle background texture (diagonal-lines or dot-grid)
- [ ] Icon containers use a mix of rounded-[8px] and rounded-full shapes across the grid
- [ ] Hover states are not all identical — some variation in border glow intensity
- [ ] No new CSS patterns created — only reuses existing globals.css textures
- [ ] Grid layout remains intact (3-column at lg, responsive collapse)
- [ ] Visual coherence maintained — variety feels intentional, not random

## Blocked by

None - can start immediately
