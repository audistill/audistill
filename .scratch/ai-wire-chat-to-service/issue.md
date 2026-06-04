---
title: "Wire chat UI to ChatService: end-to-end conversation"
status: done
created: 2026-06-04
---

## Parent

`.scratch/ai-chat-and-canvas/issue.md`

## What to build

Connect the ChatSidebar UI to the ChatService backend so that sending a message produces an AI response with tool usage. This is the integration slice that makes the chat functional end-to-end.

End-to-end behavior:
- User types a message and hits Send. The renderer assembles the context payload (episode metadata, active summary if on Episode view, canvas content, full chat history) and sends it via `chat:send-message` IPC.
- The main process creates a system prompt that includes tool definitions (OpenAI function-calling format) and the provided context, then calls ChatService.
- As tokens stream back, the ChatSidebar renders them incrementally in a new assistant message bubble. The message builds up character by character.
- When tool calls occur: a collapsible "tool call" block appears in the chat showing the tool name. When the tool result arrives, the block updates with a brief summary. These are collapsed by default — user can expand to see full details.
- The send button transforms into a stop button during streaming. Clicking it calls `chat:abort`, which cancels generation. The partial response is kept and persisted.
- Once streaming completes, the full assistant message (and any tool call records) are persisted to the DB.
- Error states (network failure, invalid key) display as a system message in the chat.

Context assembly (renderer-side):
- Episode metadata: title, filename, duration, date
- Active summary: content of the currently selected Brief/Detailed/Full tab (only if on Episode view)
- Canvas content: always included
- Chat history: full message array from ChatStore

## Acceptance criteria

- [ ] Sending a message triggers an LLM call and streams a response into the chat
- [ ] Tokens appear incrementally (streaming feel, not all-at-once)
- [ ] Tool calls display as collapsible blocks in the assistant message (collapsed by default)
- [ ] Tool call blocks show tool name and brief result summary when expanded
- [ ] Stop button appears during streaming; clicking it aborts and preserves partial response
- [ ] Send button returns after streaming ends or is aborted
- [ ] Completed assistant messages (with tool_calls JSON) persist to DB
- [ ] Context payload includes episode metadata, active summary, canvas content, and chat history
- [ ] System prompt includes tool definitions for all 9 tools
- [ ] Error states (no API key, network error) show as inline error messages in chat
- [ ] The chat works with the default model from Settings
- [ ] Multiple back-and-forth messages work (conversation context maintained)

## Blocked by

- `.scratch/ai-chat-sidebar-ui/issue.md`
- `.scratch/ai-chat-service/issue.md`
- `.scratch/ai-chat-tool-executor/issue.md`
