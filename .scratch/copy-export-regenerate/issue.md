---
title: "PRD: Copy, Export & Regenerate — getting distilled content out of Audistill"
status: ready-for-agent
created: 2026-06-10
---

# PRD: Copy, Export & Regenerate

## Problem Statement

Audistill distills podcasts and videos into structured knowledge (summaries, detailed notes, full notes, custom recipes), but that knowledge is currently trapped inside the app. There is no way to copy tab content to the clipboard, export it as a file, or re-run a recipe after changing model settings. Users who want to paste summaries into Obsidian, share notes in Slack, or archive episodes as markdown files cannot do so without manually selecting and copying rendered text from the UI.

## Solution

Three actions available directly from the tab toolbar and episode context menu:

1. **Copy** — one-click clipboard write (dual-format: raw markdown + rendered HTML) for any tab, plus transcript-specific copy with or without timestamps.
2. **Export** — save any single tab or an entire episode (all tabs + transcript assembled into one document with YAML front-matter) as a `.md` file via the native save dialog.
3. **Regenerate** — re-run a tab's recipe using the current recipe prompt and model settings, with content snapshot/revert on failure.

## User Stories

1. As an Audistill user, I want to click a copy icon on any tab and have the content land on my clipboard, so that I can paste it into Notion, Obsidian, or Slack without manually selecting text.
2. As a user pasting into a rich-text editor (Notion, Google Docs, Slack), I want the clipboard to contain rendered HTML alongside raw markdown, so that headings, bold, and bullets paste correctly.
3. As a user pasting into a plain-text editor (VS Code, Obsidian source mode), I want the clipboard to contain raw markdown, so that formatting is preserved as source.
4. As a user, I want to copy the transcript with `m:ss` timestamps, so that I can reference specific moments when sharing.
5. As a user, I want to copy the transcript without timestamps as flowing paragraphs, so that I can use it as plain prose in a document.
6. As a user, I want to export a single tab as a `.md` file via a save dialog, so that I can archive or share individual outputs.
7. As a user, I want the suggested filename to include the episode title and tab name (e.g., `my-podcast--brief.md`), so that exports are identifiable without renaming.
8. As a user, I want to export an entire episode — all tabs plus transcript — as a single `.md` file, so that I have one portable document per episode for my PKM system.
9. As a user, I want the whole-episode export to include YAML front-matter (title, source URL, duration, created date), so that Obsidian and similar tools can parse metadata.
10. As a user, I want each tab rendered as an `## {tab name}` section in position order, followed by `## Transcript`, so that the document structure is predictable and scannable.
11. As a user, I want the "Export Episode" action in the episode's context menu (not buried per-tab), so that I can export everything in one action.
12. As a user who changed my preferred model or edited a recipe prompt, I want to regenerate a tab to get fresh output, so that I don't have to delete and recreate it.
13. As a user, I want regeneration to stream new content in real-time (like initial generation), so that I see progress immediately.
14. As a user, I want my old tab content preserved if regeneration fails or I cancel, so that I don't lose existing output to a transient error.
15. As a user, I want copy/regenerate/export buttons disabled while a tab is streaming, so that I don't accidentally interact with incomplete content.
16. As a user, I want the regenerate button to only appear on tabs that have a recipe (not on my freeform canvas tabs), so that the UI isn't confusing.

## Implementation Decisions

### Modules

**TranscriptFormatter** (pure function, new module)
- Input: JSON transcript segments `[{ start, end, text }]` + format option (timestamps / no-timestamps)
- Responsibilities: merge short Whisper segments at sentence boundaries; format timestamps as `m:ss` or `h:mm:ss`; for no-timestamp mode, produce flowing paragraphs with breaks at audio pauses (gaps > 2–3 seconds)
- Output: formatted string

**ExportAssembler** (pure function, new module)
- Input: episode metadata (title, source_url, duration_sec, created_at) + ordered tabs (name, content) + formatted transcript string
- Responsibilities: generate YAML front-matter; concatenate tabs as H2 sections; append transcript section; generate suggested filename (slugified title, optional tab-name suffix)
- Output: `{ content: string, suggestedFilename: string }`

**IPC handlers** (main process, thin glue)
- `export:copy-tab` — receives tab content string, converts markdown to HTML via `marked`, writes dual-format clipboard via `clipboard.write({ text, html })`
- `export:copy-transcript` — receives episode ID + format flag, fetches transcript from DB, passes through TranscriptFormatter, writes to clipboard
- `export:save-tab` — receives content + suggested filename, opens `dialog.showSaveDialog`, writes file
- `export:save-episode` — receives episode ID, assembles via ExportAssembler, opens save dialog, writes file

