---
title: "YouTube URL import: + dropdown, URL popover, yt-dlp detection + install screen"
status: ready-for-agent
created: 2026-06-10
---

## Parent

`.scratch/youtube-url-import/issue.md`

## What to build

The entry-point UI for URL import: transform the "+" button into a dropdown menu, add a URL input popover, wire up yt-dlp detection, and show a guided install screen when yt-dlp is missing. Also add the Settings fields for yt-dlp configuration.

**"+" dropdown menu:**
- The existing add/import button becomes a dropdown with two items: "Import files..." (existing behavior) and "Import from URL..."
- "Import files..." triggers the existing file picker dialog
- "Import from URL..." opens a popover/small modal

**URL input popover:**
- Text input field for pasting a YouTube URL
- Submit button (also triggered by Enter key)
- On submit: validate URL using `parseYouTubeUrl()` from the url-validator module
- Invalid URL: show inline error below the input (the specific rejection message from the validator)
- Valid URL: check yt-dlp detection via IPC call to ytdlp-service `detect()`

**Guided install screen (shown when yt-dlp not found):**
- Replaces the URL input content in the same popover
- Heading: "yt-dlp required"
- Body: "To import from YouTube, install yt-dlp:" followed by code block `brew install yt-dlp`
- Link to yt-dlp GitHub releases page
- "Browse..." button to select a custom binary path (writes to `ytdlp_path` setting)
- "Check again" button that re-runs detection
- When detection succeeds after "Check again" or "Browse": return to the URL input state

**Settings additions:**
- New section in SettingsView: "YouTube Import" (or similar grouping)
- "yt-dlp path" — text input with a Browse button (file picker for selecting binary). Key: `ytdlp_path`
- "yt-dlp custom arguments" — text input, placeholder: e.g. "--cookies-from-browser chrome". Key: `ytdlp_custom_args`

**IPC wiring:**
- New IPC handler: `ytdlp:detect` — calls ytdlp-service detect(), returns path or null
- New IPC handler: `ytdlp:set-path` — saves custom path to settings, re-runs detect, returns result
- Expose in preload API

## Acceptance criteria

- [ ] "+" button shows dropdown menu with "Import files..." and "Import from URL..." options
- [ ] "Import files..." preserves existing file picker behavior
- [ ] "Import from URL..." opens a popover with URL text input
- [ ] Pasting an invalid or non-YouTube URL shows inline validation error
- [ ] Pasting a playlist/channel URL shows specific rejection message
- [ ] Valid URL + yt-dlp found proceeds to next step (preview — handled by slice 4)
- [ ] Valid URL + yt-dlp missing shows guided install screen with brew instructions
- [ ] "Browse..." on install screen allows selecting a binary and saves to settings
- [ ] "Check again" re-runs detection and returns to URL input on success
- [ ] Settings page has yt-dlp path and custom arguments fields
- [ ] Settings yt-dlp path changes are reflected in subsequent detection checks

## Blocked by

- `.scratch/youtube-url-import-1-schema-validator/issue.md` (needs url-validator module)
- `.scratch/youtube-url-import-2-ytdlp-service/issue.md` (needs detect() method)
