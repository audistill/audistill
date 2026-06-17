---
title: Landing page visual variety, open-source social proof, and shared layout
status: done
created: 2025-06-16
---

## Problem Statement

The Audistill landing page uses card-like elements extensively across sections (Feature Grid, Use Cases, FAQ, Pricing), but most cards within each section are visually identical. The Feature Grid (6 cards) is the worst offender — it reads as a flat, repetitive grid. The page also lacks open-source social proof (GitHub stars), has no shared layout (Nav/Footer are inline in page.tsx, missing from /privacy and /terms), and the legal pages need content adapted to Audistill's architecture.

## Solution

Inject visual variety into card sections through texture, scale, rotation, and border treatments. Add live GitHub star counts at natural touchpoints. Extract Nav/Footer into shared components applied across all routes. Update Terms and Privacy pages with content appropriate for a local-first Electron audio app that uses OpenRouter for LLM features.

## User Stories

1. As a visitor scanning the Feature Grid, I want visual cues that differentiate features, so that my eye is drawn through the section rather than glazing over identical cards.
2. As a visitor, I want to see a "hero" feature card (Ask, Search, Create) that communicates the AI's tool-use capabilities at a glance, so that I understand this is more than a chatbot.
3. As a visitor, I want to see GitHub star counts in the navigation, so that I immediately gauge community trust.
4. As a visitor evaluating pricing, I want to see that the app is open source, so that I feel confident about transparency and longevity.
5. As a visitor, I want a dedicated open-source section that explains the transparency angle, so that I understand the trust story.
6. As a visitor reading the FAQ, I want a pull-quote reinforcing the privacy story, so that the "local audio" claim feels prominent and deliberate.
7. As a visitor on the /privacy or /terms page, I want the same Nav and Footer as the homepage, so that the site feels cohesive and I can navigate back easily.
8. As a visitor, I want accurate Terms of Service, so that I understand the licensing model and my rights.
9. As a visitor, I want an accurate Privacy Policy, so that I understand exactly what stays local and what goes to OpenRouter.
10. As a visitor on mobile, I want the GitHub star badge and open-source section to render cleanly, so that the social proof works on all viewports.
11. As a visitor, I want the footer to include links to Terms, Privacy, and Source Code, so that I can find legal and transparency info from any page.
12. As a visitor hovering over Feature Grid cards, I want varied micro-interactions (different border glows, icon shapes), so that the section feels crafted rather than templated.

## Implementation Decisions

### Feature Grid Visual Variety

- **Hero card ("Ask, Search, Create"):** Spans 2 columns at `lg:` breakpoint. Left side: icon + title + description. Right side: a decorative mini chat mockup showing a user message ("Find every mention of churn across last month's interviews") and a compact result card (3 matches with timestamps). Uses the existing `card-glow` treatment plus a warmer border (`border-accent/20`).
- **Surface texture variation:** 1-2 non-hero cards receive a subtle background texture (diagonal-lines at 4% opacity or dot-grid at 2% opacity) — textures already exist in globals.css.
- **Icon container variation:** Mix `rounded-[8px]` (current) with `rounded-full` across cards. The hero card gets `rounded-full` with `ring-1 ring-accent/10`.
- **Warmer border on one card:** "On-device transcription" gets `border-accent/10` to signal importance.

### FAQ Pull-Quote

- Insert a non-question element between FAQ items 3 and 4.
- Content: *"Your audio never leaves your machine. Transcription happens entirely on-device."*
- Styling: Lora italic font, left accent border, `bg-accent/[0.03]`, distinct from the FAQ card pattern.

### GitHub Stars Integration

- Fetch live star count from `https://api.github.com/repos/audistill/audistill` via Next.js server component or ISR-cached API route.
- Graceful fallback: if API returns 404 or repo is private, hide the star count and show only "Open Source" or "Star on GitHub" text.
- **Placement locations:**
  - Nav: small GitHub icon + star count pill (right side, before Download CTA)
  - Hero section: subtle badge/pill near the main CTA
  - Pricing section: reinforce "no lock-in" messaging
  - Brew command card: pair install with star badge
  - Footer: GitHub link with star count
  - Dedicated open-source section

