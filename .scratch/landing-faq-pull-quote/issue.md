---
title: FAQ pull-quote insertion
status: done
created: 2025-06-16
---

## Parent

.scratch/landing-page-visual-variety/issue.md

## What to build

Insert a non-question pull-quote element between FAQ items 3 and 4 to break the visual rhythm and reinforce the privacy story.

**Content:** "Your audio never leaves your machine. Transcription happens entirely on-device."

**Styling:**
- Lora italic font (the accent/quote font already in the design system)
- Left accent border (vertical bar in `accent` color)
- Background: `bg-accent/[0.03]` — barely-there warmth
- Visually distinct from the FAQ card pattern — should NOT look like a question/answer item
- Slightly different padding/margin to create breathing room

This is a statement, not a collapsible FAQ item. No expand/collapse behavior.

## Acceptance criteria

- [ ] Pull-quote renders between FAQ items 3 and 4
- [ ] Text reads: "Your audio never leaves your machine. Transcription happens entirely on-device."
- [ ] Uses Lora italic font
- [ ] Has a left accent border
- [ ] Has subtle warm background (bg-accent/[0.03] or similar)
- [ ] Visually distinct from FAQ cards — clearly not a question
- [ ] No interactive/collapsible behavior
- [ ] Responsive: reads well on mobile

## Blocked by

None - can start immediately
