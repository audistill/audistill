---
title: "RSS/URL support: duplicate marking in RSS preview"
status: done
created: 2026-06-14
---

## Parent

`.scratch/rss-and-url-support/issue.md`

## What to build

When showing the RSS feed preview list, mark items that have already been imported so the user can see which episodes are new vs. already in their Library.

**Duplicate check**: When the feed is parsed and the preview list is about to render, query existing Episodes by `source_url` matching the enclosure URLs of the feed items. Items with a matching Episode appear greyed out and are not selectable.

**IPC extension**: Extend the existing duplicate check (currently YouTube-only via `ytdlpCheckDuplicate`) to a generic `ingest:check-duplicates(urls: string[])` handler that accepts an array of URLs and returns the subset that already exist as Episodes. This batch query avoids N individual IPC calls for large feeds.

**RSS guid storage**: Store the RSS `<guid>` element in `source_meta` for each imported Episode. Not used for dedup today (enclosure URL is the primary key), but preserved as a fallback for future use when podcasts change CDN URLs.

**Re-paste behavior**: When a user pastes the same feed URL again (e.g., to check for new episodes), the preview list shows new items as selectable and previously-imported items as greyed out. No caching — always fetches fresh.

## Acceptance criteria

- [ ] Already-imported items appear greyed out / visually distinct in the preview list
- [ ] Already-imported items are not selectable (checkboxes disabled or absent)
- [ ] Duplicate detection uses `source_url` (enclosure URL) matching
- [ ] Batch duplicate check works efficiently for large feeds (single DB query, not N queries)
- [ ] RSS `<guid>` is stored in `source_meta` on import
- [ ] Re-pasting the same feed shows new items as selectable, old items as greyed out
- [ ] Direct media links also check for duplicates (same URL already imported → show "Already imported" in preview-single, consistent with existing YouTube behavior)
- [ ] Unit test: batch duplicate check returns correct matches
- [ ] Visual state clearly distinguishes importable vs. already-imported items

## Blocked by

- `.scratch/rss-url-3-rss-feed/issue.md`
