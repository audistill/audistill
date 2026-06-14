---
title: Refactor ChatToolExecutor to ToolServices bag
status: done
created: 2026-06-14
---

## Parent

.scratch/ai-chat-tools-v2/issue.md

## What to build

Replace the individual constructor parameters on `ChatToolExecutor` (`DatabaseService`, `TabService`) with a single `ToolServices` interface object that also includes `RecipeService`. Update the instantiation site and all internal references. This is a pure refactor — no behavior change, no new tools.

The `ToolServices` interface should contain `db`, `tabs`, and `recipes` fields. All existing tool methods should work identically after the change.

## Acceptance criteria

- [ ] `ChatToolExecutor` accepts a single `ToolServices` object in its constructor
- [ ] `ToolServices` interface includes `db: DatabaseService`, `tabs: TabService`, `recipes: RecipeService`
- [ ] All existing tool executor tests pass without behavior changes
- [ ] The instantiation site (where the executor is created) is updated to pass the services bag
- [ ] No new tools are added in this slice

## Blocked by

None - can start immediately
