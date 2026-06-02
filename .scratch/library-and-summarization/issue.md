---
title: "PRD: PodCapture v2 — Library & Summarization"
status: done
created: 2026-06-02
---

## Problem Statement

PodCapture currently transcribes one audio file at a time and displays the result in-memory — everything is lost on window close. The raw transcript itself is not useful for retrieval or scanning; users need structured summaries to make their audio knowledge accessible. There is no way to build up a personal audio knowledge base over time.

## Solution

Transform PodCapture into a persistent local audio knowledge base. Users add audio files, which are automatically transcribed and summarized into a scannable "Rundown" format. Episodes are stored in a SQLite library with manual folder organization. A Craft.do-style sidebar + tabs + content pane layout enables fast navigation between episodes. Summarization uses OpenRouter (BYOK) with a default model of `google/gemini-3.5-flash`.

## User Stories

1. As a user, I want my transcriptions to persist after I close the app, so that I build up a knowledge base over time.
2. As a user, I want each episode automatically summarized in a structured format (lead, key details, why it matters), so that I can scan content without reading full transcripts.
3. As a user, I want to organize episodes into folders I create, so that I can group content by topic, project, or source.
4. As a user, I want a persistent sidebar showing my folder tree, so that I can navigate between episodes quickly without "going back."
5. As a user, I want to open multiple episodes in tabs, so that I can compare or switch between content without losing my place.
6. As a user, I want single-click to preview an episode (replaceable tab) and double-click to pin it (persistent tab), so that casual browsing doesn't flood me with tabs.
7. As a user, I want my open tabs to persist across app restarts, so that I can resume where I left off.
8. As a user, I want to add multiple audio files at once via a native file dialog, so that I can batch-ingest content.
9. As a user, I want to see processing status (queued, transcribing %, summarizing) in the Inbox, so that I know what's happening with my files.
10. As a user, I want new files to land in an Inbox section until I organize them, so that I have a clear landing zone for unprocessed/unsorted items.
11. As a user, I want to move episodes between folders, so that I can reorganize as my knowledge base grows.
12. As a user, I want to rename episodes, so that I can override the auto-generated title if needed.
13. As a user, I want to delete episodes, so that I can remove content I no longer need.
14. As a user, I want to create, rename, and delete folders (with nesting), so that I can build a hierarchy that matches my mental model.
15. As a user, I want to search across episode titles and summaries, so that I can find content quickly.
16. As a user, I want to configure my OpenRouter API key in settings, so that the app can call LLMs for summarization.
17. As a user, I want to select which model to use for summarization, so that I can balance cost, speed, and quality.
18. As a user, I want to add custom instructions that get appended to the summarization prompt, so that I can customize the output without breaking the base behavior.
19. As a user, I want Settings to open as a closable tab (triggered by a gear icon in the sidebar), so that it doesn't permanently occupy space.
20. As a first-time user, I want a simple onboarding flow (welcome screen → API key input → validation), so that I can verify my setup works before adding content.
21. As a user, I want the app to gracefully handle LLM failures by preserving the transcript and letting me retry summarization later, so that I never lose completed work.
22. As a user, I want the app to handle transcription failures with a clear error state and retry button, so that I can recover from bad files.
23. As a user, I want to see empty states (empty library, empty folder, empty inbox) with guidance on what to do next, so that the app never feels broken or confusing.
24. As a user, I want the episode detail view to show the summary prominently with the transcript collapsed by default, so that the most useful content is front and center.
25. As a user, I want to expand the full transcript when I need it, so that I can access the raw content without leaving the episode view.
26. As a user, I want to see a placeholder chat input on episode views, so that I know the conversational feature is coming.
27. As a user, I want the sidebar highlight to stay in sync with my active tab, so that I always know where I am in the tree.
28. As a user, I want the app to support both dark and light mode following macOS system preference, so that it feels native.

## Implementation Decisions

### Architecture

Electron app (electron-vite, React + TypeScript). Main process handles persistence, file dialogs, ingest pipeline, and LLM calls. Renderer is a React SPA with the new library UI. Communication via IPC.

### Module Design

Six modules:

1. **DatabaseService** (new, main process) — SQLite wrapper using `better-sqlite3`. Handles schema initialization, all CRUD operations for episodes, folders, tabs, and settings. Interface:
   - `init(): void` — creates tables if not exist
   - `getEpisodes(folderId?: string | null): Episode[]`
   - `getEpisode(id: string): Episode`
   - `createEpisode(data): string` — returns id
   - `updateEpisode(id, fields): void`
   - `deleteEpisode(id): void`
   - `getFolders(): Folder[]`
   - `createFolder(name, parentId?): string`
   - `updateFolder(id, fields): void`
   - `deleteFolder(id): void`
   - `getOpenTabs(): Tab[]`
   - `saveOpenTabs(tabs: Tab[]): void`
   - `getSetting(key): string | null`
   - `setSetting(key, value): void`
   - `searchEpisodes(query): Episode[]`

   Database location: `app.getPath('userData')/podcapture.db`

