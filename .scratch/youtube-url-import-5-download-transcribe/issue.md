---
title: "YouTube URL import: download → transcribe → complete (happy path with progress)"
status: ready-for-agent
created: 2026-06-10
---

## Parent

`.scratch/youtube-url-import/issue.md`

## What to build

The end-to-end happy path: user clicks "Import" on the preview card → episode is created → audio downloads with visible progress → feeds into existing transcription pipeline → temp file deleted → episode complete.

**Episode creation (on "Import" click):**
- Create episode row: `title` from metadata, `file_path = null`, `source_url = canonical URL`, `source_meta = JSON.stringify({ channel, uploadDate, thumbnail })`, `status = 'downloading'`
- Close the URL import popover
- Episode appears in sidebar with "downloading" status
- Broadcast episode update to renderer

**Download phase:**
- Create temp directory `~/.audistill/tmp/` if it doesn't exist
- Call ytdlp-service `download(url, ~/.audistill/tmp/{episodeId}, { customArgs, onProgress })`
- yt-dlp uses `-x` (extract audio, native format — no forced re-encoding), output path controlled via `-o`
- Broadcast download progress to renderer via existing `ingest-progress` IPC pattern, with a phase indicator distinguishing download from transcription progress
- On download complete: determine actual output filename (yt-dlp chooses the extension)

**Transcription phase:**
- Pass the temp file path to the existing `preprocess()` → transcription worker flow (same as local file episodes)
- Update status to `'transcribing'`, broadcast progress as usual
- On transcription complete: delete the temp file, leave `file_path` as NULL
- Continue to summarization (existing pipeline recipe execution)
- On summarization complete: status → `'complete'`

**Progress display in sidebar:**
- The renderer needs to handle the new `'downloading'` status — show download percentage
- Transition to transcription progress display when status changes to `'transcribing'`

**Settings wiring:**
- Read `ytdlp_custom_args` from settings, pass to download call

**IPC wiring:**
- New handler: `ingest:add-url` — receives canonical URL + metadata, creates episode, queues for processing
- Modify the queue processor to handle URL episodes (check `source_url` present + `file_path` null → download first)

## Acceptance criteria

- [ ] Clicking "Import" on preview card creates episode with correct source_url and source_meta
- [ ] Popover closes after import, episode visible in sidebar as "downloading"
- [ ] Download progress (percentage) is displayed in the sidebar for the episode
- [ ] Audio downloads to `~/.audistill/tmp/{episodeId}.{ext}` in native format (no re-encoding)
- [ ] After download, episode transitions to "transcribing" with transcription progress
- [ ] Temp file is deleted after successful transcription
- [ ] Episode `file_path` remains NULL after completion
- [ ] Summarization runs after transcription (same as local file episodes)
- [ ] Episode reaches "complete" status with transcript and auto-generated tab
- [ ] Custom args from settings are applied to the yt-dlp download command
- [ ] Title from metadata is used (not overwritten by basename logic meant for local files)

## Blocked by

- `.scratch/youtube-url-import-4-preview-card/issue.md` (needs the preview card + Import button)
