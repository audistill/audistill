---
title: Extract Nav/Footer into shared layout
status: done
created: 2025-06-16
---

## Parent

.scratch/landing-page-visual-variety/issue.md

## What to build

Extract the inline `Nav()` and `Footer()` functions from the landing page's `page.tsx` into separate component files. Wire them into the root `layout.tsx` (or a layout wrapper) so that all routes (`/`, `/privacy`, `/terms`) render with consistent navigation and footer.

Update the Nav links to: Features | Pricing | FAQ | Download CTA button (drop "Install" — redundant with the CTA). The GitHub star badge in the nav will be added in a follow-up issue.

Update the Footer to include a legal section with links: Terms (`/terms`) | Privacy (`/privacy`) | Source Code (`https://github.com/audistill/audistill`). Keep existing footer content (brand, section links, email).

Remove the standalone back-link navigation from `/privacy` and `/terms` pages since the shared Nav now handles that.

## Acceptance criteria

- [ ] Nav and Footer are separate component files (not inline in page.tsx)
- [ ] Root layout applies Nav and Footer to all routes
- [ ] `/privacy` and `/terms` pages render with full Nav and Footer
- [ ] Nav links: Features, Pricing, FAQ, Download CTA (section anchors smooth-scroll on homepage, link to `/#section` from sub-pages)
- [ ] Footer legal section shows Terms, Privacy, Source Code links
- [ ] No visual regression on the homepage Nav/Footer appearance
- [ ] Responsive: Nav and Footer render correctly on mobile viewports

## Blocked by

None - can start immediately
