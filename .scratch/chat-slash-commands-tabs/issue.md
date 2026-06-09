---
title: "Chat slash commands → tab creation"
status: ready-for-agent
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

Wire the chat sidebar's `/` slash command system to create and populate tabs from recipes, with the chat acting as input surface and tabs as output surface.

End-to-end behavior:
- When the user types `/` in the chat input, an autocomplete popover appears listing all available recipes by name.
- As the user types after `/`, the list filters (fuzzy match on recipe name).
- Selecting a recipe (click or Enter):
  - If that recipe already has an open tab → navigate to it
  - If not → create a new tab, execute the recipe, stream output into the tab
- The chat sidebar does NOT show the generated content. Instead it shows a brief confirmation message: "✓ {Recipe Name} generated" once streaming completes.
- During generation, the chat shows a status line: "Generating {Recipe Name}..."
- The user's slash command entry (e.g., "/Action Items") appears as a user message in chat history for context.
- Errors during generation show in chat as an error message with retry option.

The existing chat tool `write_canvas` is updated:
- Renamed conceptually to write to the active tab (or a new tab) rather than the old single-state canvas
- When the AI decides to create content via tool call during freeform chat, it targets the active tab or creates a new one based on context

## Acceptance criteria

- [ ] Typing `/` in chat input shows autocomplete popover with recipe names
- [ ] Autocomplete filters recipes as user types (fuzzy match)
- [ ] Selecting a recipe creates a new tab and executes recipe against transcript
- [ ] If recipe already has an open tab, navigates to it instead of duplicating
- [ ] Generated content streams into the tab, NOT into the chat sidebar
- [ ] Chat shows brief confirmation on completion: "✓ {name} generated"
- [ ] Chat shows status during generation: "Generating {name}..."
- [ ] Slash command entry appears as user message in chat history
- [ ] Errors display in chat with retry option
- [ ] Autocomplete popover dismisses on Escape or clicking outside
- [ ] All tests pass using TDD

## Blocked by

- `.scratch/tab-plus-button-popover/issue.md`
