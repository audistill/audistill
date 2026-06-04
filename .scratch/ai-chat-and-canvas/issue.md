---
title: AI Chat & Canvas — conversational AI workspace per episode
status: ready-for-agent
created: 2026-06-04
---

## Problem Statement

Users can generate and read summaries of their podcast episodes, but they cannot interact with the content conversationally. There is no way to ask follow-up questions about a transcript, produce custom written artifacts (show notes, blog posts, key takeaways), or have the AI create something new from the episode's content. The current experience is strictly read-only after ingest.

## Solution

Add two interconnected features to the episode experience:

1. **Chat Sidebar** — a collapsible right panel where users converse with an AI that has tool access to episode data (transcripts, summaries, other episodes). The AI can answer questions, search content, and produce written output.

2. **Canvas View** — an editable markdown workspace in the main content area where the AI (and the user) can write and refine documents. The AI streams content to the Canvas during chat; the user can also type directly.

Together these form a "conversational workspace" — the user asks via chat, the AI produces in Canvas, and both can iterate.

## User Stories

1. As a podcast listener, I want to ask questions about an episode's content, so that I can quickly find specific information without re-listening.
2. As a content creator, I want the AI to draft show notes from my episode, so that I can publish them alongside the audio.
3. As a researcher, I want to search across an episode's transcript for specific topics, so that I can locate relevant segments efficiently.
4. As a user, I want to see the AI's work appear in real-time (streaming), so that I feel responsive feedback and can interrupt if it goes wrong.
5. As a user, I want to stop AI generation mid-stream, so that I don't waste time on unwanted output.
6. As a user, I want to edit the Canvas content directly, so that I can refine AI-produced text or write my own content.
7. As a user, I want the Canvas content to persist when I navigate away, so that I don't lose my work.
8. As a user, I want chat history to persist per episode across app restarts, so that I can resume a conversation.
9. As a user, I want to clear chat history without losing Canvas content, so that I can start a fresh conversation while keeping the artifact.
10. As a user, I want to switch the AI model on-the-fly in the chat, so that I can use different models for different tasks without going to Settings.
11. As a user, I want to toggle the chat sidebar open/closed quickly, so that I can maximize content space when not chatting.
12. As a user, I want to toggle the left sidebar independently, so that I can focus on the content or Canvas without navigation clutter.
13. As a user, I want to switch between Episode view (summaries/transcript) and Canvas view, so that I can consume content and produce content within the same episode.
14. As a user, I want the Canvas to auto-focus when the AI starts writing to it, so that I see the output appearing live without manual switching.
15. As a user, I want to see which tools the AI is using (collapsed by default), so that I understand what data it's accessing.
16. As a user, I want the AI to search my transcript without me needing to scroll through it, so that I can ask natural language questions.
17. As a user, I want the AI to access other episodes when I ask comparative questions, so that I can draw connections across my library.
18. As a user, I want the AI to have targeted edit capability on the Canvas, so that when I say "change the third bullet" it doesn't rewrite the whole document.
19. As a user, I want keyboard shortcuts for sidebar toggles (Cmd+B, Cmd+Shift+L), so that I can quickly rearrange my workspace.
20. As a user, I want the Canvas to show placeholder text when empty, so that I know it's an editable workspace and not a broken screen.
21. As a user, I want a markdown preview/source toggle on the Canvas, so that I can see formatted output or edit raw markdown.
22. As a user, I want the models dropdown in chat to auto-populate from OpenRouter, so that new models are available without app updates.

## Implementation Decisions

### Database Schema

Two new tables in the SQLite database:

- `episode_canvas` — stores one canvas document per episode (episode_id UNIQUE, content TEXT, updated_at)
- `episode_chat_messages` — stores chat messages per episode (id, episode_id, role TEXT, content TEXT, tool_calls TEXT nullable JSON, created_at). Role is one of: user, assistant, tool.

### Architecture — New Modules

- **ChatService** (main process): Orchestrates the LLM completion loop. Accepts a message + context, calls OpenRouter streaming API, handles tool-use responses by dispatching to ChatToolExecutor, and streams results back to the renderer via IPC events. Manages the iterative tool-call loop (call tools, feed results back, get next response) until the model produces a final text response or canvas write.
- **ChatToolExecutor** (main process): Implements all 9 tools as pure functions against DatabaseService and returns structured results. Tools: `read_transcript`, `search_transcript`, `search_episodes`, `list_episodes`, `read_summary`, `read_episode_metadata`, `write_canvas`, `edit_canvas`, `navigate_view`.
- **CanvasStore** (renderer, Zustand slice): Holds canvas content for the active episode, editor mode (preview/source), loading state. Syncs to/from main process via IPC.
- **ChatStore** (renderer, Zustand slice): Holds chat messages, streaming state, selected model, tool call display state. Manages optimistic message appending and streaming token accumulation.
- **ChatSidebar** (renderer component): Fixed 360px right sidebar. Contains: message list (with collapsible tool call blocks), streaming indicator, model picker dropdown, text input, send/stop button, clear chat action.
- **CanvasView** (renderer component): Markdown editor in the main content area. Preview/source toggle in a segmented control (same position as summary controls). Placeholder ghost text when empty. Editable textarea in source mode, rendered markdown in preview mode.

### Architecture — Modified Modules

