# Grill-me prompts — next-feature design alignment

Paste one prompt per session into an Opus-backed session opened in this repo.
Each prompt carries its own context so the session can start grilling immediately
and explore the codebase for anything factual.

---

## 0. ai-tab-targeting (finish in-flight work)

```
/grill-me

Topic: completing the `ai-tab-targeting` issue (.scratch/ai-tab-targeting/issue.md) — the AI's edit-vs-create logic for recipe-driven tabs.

My stance: the active (visible) tab is the default write target; slash commands and the + popover always create (or navigate to an existing same-recipe tab); natural-language refinement requests edit the active tab; the AI decides ambiguous cases and must name the targeted tab in its chat confirmation.

Grill me on every unresolved branch, including: what "ambiguous" means operationally and what the tie-breaker is; whether the AI may ever overwrite a user-edited (blank) tab without confirmation; what happens when the user asks for an edit while a generation is already streaming into that tab; whether edit_tab failures (old_text not found) retry, fall back to full rewrite, or surface to the user; and how the pipeline tab is protected from destructive edits. Explore the existing ChatService/ChatToolExecutor code before asking anything the code already answers.
```

---

## 1. Broader ingest formats

```
/grill-me

Topic: extending the ingest allowlist beyond .mp3/.m4a/.wav/.flac/.mp4 to .mov, .mkv, .webm, .aac, .ogg, .opus — and possibly to "anything FFmpeg can decode".

My stance: the product promise is "distill any audio content, including video", so silent filtering of common formats is a bug-shaped gap. FFmpeg (bundled via ffmpeg-static) already decodes all of these; the change is allowlist + tests.

Grill me on: allowlist vs. FFmpeg-probe-based acceptance (try to decode, reject on failure) and which failure modes each creates; video files with multiple audio tracks (which track wins?); files with no audio track at all; very large video files and temp-disk pressure during PCM conversion; whether the drag-and-drop filter, the file-picker filter, and the (future) watch-folder filter should share one source of truth; and what the user sees when a file is accepted but decoding fails mid-pipeline. Check src/main/audio-preprocessor and the drop-handling code in App.tsx for current behavior first.
```

---

## 2. Export / clipboard

```
/grill-me

Topic: getting distilled content OUT of PodCapture — copy and export for tabs (recipe outputs) and transcripts.

My stance: minimum viable is (a) copy-as-markdown button on every tab, (b) copy transcript with/without timestamps, (c) "Export as .md" file save per tab. No PDF, no HTML, no batch export in v1. Export is a renderer+IPC concern; content is already markdown in SQLite.

Grill me on: whether per-tab export is enough or users will immediately expect whole-episode export (all tabs + transcript in one document) and what that document's structure is; timestamp formatting in exported transcripts (keep m:ss prefixes? JSON? plain prose?); filename conventions and collision handling; whether export should include episode metadata front-matter (title, date, source file/URL) for use in Obsidian/Notion-type tools — and if yes, which fields; clipboard as rendered rich text vs. raw markdown; and whether "export" belongs in the tab context, the episode context menu, or both. Assume the markdown content shape from the episode_tabs table — verify in DatabaseService first.
```

---

## 3. URL ingestion (YouTube)

```
/grill-me

Topic: ingesting audio from URLs (primarily YouTube) via a bring-your-own yt-dlp design.

My stance: do NOT bundle yt-dlp (PO-token arms race, ToS exposure in a notarized binary, SetApp risk). Detect yt-dlp on PATH or via a user-set path in Settings; paste-URL → spawn `yt-dlp -x` to temp file → existing ingest pipeline → delete temp audio; transcript is the source of record, audio is never kept. Optional toggle: try YouTube captions first and skip transcription when available. Guided one-time install screen (brew install yt-dlp) for users without it.

Grill me on every branch: URL input surface (paste into search? dedicated field? drag a link?); how playlists and channels are handled or rejected in v1; episode metadata mapping (video title, channel, upload date → which columns?); failure taxonomy (yt-dlp missing, outdated, PO-token failure, geo/age-restricted, private video) and what the user sees for each; whether cookies-from-browser is in scope for members-only content or explicitly out; the caption-fast-path quality tradeoff (auto-captions vs. Parakeet) and whether the user is told which path produced their transcript; temp-file location and cleanup on crash; and how "audio never kept" interacts with the (rejected) audio-player idea — confirm we accept that URL episodes can never have playback. Also pressure-test the legal posture of the guided-install screen.
```

---

## 4. Timestamp → transcript navigation

```
/grill-me

Topic: making timestamps actionable by jumping to the transcript panel, instead of building an audio player.

My stance: clicking a timestamp anywhere (transcript references in tab content, future recipe citations) opens the transcript bottom panel, scrolls the virtualized list to that segment, and highlights it. No audio playback — the data model stores file paths as references only and URL ingests delete their audio, so a player would be half-broken by design. Recipes may optionally be encouraged (via prompt) to emit [m:ss] citations so summaries become verifiable.

Grill me on: how timestamps inside rendered markdown tab content become clickable (custom react-markdown component matching a [m:ss] pattern? explicit link syntax the recipes must emit?); the citation prompt-engineering branch — can we trust models to emit accurate timestamps from a transcript, and what does a wrong citation cost in trust vs. no citation; segment-resolution (a cited time falls inside which ~30s segment, and what if it falls in a gap); highlight duration and scroll behavior (center vs. top, persistent vs. fading highlight); interaction with the panel's preserved scroll position and active search; and whether this works when the transcript panel is closed (auto-open?) or the episode is still transcribing. Check the TranscriptPanel virtualization implementation before asking about scrolling mechanics.
```

---

## 5. Watch folder

```
/grill-me

Topic: a watch folder — user designates a directory; new audio/video files appearing there are auto-ingested.

My stance: this is the retention mechanic and fits the distillation identity better than RSS. One folder in v1 (not many), configured in Settings, processed through the normal pipeline into the Inbox. Files are referenced in place, never moved or copied (consistent with the existing data model).

Grill me on: detection mechanism (fs.watch vs. polling vs. chokidar) and reliability on macOS, including iCloud/Dropbox folders where files materialize gradually; the partially-written-file problem (file appears before fully copied — debounce? size-stability check?); duplicate handling (same file re-appears, file edited, file renamed — what is identity: path, hash, or both?); deletion semantics (file removed from watch folder — keep the episode? mark it orphaned?); startup catch-up (files added while app was closed); interaction with onboarding (transcription works without API key, summarization doesn't — does the pipeline tab generation queue or skip?); cost control (a user pointing it at a 500-file podcast archive on day one — cap? confirm dialog?); and whether watch-folder ingestion should be pausable. Check IngestPipeline's queue semantics first — sequential processing is already in place per the v2 PRD.
```

---

## Usage notes

- Run 0 before any other session; its outcome constrains 3 and 4 (tab targeting is the write-surface for recipe and citation output).
- 3 (URL ingestion) and 5 (watch folder) both end at IngestPipeline — if both are approved, align their entry-point design in a short follow-up session.
- Record decisions as new issues in `.scratch/` per the repo's issue-tracker convention, with PRD-style Implementation Decisions sections.
