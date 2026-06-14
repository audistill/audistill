---
title: "RSS/URL support: direct media link end-to-end"
status: done
created: 2026-06-14
---

## Parent

`.scratch/rss-and-url-support/issue.md`

## What to build

Full vertical slice for importing a direct audio/video URL (e.g., `https://example.com/episode.mp3`). The user pastes a URL, the classifier detects it as a direct media link, a preview is shown, and on confirmation the Episode downloads via HTTP and flows through the existing Ingest pipeline.

**URL import flow**: After classification returns `'direct'`, the popover transitions to `preview-single` showing:
- Inferred filename (from URL path)
- File size (from Content-Length header)
- Content-type badge (audio/video indicator)
- Editable title field using the existing `InlineEdit` component (defaults to filename stem)

**Format validation**: Whitelist of supported MIME types corresponding to formats ffmpeg can decode (mp3, mp4, m4a, wav, ogg, webm, flac, aac, opus). Unsupported formats show a clear error at preview time.

**Unsupported URL error**: When the classifier returns `'unsupported'`, show an inline error: "Unsupported URL — paste a direct link to an audio/video file or an RSS feed."

**HttpDownloadService** (new, main process): Plain HTTP downloader that fetches a URL to a local file path. Follows redirects. Reports download progress via Content-Length. Returns typed errors on 4xx/5xx or network failure. No authentication.

**Ingest pipeline routing**: `processEpisode` checks `source_type` to pick the download service. Episodes with `source_type: 'direct'` route to `HttpDownloadService`. Episodes with `source_type: 'youtube'` continue using `YtdlpService`.

**Episode creation**: Import creates an Episode with `source_type: 'direct'`, `source_url` set to the pasted URL, `source_meta` containing `{ filename, contentType, fileSize }`, and `status: 'downloading'`.

## Acceptance criteria

- [ ] Pasting a direct audio/video URL shows `preview-single` with filename, size, and type badge
- [ ] Title is editable via `InlineEdit`; default is filename stem from URL
- [ ] Unsupported MIME types show clear error at preview time (before Episode creation)
- [ ] Unsupported URLs (`text/html`, etc.) show "Unsupported URL" inline error
- [ ] Import creates Episode with `source_type: 'direct'` and correct `source_meta`
- [ ] `HttpDownloadService` downloads file to temp directory, following redirects
- [ ] Download progress is broadcast and visible in the sidebar
- [ ] Pipeline routes `source_type: 'direct'` to `HttpDownloadService` (not yt-dlp)
- [ ] After download, transcription and summarization proceed normally
- [ ] 4xx/5xx responses produce a clear error on the Episode (status: 'error')
- [ ] Network failure mid-download → Episode errors, retryable
- [ ] Unit tests for `HttpDownloadService` (success, redirects, errors, progress)
- [ ] Integration test for pipeline routing by `source_type`

## Blocked by

- `.scratch/rss-url-1-schema-classifier/issue.md`
