---
title: YouTube URL import via bring-your-own yt-dlp
status: ready-for-agent
created: 2026-06-10
---

## Problem Statement

Users want to transcribe YouTube videos (interviews, conference talks, competitor podcasts) without manually downloading audio files first. The current ingest flow only accepts local files via drag-and-drop or file picker, forcing users to use a separate tool, save to disk, then import — a friction-heavy workflow for content that lives on YouTube.

## Solution

Add a "Import from URL" option to the existing "+" menu that accepts YouTube video URLs, downloads audio via a user-installed yt-dlp binary, and feeds it into the existing transcription pipeline. The app never bundles or auto-installs yt-dlp — it detects the binary on PATH or at a user-configured path, and provides a guided install screen when missing.

The transcript is the source of record. Audio is downloaded to a temp directory, transcribed, then deleted. URL-sourced episodes cannot play back audio — consistent with the app having no audio player.

## User Stories

1. As a researcher, I want to paste a YouTube URL and get a transcript, so that I can analyze spoken content without manual file management.
2. As a user importing a URL, I want to see a preview card (title, thumbnail, channel, duration) before import starts, so that I can confirm it's the right video.
3. As a user without yt-dlp installed, I want clear instructions on how to install it, so that I can get the feature working without leaving the app.
4. As a user with yt-dlp in a non-standard location, I want to configure a custom binary path in Settings, so that the app can find it.
5. As a user, I want to see download progress with percentage, so that I know the import is working and how long it will take.
6. As a user, I want to cancel a download in progress, so that I can abort if I imported the wrong video.
7. As a user who pastes a playlist or channel URL, I want a clear rejection message, so that I understand only single videos are supported.
8. As a user who pastes a previously-imported URL, I want to be told it already exists and linked to the episode, so that I don't create duplicates.
9. As a user whose yt-dlp is outdated, I want the error message to suggest updating, so that I can fix the issue without debugging.
10. As a user who imports a geo-restricted or private video, I want a clear error in the preview step, so that I know the video is unavailable before an episode row is created.
11. As a power user, I want a custom args field in Settings for yt-dlp, so that I can pass flags like --cookies-from-browser without the app needing explicit support.
12. As a user, I want the import popover to close after I confirm, so that I can see the episode appear in the sidebar with its download status.
13. As a user retrying a failed URL import, I want it to re-download cleanly without leftover state, so that transient network issues don't require manual intervention.
14. As a user, I want leftover temp files from crashes to be cleaned up automatically on next launch, so that disk space isn't wasted.

## Implementation Decisions

### Modules to build or modify

**1. `ytdlp-service` (new, main process)**
Deep module encapsulating all yt-dlp interaction:
- `detect()`: check user-configured path (setting: `ytdlp_path`), fall back to `which yt-dlp`. Returns path or null.
- `fetchMetadata(url)`: spawn `yt-dlp --dump-json <url>`, parse JSON, return structured metadata (title, channel, duration, thumbnail, upload date) or a typed error (unavailable, geo-restricted, age-restricted, extraction failure).
- `download(url, outputPath, onProgress)`: spawn `yt-dlp -x --newline --progress-template 'download:{"downloaded":%(progress.downloaded_bytes)s,"total":%(progress.total_bytes)s,"speed":%(progress.speed)s,"eta":%(progress.eta)s}' --progress-delta 1 -o <path> <url>`, append custom args from settings, parse JSON progress lines, call onProgress callback, implement 30s stall detection, return on completion or throw on failure.
- `checkVersion()`: run `yt-dlp --version`, return the date string.
- `kill(process)`: terminate a running yt-dlp child process.

**2. `url-validator` (new, shared)**
Pure function module:
- `parseYouTubeUrl(input)`: validate against known patterns (youtube.com/watch, youtu.be/, youtube.com/shorts/, youtube.com/live/, youtube.com/embed/, m.youtube.com), extract video ID, reject playlist/channel URLs, strip list params, return canonical URL or a rejection reason.

**3. `database-service` (modify)**
- Migration: make `file_path` nullable, add `source_url TEXT`, add `source_meta TEXT`.
- Update `Episode` interface to include new fields.
- Add `getEpisodeBySourceUrl(url)` for de-duplication check.
- Add `'downloading'` as a valid status value.

**4. `ingest-pipeline` (modify)**
- Add `addFromUrl(url, metadata)` method: creates episode with `source_url`, `source_meta` (JSON blob of channel/upload date/thumbnail), `file_path = null`, `status = 'downloading'`.
- Extend `processEpisode` to handle download phase when `source_url` is set and file needs downloading.
- Download to `~/.audistill/tmp/{episodeId}.{ext}` using ytdlp-service.
- After transcription succeeds: delete temp file, leave `file_path` as NULL.
- Extend `recoverOrphanedEpisodes()` to also sweep `~/.audistill/tmp/` on startup.
- Extend cancel to kill yt-dlp process when episode is in `downloading` state.
- On retry: always re-download (stateless retry).
- Broadcast download progress via `ingest-progress` IPC event with phase indicator.

