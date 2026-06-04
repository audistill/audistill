---
title: "ChatService: streaming LLM completions via OpenRouter"
status: done
created: 2026-06-04
---

## Parent

`.scratch/ai-chat-and-canvas/issue.md`

## What to build

A main-process service that orchestrates LLM chat completions via the OpenRouter streaming API, including the iterative tool-call loop.

End-to-end behavior:
- ChatService accepts a request containing: model ID, system prompt (with tool definitions), message history, and a list of available tools in OpenAI function-calling format.
- It opens a streaming connection to OpenRouter's `/api/v1/chat/completions` endpoint with `stream: true`.
- As tokens arrive, it emits them via IPC events (`chat:stream-token`).
- If the model responds with tool calls instead of text, ChatService dispatches each tool call to a provided tool executor function, collects results, appends them to the message history as tool-role messages, and re-calls the API. This loop continues until the model produces a final text response.
- An AbortController signal can cancel the active request at any time, emitting a `chat:stream-end` event with whatever partial content was received.
- Error conditions (network failure, invalid API key, model not available) emit `chat:error`.
- IPC handlers are registered: `chat:send-message` (invoke), `chat:abort` (invoke).

This slice does NOT include the UI or the tool implementations — those come in separate slices. The tool executor is injected as a dependency (a function that takes a tool name + args and returns a result string).

## Acceptance criteria

- [ ] ChatService calls OpenRouter streaming API with correct headers (Authorization, HTTP-Referer) and body format
- [ ] Streaming tokens are emitted as `chat:stream-token` IPC events to all renderer windows
- [ ] Tool-call loop works: when model returns tool_calls, executor is called, results appended, next completion requested
- [ ] Multi-tool responses handled (model can call multiple tools in one turn)
- [ ] `chat:abort` IPC handler cancels the active fetch and emits `chat:stream-end`
- [ ] `chat:error` emitted on network/API failures with a human-readable message
- [ ] `chat:stream-end` emitted when the model finishes (includes the complete assistant message)
- [ ] Unit tests cover: request formation, token forwarding, tool-call loop, abort behavior, error handling (with mocked HTTP and tool executor)

## Blocked by

None - can start immediately
