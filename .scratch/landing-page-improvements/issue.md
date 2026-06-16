---
title: "Landing page improvements: new copy, simplified pipeline, feature grid, FAQ, CTA hierarchy"
status: done
created: 2026-06-15
---

## Parent

[PRD: Marketing launch](.scratch/marketing-launch/issue.md)

## What to build

Rework the landing page (`/landing`) to improve clarity of positioning and conversion. A cold visitor should understand what Audistill is within 5 seconds. The page currently leads with a cryptic headline and an over-engineered pipeline schematic. This issue implements the full set of copy and structural decisions below.

### Hero section

- **Badge:** Change "Built exclusively for Apple Silicon" → "Runs entirely on your Mac"
- **Headline:** "Your audio, distilled."
- **Subheadline:** "Transcribe, summarize, and search everything you've heard — locally, in minutes."
- **Third line (keep as-is):** "Your machine. Your models. Your knowledge base."
- **CTA hierarchy flip:** Primary button = "Download for Mac" (styled like the current accent button). Secondary = brew install command block below it. Remove the current "Start distilling" button and "or" layout.
- **App screenshot placeholder:** leave as-is (no changes to the window chrome mock)

### Pipeline section (replace current schematic)

Replace the entire current 4-stage schematic (Ingest → Transcribe → Distill → Knowledge Base, ~250 lines) with 3 simple steps displayed as clean cards or a horizontal row:

1. **"Drop it in"** — "Files, YouTube links, RSS feeds, or paste a URL."
2. **"Distill it"** — "Transcribed on-device in minutes. Summarized by any model you choose."
3. **"Work with it"** — "Search it. Ask it questions. Surface patterns. Create from it."

Keep the section header but simplify it. Remove blueprint aesthetic (PROC.03 labels, diagonal lines, connector pipes, branching sub-features). The goal is to communicate simplicity, not architecture.

### Feature Grid (new section, after Pipeline)

Add a new section with 6 feature items in a 2x3 or 3x2 grid. Each item: small icon, plain-language title, one-line technical detail.

1. **Multi-source ingest** — "Files, YouTube links, RSS feeds, or any URL. One field, auto-detected."
2. **On-device transcription** — "30-50x realtime on Apple Silicon. Audio never leaves your machine."
3. **Bring your own model** — "Use any LLM with your own API key. No markup, no middleman."
4. **Custom templates** — "Define how content gets shaped. We call them Recipes — run on any transcript."
5. **Chat with your library** — "Ask questions across episodes. Surface patterns. Generate new content."
6. **Full-text search** — "Find anything across every transcript and every generated document."

### Use Cases section

Keep all 5 existing cards unchanged. Only change: update section position in page order (moved after Feature Grid).

### Pricing section

No changes.

### FAQ section (new, between Pricing and Install)

Add a new FAQ section with 6 items. Use a clean accordion or simple stacked Q&A layout consistent with the existing design system.

1. **"Is my audio sent to the cloud?"** — No. Transcription runs entirely on your Mac using Apple Silicon. Audio files never leave your machine. AI features (summaries, chat) use your own API key — calls go directly from your Mac to the provider you choose.
2. **"What does 'bring your own model' mean?"** — You provide your own API key (e.g., OpenRouter, Anthropic, OpenAI). Audistill sends your transcript to the model you pick for summaries and chat. Typical cost: a few cents per episode. We never see your key or your data.
3. **"What happens after the 14-day trial?"** — The app remains viewable — you can browse your library, read transcripts, and search. Ingest, chat, and recipe execution require a license to continue.
4. **"Is this a subscription?"** — No. One-time purchase, lifetime updates. Pick the tier that matches how many Macs you own.
5. **"What Mac do I need?"** — Any Mac with Apple Silicon (M1 or later). macOS 13 Ventura or newer. Intel Macs are not supported.
6. **"Can I build from source instead of buying?"** — The source code is available. You can build and run it yourself. The paid download gives you a signed, notarized binary with auto-updates and supports continued development.

### Install section

- Primary: "Download for Mac" button (large, accent-styled, links to DMG download)
- Secondary: brew command block below (smaller, current styling)
- Keep existing "or download the .dmg →" link text updated to match new hierarchy
- Keep surrounding copy: "14 days free. No credit card. Just audio in, knowledge out."

### Footer

- Keep: logo, "Audistill" wordmark, email link, "Built for Apple Silicon"
- Add: section anchor links (Features, Pricing, FAQ, Install)
- Add: Privacy Policy and Terms links pointing to `/privacy` and `/terms` (placeholder pages — create minimal Next.js pages that render "Coming soon" or similar)

### Page section order (final)

Reorder `page.tsx` components to:

```
Nav → Hero → Pipeline → FeatureGrid → UseCases → Pricing → FAQ → Install → Footer
```

### Global constraints

- Dark mode only (no `prefers-color-scheme` handling needed)
- No social proof elements
- No open-source mentions
- Maintain existing design system (colors, typography, spacing, animations)

## Acceptance criteria

- [ ] Hero badge reads "Runs entirely on your Mac"
- [ ] Hero headline is "Your audio, distilled." with shimmer accent on "distilled"
- [ ] Hero subheadline is "Transcribe, summarize, and search everything you've heard — locally, in minutes."
- [ ] Hero primary CTA is a "Download for Mac" button; brew command is secondary below it
- [ ] Pipeline section shows exactly 3 steps with titles and one-liners (no schematic/blueprint aesthetic)
- [ ] Feature Grid section exists with 6 items between Pipeline and Use Cases
- [ ] Use Cases section is unchanged (5 cards) but positioned after Feature Grid
- [ ] FAQ section exists between Pricing and Install with 6 questions and answers
- [ ] Install section leads with DMG download button, brew command secondary
- [ ] Footer includes section anchors (Features, Pricing, FAQ, Install) and links to `/privacy` and `/terms`
- [ ] `/privacy` and `/terms` routes exist and render placeholder content
- [ ] Page section order matches: Hero → Pipeline → FeatureGrid → UseCases → Pricing → FAQ → Install
- [ ] Page renders correctly, no layout or styling regressions
- [ ] `pnpm build` passes without errors

## Blocked by

None — can start immediately.
