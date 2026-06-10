---
title: "YouTube URL import: ytdlp-service module + tests"
status: ready-for-agent
created: 2026-06-10
---

## Parent

`.scratch/youtube-url-import/issue.md`

## What to build

A deep module in the main process that encapsulates all interaction with the yt-dlp binary. This module is the only place in the codebase that spawns yt-dlp processes.

**Interface:**
- `detect(): Promise<string | null>` — check user-configured path (setting: `ytdlp_path`) first, then fall back to `which yt-dlp`. Returns the resolved binary path or null.
- `fetchMetadata(url: string): Promise<YtdlpMetadata | YtdlpError>` — spawn `yt-dlp --dump-json <url>`, parse stdout JSON, return structured object `{ title, channel, duration, thumbnail, uploadDate }` or a typed error `{ code: 'unavailable' | 'geo-restricted' | 'age-restricted' | 'extraction-failed', message: string }`.
- `download(url: string, outputPath: string, opts: { customArgs?: string, onProgress: (pct: number, speed: number, eta: number) => void }): Promise<void>` — spawn yt-dlp with `-x --newline --progress-template 'download:{"downloaded":%(progress.downloaded_bytes)s,"total":%(progress.total_bytes)s,"speed":%(progress.speed)s,"eta":%(progress.eta)s}' --progress-delta 1 -o <outputPath>`. Append custom args (split from settings string). Parse JSON progress lines from stderr, call onProgress. Implement 30s stall detection (no progress line received → kill process, throw). Throws on non-zero exit.
- `checkVersion(): Promise<string>` — run `yt-dlp --version`, return the date string (e.g. "2024.11.18").
- `kill(episodeId: string): void` — terminate the running yt-dlp child process for the given episode.
- Internal: maintain a Map of episodeId → ChildProcess for kill support.

**On failure during fetchMetadata:** after catching an extraction error, call `checkVersion()` and if the version is >30 days old, enrich the error message with "Your yt-dlp may be outdated. Try: brew upgrade yt-dlp".

**Custom args:** read `ytdlp_custom_args` from settings, split on whitespace, append to the yt-dlp command array for both fetchMetadata and download calls.

**Tests (mock child process spawning):**
- Detection: user path takes precedence over PATH; returns null when neither found
- Metadata parsing: feed real --dump-json fixtures; verify structured output; verify typed errors for various failure stderr outputs
- Progress parsing: feed JSON lines; verify onProgress receives correct percentages
- Stall detection: simulate 30s silence; verify process killed and error thrown
- Version check: parse date string; verify staleness detection (>30 days)
- Custom args: verify args from settings are appended to spawn command

## Acceptance criteria

- [ ] `detect()` returns user-configured path when set, falls back to PATH, returns null when missing
- [ ] `fetchMetadata()` returns structured metadata for valid videos
- [ ] `fetchMetadata()` returns typed errors for unavailable/geo-restricted/age-restricted/extraction-failed
- [ ] `fetchMetadata()` enriches error with upgrade suggestion when version is stale
- [ ] `download()` calls onProgress with correct percentage values parsed from JSON progress lines
- [ ] `download()` kills the process and throws after 30s of no progress output
- [ ] `download()` appends custom args from settings
- [ ] `kill()` terminates the running process for the given episode
- [ ] All tests pass with mocked child processes (no real yt-dlp binary required)

## Blocked by

None - can start immediately
