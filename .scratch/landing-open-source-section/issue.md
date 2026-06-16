---
title: Open-source section between Pricing and FAQ
status: done
created: 2025-06-16
---

## Parent

.scratch/landing-page-visual-variety/issue.md

## What to build

Add a medium-weight open-source section positioned between the Pricing and FAQ sections.

**Content:**
- Headline: "See exactly how your data is handled. Every line, auditable." (or similar transparency/trust angle)
- 1-2 sentences of supporting copy connecting open source to the privacy promise
- "Star on GitHub" button/link using the GitHubStars component with live star count
- Link target: `https://github.com/audistill/audistill`

**Styling:**
- Medium block — not a full-bleed section, not a single-line banner. Somewhere between: a centered content block with comfortable padding.
- No heavy visuals (no contribution graph, no repo screenshot)
- Use existing design tokens — subtle surface treatment, maybe a border or accent glow
- Should feel like a confident statement, not a sales pitch

## Acceptance criteria

- [ ] Section renders between Pricing and FAQ
- [ ] Headline communicates transparency/trust angle
- [ ] Live GitHub star count displayed (via GitHubStars component)
- [ ] Graceful fallback when stars unavailable
- [ ] "Star on GitHub" links to the correct repo
- [ ] Visual weight is "medium" — not overwhelming, not dismissible
- [ ] Responsive: reads well on mobile
- [ ] Section has an appropriate scroll anchor (e.g., `#open-source`) if needed for nav

## Blocked by

- .scratch/landing-github-stars-fetch (needs the stars component)
