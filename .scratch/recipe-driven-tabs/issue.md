---
title: "Recipe-driven tabs: customizable prompt templates with dynamic content tabs"
status: done
created: 2026-06-09
---

## Problem Statement

Users can only generate three fixed summary types (Brief, Detailed, Full) from their audio content. There is no way to create custom extraction recipes (action items, show notes, key quotes, newsletter drafts), and the single-state Canvas cannot hold multiple outputs simultaneously. Users who want to produce different kinds of content from the same episode are forced into a repetitive workflow of overwriting the Canvas via chat each time.

The transcript is buried inside the summary view, making it impossible to cross-reference source material while reading generated outputs.

## Solution

Replace the fixed Brief/Detailed/Full segmented control with a dynamic tab system driven by customizable prompt templates ("recipes"). Each recipe execution produces its own persistent tab within an episode. A toggleable bottom transcript panel allows cross-referencing source material against any active tab.

The system ships with three pre-loaded built-in recipes (Brief, Detailed, Full) and allows users to create unlimited custom recipes. One recipe is designated as the "pipeline default" — it auto-runs during ingest. All other recipes are invoked on-demand via slash commands in chat or the `+` tab bar button.

## User Stories

1. As a podcast listener, I want the app to auto-generate a summary when I drop audio, so that I get immediate value without any clicks.
2. As a user, I want to choose which recipe auto-runs on ingest, so that I get the output format I care about most.
3. As a content creator, I want to create custom recipes (e.g., "Show Notes", "Newsletter Draft"), so that I can produce different deliverables from the same episode.
4. As a user, I want each recipe output to appear as its own tab, so that I can navigate between long documents without scrolling through a wall of text.
5. As a user, I want to invoke a recipe via the `/` autocomplete menu in chat, so that I can quickly generate content without leaving the conversation flow.
6. As a user, I want to invoke a recipe via the `+` button in the tab bar, so that I can generate content without opening the chat sidebar.
7. As a user, I want to create a blank tab and write my own content, so that I can draft something and then ask the AI to refine it.
8. As a user, I want a view/edit toggle on every tab, so that I can read rendered markdown or edit the raw source.
9. As a user, I want the AI to edit the currently active tab when I ask for refinements, so that my instructions naturally target what I'm looking at.
10. As a user, I want the AI to create a new tab when I invoke a slash command, so that existing content is never accidentally overwritten.
11. As a user, I want the AI to intelligently decide whether to edit the active tab or create a new one based on my request, so that the workflow feels natural.
12. As a user, I want tabs to persist per episode across app restarts, so that I don't lose generated content.
13. As a user, I want to close any tab (except the pipeline tab) to discard it permanently, so that I can keep my workspace clean.
14. As a user, I want the pipeline tab to be non-closeable, so that my auto-generated content is always accessible.
15. As a user, I want tabs to be named after the recipe that produced them (or "Untitled" for blank tabs), so that I can identify content at a glance.
16. As a user, I want to double-click a tab to rename it, so that I can organize my workspace.
17. As a user, I want picking a recipe that already has an open tab to navigate to that existing tab, so that I don't create duplicates.
18. As a user, I want a toggleable transcript panel at the bottom of the content area, so that I can reference source material while reading any tab.
19. As a user, I want the transcript panel to scroll independently and persist its scroll position across tab switches, so that I don't lose my place.
20. As a user, I want to search within the transcript panel, so that I can find specific passages quickly.
21. As a user, I want to resize the transcript panel by dragging a handle, so that I can balance space between content and reference material.
22. As a user, I want the transcript panel to use virtualized rendering, so that long transcripts don't degrade performance.
23. As a user, I want to manage my recipes in Settings using an inline accordion, so that I can create, edit, duplicate, and delete recipes without leaving the settings flow.
24. As a user, I want each recipe to have an optional model override, so that I can use a fast model for quick extractions and a powerful model for complex generation.
25. As a user, I want built-in recipes (Brief, Detailed, Full) to be non-deletable but duplicable, so that I can customize variants without losing defaults.
26. As a user, I want chat slash commands to stream output directly into the new tab (not into the chat sidebar), so that the tab is the single output surface.
27. As a user, I want the chat sidebar to show a brief confirmation when a recipe completes ("Action Items generated"), so that I know it worked without switching context.
28. As a transcription-focused user, I want the transcript panel to be my primary view (with the pipeline tab minimally in the way), so that I can use the app as a transcription tool.
29. As a user, I want a keyboard shortcut (Cmd+Shift+T) to toggle the transcript panel, so that I can quickly show/hide reference material.
30. As a user, I want the `+` popover to show "Blank" at the top followed by my recipe list, so that both creation paths are immediately accessible.

