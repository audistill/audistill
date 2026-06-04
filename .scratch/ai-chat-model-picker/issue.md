---
title: "Chat model picker: OpenRouter model list"
status: done
created: 2026-06-04
---

## Parent

`.scratch/ai-chat-and-canvas/issue.md`

## What to build

A dropdown in the ChatSidebar header that lets the user switch AI models on-the-fly, populated from OpenRouter's model list API.

End-to-end behavior:
- The ChatSidebar header area (above the message list) shows a compact dropdown displaying the currently selected model name.
- The dropdown is populated by fetching available models from OpenRouter's `/api/v1/models` endpoint using the user's API key.
- The model list is cached in memory and refreshed when the chat sidebar opens (or on a reasonable interval — e.g., every 10 minutes).
- The default selection is the model configured in Settings (the same one used for summarization).
- Changing the model applies immediately to the next message sent. It does not retroactively change previous messages.
- The selected model persists per-session (not per-episode) — switching episodes keeps the same model selected. On app restart, it resets to the Settings default.
- If the model list fetch fails (network error, invalid key), the dropdown shows only the default model from Settings with no error — graceful degradation.

## Acceptance criteria

- [ ] Model picker dropdown visible in ChatSidebar header
- [ ] Dropdown populated from OpenRouter `/api/v1/models` endpoint
- [ ] Models displayed with readable names (not just IDs)
- [ ] Default model matches the one configured in Settings
- [ ] Changing model affects the next sent message
- [ ] Model list cached; not re-fetched on every render
- [ ] Graceful fallback when model list fetch fails (shows Settings model only)
- [ ] Dropdown is compact and doesn't dominate the sidebar header
- [ ] Selected model persists within the session (across episode switches)
- [ ] Resets to Settings default on app restart

## Blocked by

- `.scratch/ai-wire-chat-to-service/issue.md`
