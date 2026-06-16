---
title: Feature Grid hero card — "Ask, Search, Create"
status: done
created: 2025-06-16
---

## Parent

.scratch/landing-page-visual-variety/issue.md

## What to build

Transform the "Chat with your library" feature card into a hero card that spans 2 columns at `lg:` breakpoint and communicates the AI's tool-use capabilities (not just chat).

**Left side:** Icon (rounded-full container with `ring-1 ring-accent/10`) + title "Ask, Search, Create" + description copy explaining the AI can search across your library, extract information, and create content — it's a research assistant with tool capabilities.

**Right side:** A decorative mini chat mockup showing:
- User message bubble: "Find every mention of churn across last month's interviews"
- Result card below: compact display showing "3 matches found" with 2-3 tiny timestamp entries (e.g., "Ep. 12 — 04:32", "Ep. 8 — 11:15")

The mockup is purely decorative (not interactive). Style it with the existing design tokens — frosted glass feel (`bg-surface/50`, subtle border, backdrop blur if appropriate).

Card wrapper uses `card-glow` treatment plus warmer border (`border-accent/20`). On mobile, collapses to single column with the chat mockup stacking below the text content.

## Acceptance criteria

- [ ] Card spans 2 columns at `lg:` breakpoint in the Feature Grid
- [ ] Title reads "Ask, Search, Create"
- [ ] Description communicates tool-use capabilities (search, extract, create — not just "chat")
- [ ] Right side shows a decorative chat mockup with user message and result card
- [ ] Chat mockup is static/decorative — no interactivity
- [ ] Icon uses rounded-full container with ring accent treatment
- [ ] Card uses card-glow and warmer border (border-accent/20)
- [ ] Responsive: collapses to single column on mobile, mockup stacks below text
- [ ] Grid remains valid — other cards reflow correctly around the 2-col span

## Blocked by

- .scratch/landing-feature-grid-variety (base card variety treatments should be in place first)