## Implementation Decisions

### Data Model

**New `recipes` table:**
- `id` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `prompt` TEXT NOT NULL
- `model_override` TEXT nullable (null = use global default)
- `is_builtin` INTEGER (1 = built-in, cannot be deleted)
- `sort_order` INTEGER
- `created_at` TEXT

**New `episode_tabs` table (replaces `episode_summaries`):**
- `id` TEXT PRIMARY KEY
- `episode_id` TEXT REFERENCES episodes(id) ON DELETE CASCADE
- `recipe_id` TEXT nullable REFERENCES recipes(id) ON SET NULL (null = blank user tab)
- `tab_name` TEXT NOT NULL
- `content` TEXT NOT NULL DEFAULT ''
- `is_pipeline` INTEGER (1 = auto-generated, non-closeable)
- `position` INTEGER NOT NULL
- `created_at` TEXT
- `updated_at` TEXT

**Migration from existing data:**
- Seed `recipes` with Brief, Detailed, Full (mapping from current prompt files)
- Migrate existing `episode_summaries` rows into `episode_tabs` (brief → pipeline tab, detailed/full → additional tabs if content exists)
- Drop `episode_summaries` table after migration
- Remove `episode_canvas` table (canvas functionality subsumed by tabs)

### Architecture: New Modules

**RecipeService (main process):**
- CRUD operations for recipes
- Resolves pipeline default recipe from settings
- Executes a recipe: builds system/user messages from recipe prompt + transcript, calls OpenRouter, streams result
- Interface: `getRecipes()`, `getRecipe(id)`, `createRecipe(data)`, `updateRecipe(id, data)`, `deleteRecipe(id)`, `executeRecipe(recipeId, transcript, onToken)`, `getPipelineRecipe()`

**TabService (main process):**
- CRUD for episode tabs
- Manages tab lifecycle: create from recipe, create blank, update content, delete, reorder
- Interface: `getTabs(episodeId)`, `createTab(episodeId, options)`, `updateTabContent(tabId, content)`, `deleteTab(tabId)`, `renameTab(tabId, name)`

**ContentTabStore (renderer, Zustand slice):**
- Per-episode tab state: open tabs, active tab ID, tab content, edit mode per tab
- Syncs tab content changes (debounced) to main process
- Handles streaming token updates for the active generation target

**TranscriptPanel (renderer component):**
- Bottom drawer panel using split-pane pattern
- Virtualized list rendering (react-window or @tanstack/virtual)
- Inline search with match highlighting
- Resize handle with stored preference (25%-65% range)
- Toggle via toolbar button and Cmd+Shift+T
- Independent scroll state preserved across tab switches

**RecipeEditor (renderer component, within SettingsView):**
- Inline accordion list of recipes
- Each expanded row shows: name input, prompt textarea, model override dropdown (collapsed by default under "Advanced"), duplicate/delete actions
- Built-in recipes show as read-only or with "Duplicate to customize" affordance
- Pipeline default selector (dropdown above the list)

**TabBar (renderer component, replaces segmented control):**
- Secondary tab bar within content area
- Closeable tabs (× button, except pipeline tab)
- `+` button with popover (Blank + recipe list)
- Double-click to rename
- Active tab indicator
- Scrollable if tabs overflow

### Architecture: Modified Modules

**SummarizationService → replaced by RecipeService:**
- The current `SummarizationService` is retired. `RecipeService` takes over its responsibilities with a recipe-driven model instead of fixed ViewType.

**ChatService (modified):**
- Add slash command registry populated from recipes
- `/` in chat input triggers autocomplete popover with recipe list
- When a slash command is selected, ChatService calls `RecipeService.executeRecipe()` and streams tokens to a new tab via IPC (not to chat)
- AI tool `write_canvas` / `edit_canvas` replaced by `write_tab(tabId?, content)` / `edit_tab(tabId?, old_text, new_text)` — defaults to active tab if no tabId specified
- AI can read all open tab names/content to decide targeting

**ContentPane (modified):**
- Renders dynamic TabBar + active tab content + optional TranscriptPanel
- No longer routes between EpisodeView and CanvasView — tabs subsume both
- Split pane layout when transcript panel is open

**SettingsView (modified):**
- Remove: "Brief Summary Model", "Detailed & Chat Model", "Default Summary View", "Custom Instructions" fields
- Add: "Default Model" (single global setting), "Pipeline Template" dropdown, "Templates" accordion section
- Net result: fewer top-level settings, one unified concept

**app-store.ts (modified):**
- Remove: `summaries` record, `activeContentView`
- Add: reference to ContentTabStore (or integrate as slice)
- The `episode` → `canvas` view routing is removed; tabs handle everything

