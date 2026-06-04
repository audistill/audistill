---
title: "Canvas tools: write_canvas, edit_canvas, navigate_view"
status: done
created: 2026-06-04
---

## Parent

`.scratch/ai-chat-and-canvas/issue.md`

## What to build

Add the 3 canvas-related tools to ChatToolExecutor and wire their effects through to the renderer, completing the "AI writes to Canvas" flow.

End-to-end behavior:
- User asks in chat: "Write me show notes for this episode." The AI calls `write_canvas` with the full content. The renderer auto-switches to Canvas view and streams the content into the editor in real time.
- User asks: "Change the third bullet point to mention the guest's name." The AI calls `edit_canvas(old_text, new_text)`. The renderer applies the targeted replacement without disturbing the rest of the document.
- The AI calls `navigate_view('episode')` to switch the user back to Episode view (e.g., after saying "here's your summary — switching back").

Tool implementations:

1. **write_canvas(content)** — Persists the full content to `episode_canvas` in the DB. Emits `canvas:stream-write` IPC event with the content. The renderer auto-switches to Canvas view and displays the content (streaming if the AI is still producing tokens). Returns success confirmation.

2. **edit_canvas(old_text, new_text)** — Reads current canvas content from DB, performs find-and-replace of `old_text` with `new_text`. If `old_text` is not found, returns an error message to the AI. Otherwise persists the updated content and emits `canvas:edit` IPC event. Returns success confirmation.

3. **navigate_view(view: 'episode' | 'canvas')** — Emits `canvas:navigate` IPC event. The renderer switches `activeContentView` accordingly. Returns confirmation.

Streaming integration for `write_canvas`:
- When ChatService detects the AI is calling `write_canvas`, the content argument is streamed to the renderer as it arrives (token by token via `canvas:stream-write` deltas). The Canvas displays content building up live — same streaming feel as chat responses.
- This requires ChatService to detect tool-call arguments mid-stream and forward them incrementally.

## Acceptance criteria

- [ ] `write_canvas` persists content and triggers Canvas auto-focus (view switches to Canvas)
- [ ] Canvas content streams in real-time when `write_canvas` is called (not all-at-once)
- [ ] `edit_canvas` performs targeted find-and-replace; Canvas updates in place
- [ ] `edit_canvas` returns error to the AI when old_text is not found (AI can retry)
- [ ] `navigate_view` switches the main content area between Episode and Canvas
- [ ] All 3 tools are registered in the system prompt's tool definitions
- [ ] Full flow works: user asks "write show notes" → AI calls write_canvas → content appears live in Canvas
- [ ] Full flow works: user asks "change X to Y" → AI calls edit_canvas → Canvas updates surgically
- [ ] Canvas auto-save still works after AI writes (content is in DB)
- [ ] Stop button during canvas streaming preserves partial content

## Blocked by

- `.scratch/ai-canvas-view/issue.md`
- `.scratch/ai-wire-chat-to-service/issue.md`
