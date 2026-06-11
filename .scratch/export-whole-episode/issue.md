---
title: "Export whole episode as single markdown document"
status: done
created: 2026-06-11
---

## Parent

`.scratch/copy-export-regenerate/issue.md`

## What to build

An "Export Episode" action in the episode context menu that assembles all tabs and the transcript into a single markdown document with YAML front-matter, then saves it via the native save dialog.

**ExportAssembler** (pure function module) takes episode metadata + ordered tabs + formatted transcript and produces the final document:

```
---
title: "Episode Title"
source_url: https://...     ← omitted entirely if null
duration: "1h 23m"
created_at: "2026-06-10T..."
---

## Tab Name 1

{tab 1 content}

## Tab Name 2

{tab 2 content}

## Transcript

{formatted transcript with timestamps}
```

**Duration formatting:** human-readable from `duration_sec` — e.g., `1h 23m`, `45m`, `2m`.

Tabs are ordered by their `position` field. Transcript is formatted with timestamps using the TranscriptFormatter from the transcript-formatter-copy slice.

**UI:** "Export Episode as Markdown" item added to the existing `EpisodeContextMenu` component. Only shown for episodes with status `complete`.

## Acceptance criteria

- [ ] ExportAssembler module exists as a pure function
- [ ] Produces valid YAML front-matter (parseable by Obsidian/gray-matter)
- [ ] `source_url` field omitted when null (not rendered as empty)
- [ ] Duration formatted human-readably from seconds
- [ ] Tabs concatenated as `## {tab_name}` sections in position order
- [ ] Transcript appended as final `## Transcript` section with timestamps
- [ ] Unit tests covering: all fields present, null source_url, duration formatting, multi-tab ordering, filename generation
- [ ] Suggested filename: `slugified-title.md` (no tab suffix for whole-episode)
- [ ] "Export Episode as Markdown" action in EpisodeContextMenu
- [ ] Action only available for episodes with status `complete`
- [ ] Native save dialog with pre-filled filename and `.md` filter

## Blocked by

- `.scratch/transcript-formatter-copy` — needs TranscriptFormatter for the transcript section
- `.scratch/export-single-tab` — reuses the slugification utility and save-dialog IPC pattern