**Tab toolbar UI** (renderer, modification to ContentTabBar or TabContentView)
- Three icon buttons in the tab content header: copy, export-file, regenerate (conditionally shown)
- All three disabled while `streamingTabId === tabId`

**Transcript panel buttons** (renderer, modification to TranscriptPanel)
- Two buttons: "Copy" (with timestamps) and "Copy plain" (without timestamps)

**Episode context menu** (renderer, modification to EpisodeContextMenu)
- New action: "Export Episode as Markdown" — calls `export:save-episode`

**Regenerate with snapshot** (modification to content-tab-store + streaming handlers)
- On regenerate start: snapshot current `content` into local state
- On stream-end (success): discard snapshot
- On stream-error or user cancel: restore snapshot to store and persist via IPC

### Architecture

- Streaming is plain markdown (current format: `TITLE:\n---\n<body>`) — no JSON wrapper
- Existing `tabs:execute-recipe` IPC handler already triggers regeneration; no new main-process handler needed for that path
- `clipboard.write()` must be called from the main process (Electron security); renderer sends content via IPC, main writes clipboard
- `dialog.showSaveDialog` also requires main process; renderer triggers via IPC
- Filename slugification: lowercase, replace non-alphanumeric with hyphens, collapse consecutive hyphens, trim. Double-dash `--` separates title from tab name.
- Duration in front-matter: human-formatted (`1h 23m`, `45m`, `2m`) from raw `duration_sec`
- `source_url` field omitted from front-matter entirely when null (not rendered as empty string)

### Transcript formatting specifics

- Segment merging heuristic: accumulate segments until a sentence-ending punctuation (`.`, `!`, `?`) is encountered, then emit the merged line. Cap at ~150 characters per line to prevent run-ons from unpunctuated speech.
- Timestamp per merged line uses the `start` time of the first segment in that group.
- Pause-based paragraph breaks (no-timestamp mode): insert a blank line when gap between consecutive segments exceeds 2 seconds.
- Timestamp format: `m:ss` for episodes under 1 hour, `h:mm:ss` for episodes 1 hour or longer — determined once per episode from `duration_sec`.

## Testing Decisions

A good test for this feature asserts the transformation of inputs to outputs at module boundaries — not UI rendering, not Electron API calls.

**TranscriptFormatter — tested:**
- Merges short segments at sentence boundaries correctly
- Formats timestamps in `m:ss` / `h:mm:ss` based on episode duration
- Produces paragraph breaks at pauses in no-timestamp mode
- Handles edge cases: empty transcript, single segment, no punctuation in speech, very long unbroken segments

**ExportAssembler — tested:**
- Produces valid YAML front-matter with all fields
- Omits `source_url` when null
- Formats duration human-readably
- Concatenates tabs in position order with H2 headers
- Appends transcript as final section
- Generates correct slugified filenames (handles special characters, multi-word titles)
- Per-tab filename includes `--tab-name` suffix

**Not tested (verified via E2E during development):**
- IPC handlers (thin glue over tested pure functions + Electron APIs)
- UI button placement, disabled states, streaming interaction
- Clipboard content correctness (manual verification)

**Prior art:** existing tests in `src/main/__tests__/` (e.g., `ingest-pipeline.test.ts`, `resilience.test.ts`) use Vitest with the same test-file-next-to-source convention.

## Out of Scope

- PDF export
- HTML export
- Batch export (multiple episodes at once)
- Rich text editor for tab content
- Stale-recipe indicator (showing that a recipe changed since last generation)
- Export to specific apps (Obsidian vault path, Notion API)
- Drag-and-drop export
- Keyboard shortcuts for copy/export (can be added later trivially)

## Further Notes

- The `marked` library (or similar) is needed in the main process to convert markdown → HTML for the rich clipboard format. Check if it's already a dependency; if not, it's a small addition.
- The regenerate snapshot/revert behavior is the only piece that touches the streaming pipeline — it modifies the existing `startStreaming` and `endStreaming` store actions. Care needed to not regress the initial-generation flow.
- Transcript formatting logic will also be useful for the chat feature (providing formatted transcript context to the LLM) — designing it as a standalone pure module enables reuse.
