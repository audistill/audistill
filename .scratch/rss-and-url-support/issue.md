---
title: RSS feed and direct media URL support
status: done
created: 2026-06-14
---

## Problem Statement

Users want to transcribe podcast episodes and other audio/video content that lives at a URL — not just YouTube. Currently the URL import flow only recognizes YouTube links, forcing users to manually download audio files from podcast feeds or direct links before importing them. This is a high-friction workflow for the most common non-YouTube use case: podcasts distributed via RSS.

## Solution

Extend the existing URL import popover to accept three URL types — YouTube, RSS feed, and direct audio/video link — detected automatically from a single text field. RSS feeds display a multi-select preview list so the user can pick one or more episodes to import. Direct media links show a single-item preview with an editable title. Each selected item becomes an Episode entering the existing sequential Ingest pipeline, downloaded via a new HTTP download service (no yt-dlp needed for non-YouTube sources).

## User Stories

1. As a podcast listener, I want to paste an RSS feed URL and see a list of episodes, so that I can pick which ones to transcribe without downloading files manually.
2. As a user browsing an RSS preview, I want to see title, publication date, and duration for each item, so that I can identify the episodes I want.
3. As a user, I want to select multiple RSS items at once and import them all, so that I can batch-process a series without repeating the flow.
4. As a user importing from RSS, I want already-imported episodes to be visually marked in the preview list, so that I don't create duplicates.
5. As a user, I want to paste a direct link to an MP3 or video file and get a preview showing filename and file size, so that I can confirm it's the right file before importing.
6. As a user importing a direct link, I want to edit the title before importing, so that the episode has a meaningful name instead of a URL slug.
7. As a user, I want to paste any supported URL into the same text field without choosing a type, so that the import flow stays simple regardless of source.
8. As a user who pastes an unsupported URL (e.g., a SoundCloud page or HTML blog post), I want a clear error explaining what URL types are accepted, so that I'm not confused by a silent failure.
9. As a user importing from RSS, I want the feed's artwork and title shown in the preview, so that I can confirm I'm looking at the right podcast.
10. As a user, I want download progress visible in the sidebar for each episode, so that I know HTTP downloads are progressing (same as YouTube downloads today).
11. As a user whose RSS import partially fails (e.g., 3 of 5 episodes succeed), I want each episode to fail independently, so that one bad enclosure URL doesn't block the others.
12. As a user, I want to retry a failed HTTP download, so that transient network issues are recoverable without re-doing the import flow.
13. As a user, I want the app to follow HTTP redirects transparently, so that CDN-hosted podcast files work without manual intervention.
14. As a user importing a direct link to an unsupported format (e.g., .flac or .wma), I want a clear error at preview time, so that I know before creating an episode.
15. As a user, I want RSS feed metadata (feed title, feed image, feed URL) stored on each imported episode, so that future features (grouping by feed, subscription-like views) are possible.
16. As a user who pastes the same RSS feed again later, I want to see which items are new vs. already imported, so that I can quickly grab just the latest episodes.
17. As a user, I want the preview list to show the most recent 50 items by default with a "Show all" option, so that large feeds don't overwhelm the UI.
18. As a user importing a direct media link, I want the pipeline to generate a proper title from the transcript (via the Pipeline Recipe), so that even if I don't edit the title manually, it becomes meaningful after processing.

## Implementation Decisions

### URL classification strategy

A single text input auto-detects the URL type via sequential sniffing:
1. YouTube regex match (instant, local) → YouTube path (existing flow)
2. HTTP HEAD request on the URL (follows redirects)
3. Content-Type routing:
   - `application/rss+xml`, `application/atom+xml`, `text/xml`, `application/xml` → RSS feed path
   - `audio/*`, `video/*` → direct media link path
   - Anything else (including `text/html`) → error: "Unsupported URL — paste a direct link to an audio/video file or an RSS feed"

### Popover state machine extension

The existing `UrlImportPopover` state machine gains a branch after the `loading` state:
- `loading` → `preview-single` (YouTube or direct link — one item)
- `loading` → `preview-list` (RSS — multi-select list with checkboxes)

Same component, different render based on classification result. No separate popover for feeds.

### RSS feed handling

- Parsing runs in the main process via `rss-parser` library (handles RSS 2.0, Atom, iTunes podcast extensions)
- New IPC handler: `feed:fetch-metadata(url)` returns structured feed result
- Preview shows: feed-level title + image, then item list with title + pubDate + duration
- Display most recent 50 items initially, "Show all" if more exist
- Each selected item becomes an independent Episode on import

### Direct media link handling

- Valid formats (whitelist): mp3, mp4, m4a, wav, ogg, webm, flac, aac, opus — formats the transcription engine (via ffmpeg preprocessing) can consume
- Preview shows: URL, inferred filename (from URL path), file size (from Content-Length), content-type badge
- Title field uses `InlineEdit` component (existing reusable pattern: auto-focus, select-all, Enter/Escape/blur)
- Default title: filename stem from URL path; pipeline will override with generated title if user doesn't edit

