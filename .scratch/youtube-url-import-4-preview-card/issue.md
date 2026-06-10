---
title: "YouTube URL import: preview card with metadata, de-duplication, and error states"
status: done
created: 2026-06-10
---

## Parent

`.scratch/youtube-url-import/issue.md`

## What to build

After yt-dlp is detected and the URL is valid, fetch video metadata and display a preview card for user confirmation before starting the import.

**Metadata fetch:**
- Call ytdlp-service `fetchMetadata(canonicalUrl)` via IPC
- Show a loading state in the popover while --dump-json runs (~1-2s)
- On success: display preview card
- On error: display inline error with guidance

**Preview card (success state):**
- Thumbnail image (loaded from `i.ytimg.com` URL returned in metadata — allowlist this domain in CSP/img-src)
- Video title (prominent)
- Channel name
- Duration (formatted as hh:mm:ss or mm:ss)
- "Import" button to confirm
- "Cancel" button to dismiss (returns to URL input or closes popover)

**De-duplication check:**
- Before showing preview: query `getEpisodeBySourceUrl(canonicalUrl)`
- If match found: show "Already imported" state instead of normal preview — display the video title and a clickable link/button that navigates to the existing episode. No "Import" button.

**Error states (shown inline in the popover, replacing the preview area):**
- Video unavailable / private / deleted: "This video is private or has been deleted."
- Geo-restricted: "This video is not available in your region."
- Age-restricted: "This video requires sign-in and cannot be imported."
- Extraction failed + stale version: "Import failed. Your yt-dlp may be outdated (installed: {date}). Try: `brew upgrade yt-dlp`"
- Extraction failed + recent version: "Import failed: {yt-dlp error message}"
- All error states show a "Try another URL" button that resets to the input state

**IPC wiring:**
- New handler: `ytdlp:fetch-metadata` — calls fetchMetadata(), returns metadata or typed error
- New handler: `ytdlp:check-duplicate` — calls getEpisodeBySourceUrl(), returns episode or null
- Expose in preload API

## Acceptance criteria

- [ ] Loading state shown while metadata is being fetched
- [ ] Preview card displays thumbnail, title, channel, and duration for valid videos
- [ ] Thumbnail loads from YouTube CDN (CSP allowlists i.ytimg.com)
- [ ] "Import" button is present and clickable on the preview card
- [ ] "Cancel" dismisses the popover without creating an episode
- [ ] Already-imported URLs show "Already imported" with link to existing episode, no Import button
- [ ] Unavailable/private/deleted videos show appropriate error message
- [ ] Geo-restricted and age-restricted videos show specific error messages
- [ ] Extraction failures show yt-dlp error + upgrade suggestion when version is stale
- [ ] All error states have a "Try another URL" reset action

## Blocked by

- `.scratch/youtube-url-import-3-ui-detection-install/issue.md` (needs the URL popover and detection flow)