2. **SummarizationService** (new, main process) — OpenRouter API client. Constructs the XML prompt with base instructions + user custom instructions + transcript. Sends one request, parses JSON response. Interface:
   - `summarize(transcript: string): Promise<{title: string, summary: string}>`
   - `validateApiKey(key: string): Promise<boolean>`

   Prompt structure:
   ```xml
   <instructions>
   You are a knowledge assistant. Given the transcript below, return a JSON object with:
   - "title": short descriptive title (under 80 characters)
   - "summary": structured summary in this format:
     **The Rundown:** 1-2 sentence lead...
     **The Details:**
     * bullet 1
     * bullet 2...
     **Why It Matters:** 1-3 sentences...

   Rules:
   - Match the language of the transcript
   - Be specific (names, numbers, comparisons)
   - Summary should be 200-500 words

   {{user_custom_instructions}}
   </instructions>

   <transcript>
   {{transcript}}
   </transcript>
   ```

3. **IngestPipeline** (new, main process) — Orchestrates the full flow: receives file paths → creates episode records (status: queued) → processes sequentially: preprocess audio → transcribe → summarize → update record (status: complete). Manages a queue. Emits progress events to renderer via IPC.

   Replaces the current `transcription-service.ts` which is too coupled to single-file streaming.

   State machine per episode: `queued → transcribing → summarizing → complete | error`

4. **Renderer UI** (rewrite, renderer process) — Full React rewrite of the single-page app. Components:
   - `AppShell` — layout container (sidebar + tabs + content)
   - `Sidebar` — tree navigation, search, inbox, folders
   - `TabBar` — open tabs with preview/pin distinction
   - `EpisodeView` — detail view (title, metadata, summary, transcript)
   - `SettingsView` — API key, model, custom instructions
   - `OnboardingView` — first-launch flow
   - `EmptyState` — contextual empty states

   State management: zustand store for app state (episodes, folders, tabs, activeTab, settings).

   Visual spec: `prototypes/library-ui.html` — this prototype defines the exact layout, spacing, colors, interactions, and content structure to implement.

5. **TranscriptionService** (modified, main process) — Refactored to return the full transcript as a string (collected segments) instead of streaming segments directly to the renderer. Progress is still emitted for UI updates. The IngestPipeline calls this, collects the result, then passes it to SummarizationService.

6. **Preload/IPC** (modified) — Expanded API surface:
   - Library CRUD: `getEpisodes`, `getEpisode`, `createFolder`, `moveEpisode`, `deleteEpisode`, `renameEpisode`, etc.
   - Settings: `getSetting`, `setSetting`, `validateApiKey`
   - Ingest: `addFiles(filePaths[])` — triggers the pipeline
   - Events: `onEpisodeUpdated`, `onIngestProgress`, `onIngestComplete`, `onIngestError`
   - File dialog: `selectFiles` (multi-select, replaces single `selectFile`)
   - Search: `searchEpisodes(query)`
   - Tabs: `getOpenTabs`, `saveOpenTabs`

### Schema

```sql
CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  title TEXT,
  file_path TEXT NOT NULL,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  duration_sec INTEGER,
  transcript TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE open_tabs (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  is_preview INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

- `folder_id = NULL` on an episode means it lives in the Inbox.
- `status` values: `queued`, `transcribing`, `summarizing`, `complete`, `error`.
- IDs generated as UUIDs (`crypto.randomUUID()`).
- Audio file path is stored as reference only — the app never copies or manages audio files.

### UI Interactions

- **Tab preview mode:** Italic tab title, auto-replaces when another item is single-clicked. Pinned tabs (non-italic) require explicit close.
- **Sidebar sync:** Active tab's episode is highlighted in the sidebar tree.
- **Settings:** Gear icon in sidebar header opens Settings as a closable tab. Not permanently in the tab bar.
- **Editable title:** Pencil icon appears on hover. Click to edit inline, blur or Enter to save.
- **Transcript:** Collapsed by default with chevron + segment count. Click to expand.
- **Chat placeholder:** Pinned at bottom of content pane (not floating), disabled state with "coming soon" label.

### Accessibility

- Secondary text colors adjusted for AA contrast: `#c2c0b8` on dark backgrounds, `#7a7870` on light backgrounds.
- Sidebar tree supports arrow-key navigation (up/down/left/right for expand/collapse).
- Tab bar supports Cmd+1-9 shortcuts and Cmd+W to close.
- Processing items use aria-live regions for status announcements.
- Collapsible sections use proper `aria-expanded` attributes.

