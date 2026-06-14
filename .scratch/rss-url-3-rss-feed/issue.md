---
title: "RSS/URL support: RSS feed end-to-end"
status: done
created: 2026-06-14
---

## Parent

`.scratch/rss-and-url-support/issue.md`

## What to build

Full vertical slice for importing episodes from an RSS/Atom feed. The user pastes a feed URL, sees a multi-select preview list, picks episodes, and each selected item becomes an Episode that downloads via HTTP and flows through Ingest.

**Feed service** (new, main process): Uses `rss-parser` library to fetch and parse RSS 2.0 / Atom feeds (including iTunes podcast extensions). Exposes via IPC handler `feed:fetch-metadata(url)`. Returns structured result:
- Feed-level: title, image URL, feed URL
- Item-level (array): title, pubDate, duration (from `itunes:duration`), description, enclosure URL, guid

**Preview list UI**: After classification returns `'rss'`, the popover transitions to `preview-list` showing:
- Feed-level: title + image at the top
- Item list: checkboxes + title + publication date + duration per row
- Show most recent 50 items by default; "Show all" button if feed has more
- Multi-select: user checks one or more items, then clicks Import

**Batch Episode creation**: On import, each selected item becomes an independent Episode with:
- `source_type: 'rss'`
- `source_url`: the enclosure URL
- `source_meta`: `{ feedUrl, feedTitle, feedImage, pubDate, description, duration }`
- `status: 'downloading'`

All created Episodes enter the existing sequential queue. Each downloads via `HttpDownloadService` (from slice 2), then transcribes and summarizes independently. One failing Episode does not block others.

**Error handling**: Malformed XML or network errors during feed fetch show an inline error in the popover. Individual Episode failures after import follow existing error patterns (status: 'error', retryable).

## Acceptance criteria

- [ ] Pasting an RSS/Atom feed URL shows `preview-list` with feed title and image
- [ ] Item list shows title, publication date, and duration per item
- [ ] Only most recent 50 items shown initially; "Show all" reveals the rest
- [ ] User can select multiple items via checkboxes
- [ ] Import creates one Episode per selected item with `source_type: 'rss'`
- [ ] `source_meta` contains feedUrl, feedTitle, feedImage, pubDate, description, duration
- [ ] Each Episode downloads from its enclosure URL via `HttpDownloadService`
- [ ] Episodes process sequentially through the existing queue
- [ ] One Episode failing does not prevent others from completing
- [ ] Malformed feed XML shows a clear error in the popover
- [ ] Network error during feed fetch shows a clear error in the popover
- [ ] iTunes podcast extensions (duration, image) parsed correctly
- [ ] Atom feeds handled in addition to RSS 2.0
- [ ] Unit tests for `FeedService` with RSS and Atom fixtures
- [ ] Integration test: multi-item import creates correct Episodes and queues them

## Blocked by

- `.scratch/rss-url-2-direct-media-link/issue.md` (depends on `HttpDownloadService`)
