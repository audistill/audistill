---
title: Add read_transcript_range tool for paginated transcript access
status: done
created: 2026-06-14
---

## Parent

.scratch/ai-chat-tools-v2/issue.md

## What to build

Add a `read_transcript_range` tool that returns a slice of a transcript by segment index or timestamp range. This solves the "dump entire 50k-char transcript" problem for long episodes by letting the AI request specific portions.

**Params:**
- `episode_id` (string, optional) — defaults to current episode
- `start` (string, required) — segment index (e.g. "10") or timestamp (e.g. "00:15:00")
- `end` (string, optional) — segment index or timestamp; if omitted, uses `limit`
- `limit` (number, default 50) — max segments to return

**Returns:** Array of `{ index, timestamp, text }` segments within the requested range, plus `total_segments` for context.

The tool must detect whether `start`/`end` are numeric indices or timestamp strings (HH:MM:SS format) and handle both. For plain-text transcripts, treat each line as a segment with no timestamp.

## Acceptance criteria

- [ ] Index-based range returns correct segments (e.g. segments 10-20)
- [ ] Timestamp-based range returns segments within the time window
- [ ] `limit` caps the number of returned segments
- [ ] Response includes `total_segments` so the AI knows the transcript size
- [ ] Handles plain-text (non-JSON) transcripts by treating lines as segments
- [ ] Returns an error for non-existent episode or missing transcript
- [ ] Returns an error for invalid start/end values
- [ ] Tests follow the existing `chat-tool-executor.test.ts` pattern

## Blocked by

- .scratch/ai-tools-refactor-services-bag/issue.md
