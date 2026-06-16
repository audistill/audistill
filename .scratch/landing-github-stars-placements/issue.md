---
title: Add GitHub stars to Nav, Hero, Pricing, Brew card, Footer
status: ready-for-agent
created: 2025-06-16
---

## Parent

.scratch/landing-page-visual-variety/issue.md

## What to build

Place the `GitHubStars` component (from the stars fetch issue) at all designated touchpoints across the landing page:

1. **Nav:** Small GitHub icon + star count pill on the right side, before the Download CTA button
2. **Hero section:** Subtle badge/pill near the main CTA area
3. **Pricing section:** Alongside pricing to reinforce "no lock-in" / open-source trust
4. **Brew command card:** Pair the install command with a star badge
5. **Footer:** GitHub link with star count in the footer links area

Each placement should use the graceful fallback — if stars are unavailable, show "Open Source" or "Star on GitHub" text without a number. All placements link to `https://github.com/audistill/audistill`.

Styling should be contextual: the nav badge is compact (small text, pill shape), the hero badge can be slightly larger, the pricing and footer placements are inline text-level elements.

## Acceptance criteria

- [ ] GitHub stars badge appears in Nav (before Download CTA)
- [ ] GitHub stars badge appears in Hero section (near main CTA)
- [ ] GitHub stars / open-source messaging appears in Pricing section
- [ ] GitHub stars badge appears on the Brew command card
- [ ] GitHub stars link appears in Footer
- [ ] All badges link to the GitHub repo
- [ ] Fallback renders cleanly when star count is unavailable
- [ ] Responsive: badges render appropriately on mobile (no overflow, no crowding)

## Blocked by

- .scratch/landing-extract-shared-layout (Nav and Footer must be extracted components)
- .scratch/landing-github-stars-fetch (stars component must exist)