### New `HttpDownloadService` module (main process)

- Plain HTTP downloader: `download(url, destPath, onProgress): Promise<void>`
- Follows redirects (standard fetch behavior)
- Reports progress via Content-Length when available
- No authentication support (podcast hosting is overwhelmingly public)
- Clear error on 4xx/5xx responses
- Used by both RSS-sourced and direct-link-sourced Episodes

### Schema changes

- New column: `episodes.source_type TEXT` — enum: `'local' | 'youtube' | 'rss' | 'direct'`
- Migration backfill: existing rows get `'youtube'` (if `source_url` is set) or `'local'` (if only `file_path`)
- `source_meta` JSON shape per type:
  - YouTube (unchanged): `{ channel, uploadDate, thumbnail }`
  - RSS: `{ feedUrl, feedTitle, feedImage, pubDate, description, duration }`
  - Direct: `{ filename, contentType, fileSize }`
  - Local: `null`

### Duplicate detection

- Deduplicate on `source_url` (the enclosure URL for RSS items, the full URL for direct links)
- RSS `<guid>` stored in `source_meta` as fallback for future use
- In RSS preview list, already-imported items shown greyed out / marked

### Download routing in Ingest pipeline

- `processEpisode` checks `source_type` to pick download service:
  - `'youtube'` → `YtdlpService` (existing)
  - `'rss'` or `'direct'` → `HttpDownloadService` (new)
  - `'local'` → no download phase
- Sequential queue unchanged — batch-create all Episodes from multi-select, process one at a time
- Each Episode fails independently; no batch-level error state

### No feed-level caching

- Always fetch fresh on each paste — no subscriptions table, no periodic refresh
- Feed-level metadata preserved per-Episode in `source_meta` for future grouping features

## Testing Decisions

Tests should verify external behavior (inputs → outputs, state transitions, side effects) rather than internal implementation. Mock at the network boundary.

### Seam 1: URL classifier (`src/shared/`)

Pure function: given a URL string and Content-Type from HEAD, returns classification. Tests cover:
- YouTube regex matching (reuses existing `youtube-url.test.ts` patterns)
- Each valid Content-Type → correct classification
- `text/html` and other unsupported types → `'unsupported'`
- Edge cases: XML that isn't RSS (fails at parse, not classification)

### Seam 2: Feed service (`src/main/`)

`FeedService.fetchFeed(url): Promise<FeedResult>`. Tests mock `fetch`, provide sample RSS/Atom XML fixtures, assert:
- Correct extraction of feed-level metadata (title, image)
- Correct extraction of item-level metadata (title, pubDate, duration, enclosure URL, guid)
- Handling of missing optional fields (no duration, no image)
- Malformed XML error handling
- Network error handling

Prior art: `src/main/ytdlp-service.test.ts` (mocks child process, asserts structured output)

### Seam 3: HttpDownloadService (`src/main/`)

Tests mock `electron.net.fetch`, assert:
- Successful download writes file to dest path
- Progress callback receives incremental updates
- Redirect following (3xx → final URL)
- 4xx/5xx → typed error
- Network failure mid-download → typed error

Prior art: `src/main/ytdlp-service.test.ts` (same pattern, different transport)

### Seam 4: Ingest pipeline download routing

Existing test seam in `tests/ingest-pipeline.test.ts`. New cases:
- Episode with `source_type: 'rss'` routes to HttpDownloadService
- Episode with `source_type: 'direct'` routes to HttpDownloadService
- Episode with `source_type: 'youtube'` still routes to YtdlpService
- Multi-episode queue (simulating batch RSS import) processes sequentially

### Seam 5: Database migration

Existing seam in `migration-service.test.ts`. Test:
- `source_type` column exists after migration
- Backfill logic: existing YouTube episodes → `'youtube'`, local episodes → `'local'`

## Out of Scope

- Platform-specific URLs (SoundCloud, Spotify, Vimeo, etc.)
- Authenticated RSS feeds (private/paywalled podcasts)
- Feed subscriptions / periodic auto-refresh / notifications for new episodes
- Parallel downloads or concurrent pipeline processing
- Feed-level caching or persistence beyond per-Episode `source_meta`
- Audio playback for any episode source type
- Video-specific handling (frame extraction, video player)
- Playlist or batch YouTube URL import

## Further Notes

- The `feedUrl` + `feedTitle` + `feedImage` stored in each RSS-sourced Episode's `source_meta` is deliberately redundant (same values repeated across episodes from the same feed). This avoids a feeds table while preserving full grouping capability for a future "group by podcast" view.
- The `source_type` column enables clean routing and future UI filtering (e.g., show only podcast episodes, show only YouTube imports). Worth the migration cost over JSON-based inference.
- RSS `<guid>` is stored but not used for dedup today. It exists as a safety net for the edge case where a podcast changes CDN and all enclosure URLs shift — a future "re-sync feed" feature could match on guid.
- The supported format whitelist should match whatever ffmpeg (via audio-preprocessor) can actually decode. If the preprocessor rejects a format, the download was wasted — better to reject at preview time.
