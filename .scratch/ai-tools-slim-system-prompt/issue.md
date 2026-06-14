---
title: Slim system prompt to tab TOC with active tab content
status: done
created: 2026-06-14
---

## Parent

.scratch/ai-chat-tools-v2/issue.md

## What to build

Reduce token waste in the Chat system prompt by replacing full tab content injection with a table-of-contents listing. The active tab's content is still injected (users frequently request edits to it). All other tabs are listed by name and character count only — the AI uses `read_summary` to fetch content on demand.

The `tabsContext` construction in `ChatSidebar.tsx` `handleSend()` and the `buildSystemPrompt()` function need updating. The system prompt's tool guidance section should mention that `read_summary` is the way to access non-active tab content.

## Acceptance criteria

- [ ] Non-active tabs appear in the system prompt as a list of names with character counts (e.g. `- Brief (1,240 chars)`)
- [ ] The active tab's full content is still injected under `## Active Summary`
- [ ] Empty tabs appear as `- TabName (empty)`
- [ ] The system prompt instructs the AI to use `read_summary` for non-active tab content
- [ ] Overall system prompt size is measurably reduced for episodes with multiple tabs

## Blocked by

None - can start immediately
