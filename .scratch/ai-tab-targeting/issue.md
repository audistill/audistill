---
title: "AI tab targeting + edit-vs-create logic"
status: done
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

Give the AI awareness of all open tabs and the intelligence to decide whether to edit the active tab or create a new one based on user intent.

End-to-end behavior:
- The AI's system prompt includes context about all open tabs for the current episode: tab names, which is active, and a summary/snippet of each tab's content.
- The AI has two tab-related tools:
  - `write_tab(tab_name?, content)` — replaces full content of a tab. If tab_name is omitted or matches the active tab, targets active. If tab_name matches another open tab, targets that. If no match, creates a new tab with that name.
  - `edit_tab(tab_name?, old_text, new_text)` — find-and-replace within a tab. Same targeting logic as write_tab.
- When the user asks for a refinement of current content ("make this shorter", "rewrite the intro", "add timestamps"), the AI uses edit_tab on the active tab.
- When the user asks for something categorically new ("give me a blog post from this", "extract the key quotes"), the AI uses write_tab with a new tab_name, creating a new tab.
- When the user explicitly references another tab ("update the action items"), the AI targets that tab by name.
- The old `write_canvas` and `edit_canvas` tools are removed.
- Chat confirmation messages include which tab was affected: "✓ Edited Summary" or "✓ Created Blog Draft".

## Acceptance criteria

- [ ] AI system prompt includes list of open tabs (names + active indicator + content snippets)
- [ ] `write_tab` tool replaces content on the targeted tab
- [ ] `write_tab` with unrecognized tab_name creates a new tab
- [ ] `write_tab` with no tab_name targets the active tab
- [ ] `edit_tab` performs find-and-replace on the targeted tab
- [ ] `edit_tab` targeting works same as write_tab (active by default, name-matched otherwise)
- [ ] AI correctly chooses edit for refinement requests on current content
- [ ] AI correctly chooses write (new tab) for categorically new content requests
- [ ] AI correctly targets other tabs when user references them by name
- [ ] Old `write_canvas` and `edit_canvas` tools are removed
- [ ] Chat shows confirmation with tab name affected
- [ ] Streaming edits update the tab content live in the renderer
- [ ] All tests pass using TDD

## Blocked by

- `.scratch/chat-slash-commands-tabs/issue.md`