- **DatabaseService**: Add CRUD for `episode_canvas` and `episode_chat_messages` tables. Migration added to `init()`.
- **TabBar**: Add panel-style toggle icons at left (after traffic lights) and right edges. Icons use muted gray (closed) or amber tint (open). Fixed 36px zones.
- **ContentPane**: Route between EpisodeView and CanvasView based on store state.
- **EpisodeView**: Add canvas icon button in the metadata row (right-aligned). Remove the "coming soon" chat placeholder at the bottom.
- **App.tsx**: Manage right sidebar visibility state, register keyboard shortcuts (Cmd+B, Cmd+Shift+L), render ChatSidebar conditionally.
- **app-store.ts**: Add `leftSidebarOpen`, `rightSidebarOpen`, `activeContentView` ('episode' | 'canvas') state fields.

### Streaming & IPC

- Chat uses a request/stream pattern: renderer sends `chat:send-message` with the full message list + context. Main process responds with `chat:stream-token`, `chat:tool-call-start`, `chat:tool-call-result`, `chat:stream-end`, `chat:error` events.
- Canvas writes from the AI use `canvas:stream-write` events (for create) or `canvas:edit` events (for targeted edits). Renderer applies them incrementally.
- Stop uses `chat:abort` IPC call which sets an AbortController signal on the active OpenRouter fetch.

### AI Context Assembly

On each `chat:send-message`, the renderer sends:
- Episode metadata (title, filename, duration, date)
- Active summary content (whichever Brief/Detailed/Full is selected) — only if on Episode view
- Canvas content (always included, it's small)
- Full chat message history

The AI system prompt describes available tools and their interfaces. The model is the one selected in the chat dropdown (defaulting to the Settings model).

### Tool Definitions (OpenRouter function-calling format)

- `read_transcript(episode_id?)` — returns full transcript text for current or specified episode
- `search_transcript(query, episode_id?)` — returns matching segments with timestamps
- `search_episodes(query)` — searches titles and summary content across all episodes
- `list_episodes(folder_id?)` — returns episode list with metadata
- `read_summary(episode_id?, view_type)` — returns specific summary content
- `read_episode_metadata(episode_id?)` — returns title, filename, duration, date, folder
- `write_canvas(content)` — replaces entire canvas content, triggers auto-focus and streaming
- `edit_canvas(old_text, new_text)` — targeted find-and-replace within canvas
- `navigate_view(view: 'episode' | 'canvas')` — switches the main content area view

### UI Patterns

- Canvas toggle: icon in the metadata row, same row as filename/duration/date
- Sidebar toggles: panel icons in tab bar edges, amber when active
- Model picker: dropdown in chat sidebar header, populated from OpenRouter model list API
- Tool calls in chat: collapsible blocks showing tool name + summary of result
- Stop button: replaces send button during streaming (Claude.ai pattern)
- Canvas empty state: ghost placeholder text ("Ask the AI to create something, or start typing...")

## Testing Decisions

Tests should verify external behavior (inputs/outputs), not implementation details.

### ChatService Tests

- Given a user message and context, verify the correct OpenRouter API request is formed (model, messages, tools, stream flag)
- Given a streamed response with no tool calls, verify tokens are forwarded to the renderer
- Given a response with tool calls, verify the tool-call loop: tools are dispatched, results fed back, and the next completion is requested
- Given an abort signal, verify streaming stops and a partial result is returned
- Mock OpenRouter HTTP responses and ChatToolExecutor; test the orchestration logic

### ChatToolExecutor Tests

- `read_transcript`: returns transcript text for a given episode; returns error for missing episode
- `search_transcript`: returns matching segments with correct timestamp ranges
- `search_episodes`: returns matching episodes across titles and summaries
- `list_episodes`: returns full list or filtered by folder
- `read_summary`: returns correct summary content for the requested view_type
- `read_episode_metadata`: returns structured metadata object
- `write_canvas`: persists content to database, returns success
- `edit_canvas`: applies find-and-replace correctly; returns error when old_text not found
- `navigate_view`: returns the requested view (renderer handles the actual switch)

Prior art: see `src/main/__tests__/` pattern if it exists, or follow the test structure from `test-model-manager` issue.

## Out of Scope

- Multiple Canvas documents per episode (single document only)
- Canvas versioning or undo history beyond editor-native undo
- Chat session management (no named sessions, no session list)
- RAG / vector embeddings / semantic search (plain text search only)
- Voice input for chat
- Image/file attachments in chat
- Slash commands or context chips in chat input
- Collaborative editing or multi-user features
- Summary editing (summaries remain read-only)
- Export/share of Canvas content

## Further Notes

- The OpenRouter streaming API uses the same format as OpenAI's chat completions with `stream: true`. Tool use follows the OpenAI function-calling convention (tool_choice, function definitions in tools array).
- The Canvas auto-save is implicit — any change (user edit or AI write) immediately persists via IPC to SQLite. No explicit save button.
- When AI calls `write_canvas` or `edit_canvas`, the renderer should auto-switch to Canvas view if not already there, then apply the streaming content.
- The left sidebar toggle is a new affordance — currently the left sidebar is always visible. Adding the toggle allows users to maximize content area.
- Model list from OpenRouter: use the `/api/v1/models` endpoint to fetch available models. Cache the list and refresh periodically.
