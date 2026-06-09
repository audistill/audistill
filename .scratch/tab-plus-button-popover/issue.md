---
title: "+ button popover: blank tabs + recipe invocation"
status: ready-for-agent
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

The `+` button in the tab bar that opens a popover menu for creating new tabs — either blank or by executing a recipe.

End-to-end behavior:
- A `+` button sits at the right end of the tab bar (after all existing tabs).
- Clicking it opens a popover/dropdown with:
  - "Blank" at the top (creates an empty editable tab)
  - A divider
  - List of all available recipes (by name)
- Selecting "Blank" creates a new tab named "Untitled" in edit mode, focused and ready to type.
- Selecting a recipe checks if that recipe already has an open tab for this episode:
  - If yes: navigates to the existing tab (no duplicate created)
  - If no: creates a new tab with the recipe name, executes the recipe against the episode's transcript, and streams output into the tab
- During recipe execution, the tab shows a streaming/loading state (content appearing token by token).
- The popover closes after selection.
- The `+` button is always visible (not hidden behind overflow).

## Acceptance criteria

- [ ] `+` button renders at the right end of the tab bar
- [ ] Clicking opens a popover with "Blank" + divider + recipe list
- [ ] Selecting "Blank" creates an untitled empty tab in edit mode
- [ ] Selecting a recipe with no existing tab creates a new tab and executes the recipe
- [ ] Selecting a recipe that already has an open tab navigates to that tab instead
- [ ] Recipe execution streams tokens into the new tab live
- [ ] Popover closes after any selection
- [ ] Recipe list reflects current recipes from RecipeService (including user-created ones)
- [ ] Error during recipe execution shows error state in the tab with retry
- [ ] All tests pass using TDD

## Blocked by

- `.scratch/dynamic-tab-bar-ui/issue.md`
- `.scratch/pipeline-recipe-execution/issue.md`
