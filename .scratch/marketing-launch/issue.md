---
title: "PRD: Marketing launch — domain, landing page, demo asset, big-bang open-source launch"
status: ready-for-agent
created: 2026-06-10
---

# PRD: Marketing Launch — Domain, Landing Page, Demo Asset, Big-Bang Open-Source Launch

## Problem Statement

Audistill is nearly a sellable product — open-source + paid-binary model decided, three-tier pricing ($25/$39/$49 by device count) via Polar, license activation fully implemented and tested — but it has no deployed public surface. The domain is registered (audistill.com), the landing page is built locally (Next.js, mostly complete), Polar products are configured with checkout links, but nothing is live. A solo developer with a primary job and no marketing budget needs a launch that generates its own attention: the chosen growth engine is GitHub stars plus community launches, with the open-sourcing itself as the story.

From the user's perspective: "I heard about Audistill on Hacker News / Reddit / GitHub. In under a minute I want to see what it does, trust that it's private, download a trial, and — if it earns it — pay once."

## Solution

A single coordinated launch where everything goes public on the same day: the open-source repo, the notarized app with 14-day trial, the landing page with Polar checkout, and posts on Hacker News (Show HN) and Reddit (r/macapps and related subs). The open-source angle is the headline everywhere.

The public surface consists of: the **audistill.com** domain (registered), a **single-page marketing site** (Next.js on Vercel, already built locally in `/landing`) whose hero leads with the outcome ("One hour. Two minutes."), backed by privacy and no-subscription proof points, a primary CTA (brew install or download DMG), and a **30-second screen recording** as the hero proof asset (paste a YouTube link → transcript streams in → distilled summary → chat answer), reused as the README hero GIF. A launch-week discount via Polar discount code provides launch-day urgency.

## User Stories

1. As a Hacker News reader, I want the Show HN title to tell me what the app does and that it's open source, so that I click for the right reasons.
2. As a landing page visitor, I want to understand what Audistill does within five seconds of the hero loading, so that I don't bounce before the pitch lands.
3. As a landing page visitor, I want a muted autoplaying 30-second demo next to the hero, so that I see the product work before reading a word of copy.
4. As a privacy-conscious visitor, I want the page to state plainly that transcription is on-device and AI calls use my own key, so that I can trust the app before downloading.
5. As a subscription-fatigued visitor, I want the one-time price stated up front, so that I know there's no recurring fee before I invest time in a trial.
6. As a convinced visitor, I want one obvious download button that gets me the DMG immediately, so that nothing stands between interest and first launch.
7. As a skeptical visitor, I want a visible link to the GitHub repo, so that I can inspect the source before trusting the binary.
8. As a launch-day visitor, I want to see the launch-week price and its deadline, so that the discount actually creates urgency.
9. As a buyer, I want to pick a tier (Solo/Personal/Extended) based on how many Macs I own, so that I'm not paying for devices I don't have.
10. As a buyer, I want checkout handled by Polar with my license key emailed to me, so that purchase takes a minute and feels safe.
11. As a visitor on the fence, I want a pricing section that honestly explains free-build-from-source vs paid download, so that the open-source promise reads as confidence, not a trick.
12. As a visitor with questions, I want a short FAQ (privacy, BYOK costs, trial terms, refunds, macOS version), so that common objections are answered without leaving the page.
13. As a non-technical visitor, I want the FAQ to explain what an OpenRouter key is and roughly what summaries cost, so that BYOK doesn't silently kill my purchase intent.
14. As a GitHub visitor arriving from HN, I want the README to mirror the landing page's story and demo GIF, so that both entry points sell equally well.
15. As a GitHub visitor, I want a clear star ask with an honest rationale, so that supporting the project takes one click.
16. As a Reddit user in r/macapps, I want the launch post written for that community (one-time purchase, local-first, indie dev), so that it reads as a contribution, not an ad.
17. As an HN commenter, I want the developer present in the thread answering questions on launch day, so that the launch builds trust rather than suspicion.
18. As a mobile visitor, I want the page fully responsive with the video working on iOS Safari, so that the launch traffic spike (heavily mobile from HN) isn't wasted.
19. As the developer, I want Vercel Analytics on the page, so that I know which channel drove downloads without compromising the no-telemetry stance.
20. As the developer, I want the site in a public repo (`audistill/audistill.com`) serving GitHub Releases for auto-update, so that the update feed is accessible without embedding tokens in the app binary.
21. As the developer, I want a pre-launch checklist gating the launch date, so that the repo, app, site, and checkout are verifiably ready before anything goes public.
22. As the developer, I want the app repo history scrubbed and audited before flipping it public, so that no secrets, keys, or embarrassing scratch content ship with the launch.
23. As the developer, I want www.audistill.com redirecting to audistill.com, so that every mention resolves to one canonical URL.
24. As a post-launch visitor weeks later, I want the page to stand on its own without launch-week framing, so that the site doesn't look stale after the discount ends.
25. As an existing user, I want auto-update to fetch new versions from GitHub Releases on the public repo, so that I get updates without manual re-download.

## Implementation Decisions