**5. `SettingsView` (modify, renderer)**
- Add "yt-dlp path" field (text input with Browse button, key: `ytdlp_path`).
- Add "yt-dlp custom arguments" field (text input, key: `ytdlp_custom_args`).

**6. URL Import UI (new, renderer)**
- Extend "+" button to dropdown menu: "Import files..." / "Import from URL...".
- "Import from URL" opens a popover/modal with a URL text input and Submit button.
- On submit: client-side URL validation via url-validator. If invalid, inline error.
- If valid: check yt-dlp detection. If missing → show guided install screen (brew instructions, GitHub link, Browse for custom path, "Check again" button).
- If yt-dlp found: call `--dump-json`, show preview card (thumbnail, title, channel, duration). If duplicate → show "Already imported" with link. If error → show inline error with guidance (suggest update if version is stale).
- "Import" button confirms → creates episode, closes popover, download begins.

### Schema changes

- `episodes.file_path`: `TEXT NOT NULL` → `TEXT` (nullable)
- `episodes.source_url`: new `TEXT` column (nullable)
- `episodes.source_meta`: new `TEXT` column (nullable, JSON blob)
- `episodes.status`: gains `'downloading'` value
- `settings` table: new keys `ytdlp_path`, `ytdlp_custom_args`

### Architectural decisions

- yt-dlp is never bundled, installed, or auto-updated by the app. The user owns their installation.
- Audio is never persisted. Temp files live in `~/.audistill/tmp/` and are deleted after transcription or on startup sweep.
- YouTube captions are never used — always local Parakeet transcription for consistent timestamps.
- Downloads are fully sequential (one at a time), same as existing transcription queue.
- Retry always re-downloads from scratch.
- Cookies-from-browser is not explicitly supported but achievable via the custom args field.
- Only YouTube URLs are supported (not generic audio URLs).

### Error handling taxonomy

| Failure | When detected | User sees |
|---------|---------------|-----------|
| yt-dlp not found | Lazy, on first URL import attempt | Guided install screen |
| Invalid/non-YouTube URL | Client-side validation | Inline "Only YouTube URLs supported" |
| Playlist/channel URL | Client-side validation | Inline "Single videos only" |
| Duplicate URL | Preview step (DB query) | "Already imported" + link to episode |
| Video unavailable/private/deleted | Preview step (--dump-json error) | Inline error in preview area |
| Geo/age-restricted | Preview step (--dump-json error) | Inline error with explanation |
| Extraction failure (likely outdated) | Preview step, version checked on failure | Error + "Try: brew upgrade yt-dlp" |
| Network failure during download | Download phase | Episode → error status, retry available |
| Stall (30s no progress) | Download phase | Episode → error status, "Download timed out" |

## Testing Decisions

Tests should verify external behavior (inputs → outputs, side effects) rather than implementation details. Mock the child process spawning layer, not internal state.

### Module to test: `ytdlp-service`

- **Detection**: mock `which` and settings lookup; verify correct precedence (user path > PATH).
- **Metadata parsing**: feed real `--dump-json` output fixtures; verify structured metadata extraction; verify typed error returns for various failure modes.
- **Progress parsing**: feed JSON progress lines; verify callback receives correct percentages.
- **Stall detection**: simulate no output for >30s; verify process is killed and error thrown.
- **Version check**: mock `--version` output; verify staleness detection.
- **Custom args**: verify settings-provided args are appended to the command.

Prior art: `src/main/__tests__/` (existing tests for audio-preprocessor and model-manager follow the same pattern of mocking child processes and testing the wrapper logic).

## Out of Scope

- Playlist or channel import (batch URL processing)
- Non-YouTube URLs (generic audio URLs, Vimeo, SoundCloud, etc.)
- YouTube caption fast-path (using YouTube's captions instead of local transcription)
- Cookies-from-browser as a first-class feature (available via custom args only)
- Audio playback for any episode (local or URL-sourced)
- Concurrent downloads or pipeline overlap
- Auto-update of yt-dlp
- One-click install of yt-dlp from the app

## Further Notes

- The feature's legal posture: the app is a transcription tool that can accept audio from any source. It does not bundle, distribute, or auto-install yt-dlp. The guided install screen is informational (same pattern as VLC/IINA with FFmpeg).
- The `source_url` column enables future features: "open in browser" action, de-duplication, and potential re-download if the no-audio-storage policy ever changes.
- The `source_meta` JSON blob avoids schema churn — channel name, upload date, thumbnail URL are stored but not surfaced in dedicated columns until UI needs emerge.
- Upgrade path to batch/playlist import is clear: the architecture (separate download phase, sequential queue) already supports it — only needs scheduling changes and a multi-select preview UI.
