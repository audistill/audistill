---
title: GitHub stars fetch with graceful fallback
status: done
created: 2025-06-16
---

## Parent

.scratch/landing-page-visual-variety/issue.md

## What to build

Create a reusable server-side mechanism to fetch the live star count from `https://api.github.com/repos/audistill/audistill`. This should be a Next.js server component helper or ISR-cached fetch that other components can consume.

Key behaviors:
- Cache the response for ~1 hour (GitHub API rate limit is 60 req/hour unauthenticated)
- Graceful fallback: if the API returns 404, a non-200 status, or the repo is private, return `null` instead of a count
- Consuming components decide how to handle `null` (hide count, show "Open Source" text, etc.)

Expose a `GitHubStars` component (or similar) that renders: GitHub icon + formatted star count (e.g., "1.2k"). When count is `null`, render a fallback variant (just "Star on GitHub" or "Open Source" — configurable via prop).

## Acceptance criteria

- [ ] Star count is fetched server-side with ISR or equivalent caching (~1 hour revalidation)
- [ ] Returns `null` gracefully when repo is private, missing, or API errors
- [ ] Reusable component renders star count with GitHub icon
- [ ] Fallback rendering when count is unavailable (no broken UI, no error)
- [ ] No client-side fetch or loading spinner — data available at render time via server component

## Blocked by

None - can start immediately
