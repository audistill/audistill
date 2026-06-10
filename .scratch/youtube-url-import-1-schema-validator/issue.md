---
title: "YouTube URL import: schema migration + URL validator module"
status: done
created: 2026-06-10
---

## Parent

`.scratch/youtube-url-import/issue.md`

## What to build

A database migration that prepares the episodes table for URL-sourced episodes, and a pure URL validation module that parses/normalizes YouTube URLs.

**Schema migration:**
- Make `episodes.file_path` nullable (currently `TEXT NOT NULL`)
- Add `episodes.source_url TEXT` (nullable)
- Add `episodes.source_meta TEXT` (nullable, stores JSON blob: channel, upload date, thumbnail URL)
- Add `'downloading'` as a valid status value (no CHECK constraint exists — just document it)
- Add `getEpisodeBySourceUrl(url: string): Episode | undefined` query method to DatabaseService
- Update the `Episode` TypeScript interface to reflect nullable `file_path` and new fields

**URL validator module (shared):**
- `parseYouTubeUrl(input: string): { canonical: string; videoId: string } | { error: string }`
- Accepts: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/live/`, `youtube.com/embed/`, `m.youtube.com/watch?v=`
- Strips `&list=`, `&si=`, `&t=` and other non-essential params
- Rejects playlist URLs (`/playlist?list=`), channel URLs (`/channel/`, `/@username`), and non-YouTube URLs
- Returns canonical form: `https://www.youtube.com/watch?v={videoId}`
- Returns descriptive error string for rejected inputs ("Only YouTube video URLs are supported", "Playlist URLs are not supported — paste a single video URL")

## Acceptance criteria

- [ ] Existing episodes with `file_path` set continue to work after migration (no data loss)
- [ ] New episodes can be created with `file_path = null` and `source_url` set
- [ ] `getEpisodeBySourceUrl` returns the episode for a matching URL, undefined otherwise
- [ ] `parseYouTubeUrl` correctly parses all accepted URL patterns and extracts video ID
- [ ] `parseYouTubeUrl` rejects playlist, channel, and non-YouTube URLs with specific error messages
- [ ] `parseYouTubeUrl` strips list/si/t params and normalizes to canonical form
- [ ] TypeScript compiles without errors (Episode interface updated, nullable file_path handled at call sites)

## Blocked by

None - can start immediately
