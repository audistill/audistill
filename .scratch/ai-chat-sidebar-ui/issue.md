---
title: "Chat sidebar: UI shell with message display and input"
status: done
created: 2026-06-04
---

## Parent

`.scratch/ai-chat-and-canvas/issue.md`

## What to build

The ChatSidebar component that renders inside the right sidebar area introduced in the layout shell slice. This slice covers UI rendering and message persistence — NOT the connection to an LLM (that comes in the wiring slice).

End-to-end behavior:
- When the right sidebar is open, ChatSidebar renders at fixed 360px width.
- It displays a message list: user messages right-aligned (or styled distinctly), assistant messages left-aligned. Messages render markdown.
- A text input at the bottom with a send button. Pressing Enter or clicking Send appends the user's message to the list and persists it. (No LLM call yet — the assistant won't reply in this slice.)
- A "Clear Chat" action (icon button or menu) clears all messages for the current episode.
- Messages persist per episode: switching episodes loads that episode's chat history. Messages survive app restart.
- The message list auto-scrolls to the bottom when new messages are added.

Database changes:
- New `episode_chat_messages` table: `id TEXT PRIMARY KEY, episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')), content TEXT NOT NULL, tool_calls TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))`.
- New IPC handlers: `chat:get-messages(episodeId)`, `chat:save-message(episodeId, role, content, toolCalls?)`, `chat:clear-messages(episodeId)`.
- DatabaseService gains corresponding methods.

Renderer:
- ChatStore (Zustand slice or addition to app-store): holds `chatMessages`, `chatLoading`, `isStreaming` (false for now).
- ChatSidebar component with message list, input, clear button.

## Acceptance criteria

- [ ] ChatSidebar renders in the right panel when sidebar is open
- [ ] Fixed 360px width, fills available height
- [ ] User messages display with distinct styling from assistant messages
- [ ] Text input at bottom with send button; Enter key sends
- [ ] Sending a message appends it to the list and persists to DB
- [ ] Clear chat removes all messages for the current episode (from UI and DB)
- [ ] Switching episodes loads that episode's message history
- [ ] Messages persist across app restart
- [ ] Message list auto-scrolls to bottom on new messages
- [ ] Empty state (no messages) doesn't look broken
- [ ] `episode_chat_messages` table created in database migration
- [ ] Canvas content is NOT affected by clearing chat

## Blocked by

- `.scratch/ai-layout-shell/issue.md`