### Onboarding

1. App launches → detects no API key in settings → shows OnboardingView.
2. Welcome screen with brief description + API key input field + link to get a key.
3. On submit: calls `SummarizationService.validateApiKey()` (lightweight test request to OpenRouter).
4. On success: stores key in settings table, transitions to empty library state.
5. On failure: inline error message, user retries. Cannot proceed without valid key.
6. Note in UI: "You can change this later in Settings."

### Error Handling

- **Transcription failure:** Episode status set to `error`, error_message stored. Shown in Inbox with retry button. Retry re-runs the full pipeline.
- **LLM failure (network, rate limit, no key):** Episode status set to `transcribed` (custom intermediate state just for this case — or we use `error` with transcript preserved). Transcript stored, summary null. Episode view shows "Generate Summary" button.
- **Malformed LLM JSON:** Treated same as LLM failure — retry available.
- **Principle:** Never lose completed work. Each pipeline stage persists its output before the next stage begins.

### Design System (confirmed, with accessibility fixes)

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `--bg` | `#141413` | `#faf9f5` |
| `--text` | `#faf9f5` | `#141413` |
| `--secondary` | `#c2c0b8` | `#7a7870` |
| `--surface` | `#1e1e1c` | `#e8e6dc` |
| `--accent` | `#d97757` | `#d97757` |

Typography: Poppins (headings), SF Pro / system stack (body). Border radius: 12px. Generous spacing throughout.

## Testing Decisions

Good tests for this feature verify external behavior through module interfaces. Tests should be runnable without the 670MB model file and without hitting real APIs. Mock external boundaries (HTTP, filesystem for model, SQLite can be in-memory).

### Modules to test:

1. **DatabaseService** — Integration tests with in-memory SQLite. Verify: schema creation, CRUD operations for all tables, search behavior, cascading deletes (folder deletion orphans episodes to inbox), tab persistence, settings get/set. Prior art: existing `test-model-manager` tests in this repo use vitest with mocked dependencies.

2. **SummarizationService** — Unit tests with mocked HTTP (msw or similar). Verify: prompt construction includes base instructions + user custom instructions + transcript in correct XML structure, JSON response parsing extracts title and summary, handles malformed JSON gracefully, validates API key correctly. Verify the prompt template is correct rather than testing OpenRouter itself.

3. **IngestPipeline** — Integration tests with mocked transcription (returns canned transcript) and mocked HTTP (returns canned summary). Verify: state transitions (queued → transcribing → summarizing → complete), progress events emitted at each stage, error at transcription stage stops pipeline and sets error status, error at summarization stage preserves transcript, multiple queued files process sequentially.

### Modules NOT tested:

- **Renderer UI** — Validated by running the app against the prototype spec. No component tests at this stage.
- **TranscriptionWorker** — Requires 670MB model. Validated manually (already proven in v1).
- **Preload/IPC** — Thin relay layer, tested implicitly via integration tests and manual testing.

## Out of Scope

- Chat / conversational retrieval (UI placeholder only, no functionality)
- Drag-and-drop file input (native file dialog only)
- RSS feed subscriptions / auto-grouping by source
- RAG / vector embeddings / semantic search
- Batch processing / transcript chunking for long files
- Auto-generated tags or key topics as separate entities
- Multiple folder membership (tagging system)
- Smart folders / saved searches
- Audio playback within the app
- Export functionality (markdown, PDF)
- Windows or Linux support
- Keyboard shortcut customization

## Further Notes

- **Prototype reference:** `prototypes/library-ui.html` contains the full interactive HTML/Tailwind mockup showing sidebar, tabs, episode detail, settings, empty states, and processing animations. This is the visual specification for the renderer implementation.
- **OpenRouter model default:** `google/gemini-3.5-flash` — chosen for speed, cost, and large context window. Users can switch in Settings.
- **Migration from v1:** The existing single-file transcription UI (`App.tsx`) will be fully replaced by the new library UI. The main-process modules (ModelManager, AudioPreprocessor, TranscriptionWorker) are reused but wrapped by the new IngestPipeline orchestrator.
- **Future upgrade path:** Chat feature will be the next major addition. The episode view already reserves space for it. Implementation will likely involve a conversation table in SQLite and streaming LLM responses with the transcript as context.
- **No data migration needed:** v1 had no persistence, so there's nothing to migrate. Fresh SQLite database on first launch of v2.