- **Domain:** audistill.com is registered and canonical. DNS to be pointed at Vercel.
- **GitHub structure (ADR 0005):** GitHub organization `audistill` with two repos — `audistill/app` (private, codebase) and `audistill/audistill.com` (public, landing page + GitHub Releases for auto-update feed). The public repo doubles as the update distribution point for electron-updater.
- **Site:** Next.js 16 on Vercel, already built locally in `/landing` directory. Vercel auto-deploys from main; preview deploys for review. Vercel Analytics enabled; no other tracking, no email capture.
- **Page structure (already implemented):** Nav → Hero (outcome-led headline "One hour. Two minutes.", brew install + download CTA) → Pipeline/How it Works → Features/Use Cases → Pricing (`#pricing` anchor — the URL the app links to) → Install → Footer.
- **Pricing section (implemented):** Three-tier layout (Solo $25/1 device, Personal $39/2 devices highlighted as "Most popular", Extended $49/3 devices). Each tier links directly to its Polar checkout URL. Footer notes: all features included, lifetime updates, no subscription, BYOK.
- **URL contract with the app:** The app UI links to `https://audistill.com/#pricing` for purchase and `https://polar.sh/audistill/portal` for license management. The `#pricing` anchor MUST exist and contain tier-specific Polar checkout links.
- **Brand:** the site implements the existing brand kit — warm paper palette, terracotta accent (`#d97757`), Poppins/Inter type, 12px radii. Already applied in the current build.
- **Demo asset:** one 30-second Screen Studio recording showing paste-link → streaming transcript → summary → chat answer. Produced once, exported twice: muted autoplay MP4/WebM for the hero, trimmed GIF for the README. This asset gates launch. Currently placeholder in the hero.
- **Checkout:** Polar-hosted checkout linked directly from pricing tiers — no in-site payment UI. Checkout links already configured. Launch-week discount code configured in Polar, expiring after week one; page copy references the deadline.
- **Polar configuration (done):** Three products created with license key benefits (activation limits 1/2/3). Org ID `35976264-5788-49be-8f65-1e7cf950c958` hardcoded in app. License key prefix: `AUDISTILL`.
- **Trial:** 14 days (not 7). App remains viewable after trial — only Ingest, Chat, and Recipe execution are gated. Copy should reflect this.
- **Launch sequencing: big bang.** Repo flips public, v1 DMG is downloadable, site is live, and HN + Reddit posts go out the same day. The open-sourcing is the headline ("Show HN: Audistill — open-source Mac app that distills podcasts and YouTube into a local knowledge base"). Product Hunt and build-in-public X are explicitly skipped.
- **Channels:** Show HN plus r/macapps and selected related subreddits (r/MacOS, r/selfhosted, r/podcasts — each sub's self-promo rules verified beforehand; per-community copy, not cross-posted boilerplate). Developer commits to being responsive in threads on launch day.
- **Auto-update:** electron-updater configured to pull from GitHub Releases on the public `audistill/audistill.com` repo. `latest-mac.yml` published alongside the DMG on each release.
- **Launch-day dependency gate (all must be true before a date is set):** Apple Developer enrollment complete; app signed + notarized; landing page deployed to audistill.com with working checkout links; demo video recorded and embedded; auto-update verified end-to-end; README final with real links and GIF; LICENSE (GPL v3), CONTRIBUTING, and trademark note committed; repo history audited/scrubbed; Sentry reporting errors correctly.

## Testing Decisions

- A good test asserts externally observable behavior — a URL resolves, a page renders, a link returns 200 — not component internals or visual implementation details.
- **Site smoke test (the only automated suite):** one Playwright run asserting the page renders, the `#pricing` anchor exists, each tier's checkout link returns a valid Polar checkout page, and the GitHub link resolves. Runs in CI on deploy.
- No component or visual-regression tests — the page is reviewed on Vercel preview deploys by eye; maintenance cost of a larger suite exceeds the risk on a single static page.
- Launch-readiness items that aren't automatable (notarization, discount code, subreddit rules, history scrub) live in the dependency-gate checklist above and are verified manually.
- Prior art: none — this is the first site repo; the Playwright smoke test establishes the pattern.

## Out of Scope

- Docs site and blog/SEO comparison pages (revisit post-launch once the name has search volume).
- Email list / newsletter capture.
- Product Hunt launch and sustained X/Twitter build-in-public effort.
- Paid acquisition of any kind.
- App Store distribution and its separate product page.
- Press/media outreach and review-site seeding.
- Localization (English only at launch).
- Universal binary (Intel support) — arm64 only, Apple Silicon M1+ required.
- CI/CD for builds — local release script only at launch.

## Further Notes

- The landing page is mostly built (`/landing` directory) — remaining work is: replace screenshot placeholder with real demo asset, add FAQ section, deploy to Vercel, point DNS.
- Per-subreddit self-promo rules need verification before launch — cheap to check, should be resolved early.
- Big-bang launch means week-one bugs play out in front of the largest audience this project may ever get; the dependency gate is the mitigation, and auto-update working on day one is part of launch readiness.
- HN title and Reddit post copy deserve real drafting time — the title is the single highest-leverage sentence of the launch. Draft 3–5 candidates and pick late.
- Screen Studio (~$89 one-time) is the recommended recording tool; the demo asset is reused indefinitely (site, README, future App Store page), so the spend amortizes well.
- After the discount window, the site copy must degrade gracefully — strip launch framing rather than showing an expired offer.
- Polar account still needs branding polish (logo upload, org description) — use `build/icon.png` from the app.