**Ingest pipeline (modified):**
- After transcription completes, read pipeline default recipe from settings
- Call `RecipeService.executeRecipe()` with that recipe
- Create pipeline tab in `episode_tabs` with result
- Broadcast update to renderer

### Streaming & IPC

- Recipe execution uses same streaming pattern as current chat: `recipe:stream-token`, `recipe:stream-end`, `recipe:error` events
- Tab content updates: `tab:content-updated(tabId, content)` for persistence
- Tab lifecycle: `tab:created`, `tab:deleted`, `tab:renamed` events for renderer sync

### UI Patterns

- Tab bar sits where the Brief/Detailed/Full segmented control currently is
- Pipeline tab has a subtle pin icon or different style (non-closeable indicator)
- Transcript toggle button: right-aligned in the tab bar row, text: "Transcript" with chevron
- Transcript panel: 200ms slide animation, drag handle at top edge, 60/40 default split
- `+` popover: native-feeling dropdown, "Blank" first with divider, then recipe list
- Slash menu in chat: autocomplete popup triggered by `/` keystroke, filters as user types
- View/Edit toggle: segmented control within each tab's content area (top-right corner)

### Recipe Execution Model

- `/` command in chat → always creates new tab (or navigates to existing if same recipe already open)
- `+` popover recipe selection → same behavior as above
- Natural language in chat ("make this shorter") → AI edits active tab content
- AI decides edit-vs-create based on user intent
- The active (visible) tab is always the default write target for the AI

## Testing Decisions

Use TDD (red-green-refactor) for all module implementation. Tests verify external behavior at module boundaries.

### RecipeService Tests
- Given built-in recipe data, verify CRUD operations (create, read, update, delete with built-in protection)
- Given a recipe and transcript, verify correct OpenRouter API request formation (model resolution, message building)
- Given streaming response, verify tokens are forwarded correctly
- Given a recipe with model override, verify it takes precedence over global default
- Given no API key, verify appropriate error

### TabService Tests
- Given an episode, verify tab CRUD (create, read, update content, delete, reorder)
- Given a pipeline tab, verify it cannot be deleted
- Given tab creation from a recipe, verify correct name and recipe_id linkage
- Given a blank tab creation, verify "Untitled" naming and null recipe_id

### RecipeEditor (component) Tests
- Verify recipe list renders with correct names and built-in badges
- Verify accordion expand/collapse behavior
- Verify built-in recipes cannot be deleted (button disabled or absent)
- Verify duplicate creates a new editable copy

### ContentTabStore Tests
- Verify tab switching updates active tab ID
- Verify content updates are debounced and persisted
- Verify streaming tokens append to correct tab
- Verify tab close removes from state and persists

### TranscriptPanel Tests
- Verify toggle open/close behavior
- Verify search filters and highlights matches
- Verify resize handle constrains within 25%-65% bounds
- Verify scroll position persists across tab switches

### Migration Tests
- Verify existing `episode_summaries` data migrates to `episode_tabs` correctly
- Verify brief summary becomes pipeline tab
- Verify detailed/full become additional tabs (only if they had content)

Prior art: existing test patterns in the codebase (if any), plus the testing approach defined in `.scratch/model-routing-tests/issue.md`.

## Out of Scope

- Multi-step pipelines (chaining recipe outputs as inputs to another recipe)
- Community/shared recipe marketplace or import/export
- Recipe versioning or history
- Collaborative editing or multi-user features
- Student-specific features (flashcards, spaced repetition, study modes)
- Voice input for chat
- Bundled pricing or token metering (BYOK only)
- Multiple auto-pipeline recipes (only one runs on ingest)
- Drag-to-reorder tabs (tab position is creation order)
- Audio playback linked to transcript timestamps (future enhancement)

## Further Notes

- The transition from Canvas to Tabs is a breaking change for existing users. The migration must handle existing `episode_canvas` content by creating a "Canvas" tab for any episode that has canvas content.
- Built-in recipe prompts continue to live as `.txt` files in `src/main/prompts/` for easy editing during development, but are loaded into the `recipes` table on first run.
- The "Custom Instructions" concept is absorbed into each recipe's prompt field. Users who had global custom instructions should have that text appended to all built-in recipe prompts during migration (or offered as a separate "suffix" setting — TBD during implementation).
- The TranscriptPanel virtualizes rendering with `@tanstack/virtual` (preferred over react-window for better API ergonomics and active maintenance).
- Tab content is stored as markdown text. The view/edit toggle is purely a renderer concern (same content, different rendering mode).
- The `/` slash command menu in chat reuses the same recipe list as the `+` popover. Single source of truth.
- When the AI targets a tab for editing, it should include the tab name in its chat confirmation message so the user knows which tab was affected.
