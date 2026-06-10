---
title: "YouTube URL import: cancel, stall detection, retry, startup temp sweep"
status: ready-for-agent
created: 2026-06-10
---

## Parent

`.scratch/youtube-url-import/issue.md`

## What to build

Resilience layer for URL imports: handle cancellation during download, stall detection timeout, retry semantics, and crash recovery.

**Cancellation during download:**
- Extend existing `ingest:cancel` IPC handler to detect when an episode is in `'downloading'` state
- When downloading: call ytdlp-service `kill(episodeId)` to terminate the yt-dlp child process
- Set episode status to `'cancelled'`, broadcast update
- Partial temp file is left on disk (cleaned up by startup sweep)
- When transcribing: existing worker termination behavior (unchanged)

**Stall detection:**
- Already implemented in ytdlp-service `download()` — 30s timeout on no progress output
- When stall is detected: process is killed, download() throws
- Ingest pipeline catches the error: set episode to `status: 'error'`, `error_message: 'Download timed out — no data received for 30 seconds'`
- Broadcast episode update

**Retry semantics:**
- Extend existing `ingest:retry` IPC handler for URL episodes
- On retry of a URL episode (identified by `source_url IS NOT NULL`): always re-download from scratch
- Delete any existing temp file for this episodeId before re-downloading (in case it exists from a prior partial attempt that wasn't swept)
- Re-queue the episode: set status to `'queued'`, clear error_message, push to queue
- Processing pipeline detects URL episode and enters download phase as normal

**Startup temp sweep:**
- Extend `recoverOrphanedEpisodes()` (called on app launch) to also:
  - Remove all files in `~/.audistill/tmp/` (rm contents, keep directory)
  - Reset any episodes stuck in `'downloading'` status to `'cancelled'`

**Edge case: app quit during download:**
- The yt-dlp process is a child process — it dies when the parent Electron process exits
- On next launch: orphan recovery resets the stuck episode, temp sweep cleans the file
- User can then retry if desired

## Acceptance criteria

- [ ] Cancel button works during download phase — kills yt-dlp process, sets status to 'cancelled'
- [ ] Cancel button still works during transcription phase (existing behavior preserved)
- [ ] Stall timeout (30s no progress) kills yt-dlp and sets episode to error with descriptive message
- [ ] Retry on a failed URL episode re-downloads from scratch (does not reuse partial temp file)
- [ ] Retry clears error_message and resets status to 'queued'
- [ ] On app startup: all files in `~/.audistill/tmp/` are deleted
- [ ] On app startup: episodes stuck in 'downloading' status are reset to 'cancelled'
- [ ] After crash + restart: user can retry the failed episode successfully

## Blocked by

- `.scratch/youtube-url-import-5-download-transcribe/issue.md` (needs the download pipeline to exist)