### Open-Source Section

- **Position:** Between Pricing and FAQ sections.
- **Weight:** Medium block — headline + 1-2 sentences + "Star on GitHub" button with live count. No heavy visuals (no contribution graph).
- **Headline angle:** Transparency/trust — "See exactly how your data is handled. Every line, auditable."
- **Repo link:** `https://github.com/audistill/audistill`

### Shared Layout

- Extract `Nav()` and `Footer()` from `page.tsx` into separate component files.
- Move them into the root `layout.tsx` (or a layout wrapper) so all routes (`/`, `/privacy`, `/terms`) share them.
- **Nav links:** Features | Pricing | FAQ | GitHub ★ badge | Download CTA button (drop "Install" — redundant with Download CTA).
- **Footer legal section:** Terms | Privacy | Source Code (link to GitHub repo).

### Terms of Service Page

- Adapted from VoiceInk's structure for Audistill's architecture.
- Key sections: Acceptance, License (open source + commercial compiled version), Cloud Services (OpenRouter for LLM — text only, never audio), Restrictions, Updates, Refund Policy (14 days), Disclaimer, Limitation of Liability.
- Clarify: audio processing is always local; only transcribed text is sent to OpenRouter when user provides an API key.

### Privacy Policy Page

- Adapted from VoiceInk's structure.
- Key sections: Introduction (privacy-first, local by default), Data We Collect (local: transcripts, tabs, audio, settings; cloud opt-in: text sent to OpenRouter), Data Storage (local SQLite, OS keychain for API keys), Data Retention (user-controlled), Third-Party Services (OpenRouter), Privacy Rights (access, delete, export, opt-out), Data Security, Children's Privacy.
- Clarify: audio never leaves the machine; only text goes to the LLM provider.

## Testing Decisions

- **Visual changes (cards, textures, layout):** No automated tests — verify via `pnpm dev` in the `landing/` directory and visual inspection in browser at multiple breakpoints (mobile, tablet, desktop).
- **GitHub stars fetch:** Test the API route/component with a mock that returns a star count and one that returns 404 — verify graceful fallback (no star count shown, no errors).
- **Shared layout:** After extraction, verify that `/privacy` and `/terms` routes render with Nav and Footer by navigating to them in the dev server.
- **Responsive:** Check hero card 2-col span collapses to single column on mobile.
- Use the E2E verification approach from CLAUDE.md: `pnpm dev` in landing, then browser inspection.

## Out of Scope

- Light mode landing page (follows system preference — already handled by design tokens).
- Mobile hamburger menu (single-page site, minimal nav links — not needed yet).
- Actual open-source license choice (GPL, MIT, etc.) — that's a separate decision.
- CMS or dynamic content for legal pages — static markdown-in-JSX is fine for now.
- SEO optimization or OpenGraph metadata beyond what already exists.
- Use Cases section card wrappers — already have excellent internal variety, no changes needed.
- Pricing section redesign — only adding open-source messaging alongside existing layout.

## Further Notes

- The landing page is a separate Next.js project at `landing/` with its own `package.json`.
- Design tokens are defined in `landing/src/app/globals.css` via `@theme inline` (Tailwind v4).
- Existing decorative patterns (dot-grid, diagonal-lines, geo-rings, mesh gradients, card-glow hover) should be reused — no new CSS patterns needed for the texture variations.
- The GitHub API has a 60 req/hour rate limit for unauthenticated requests. Use ISR with a revalidation period (e.g., 1 hour) or cache the response server-side to avoid hitting limits.
- VoiceInk (tryvoiceink.com) legal pages serve as the template for Terms and Privacy content, adapted for Electron + OpenRouter architecture.
