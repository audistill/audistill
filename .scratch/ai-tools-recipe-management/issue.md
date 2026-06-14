---
title: Add Recipe management tools (list_recipes, create_recipe, update_recipe)
status: done
created: 2026-06-14
---

## Parent

.scratch/ai-chat-tools-v2/issue.md

## What to build

Add three Recipe management tools to the AI Chat so users can leverage the AI's prompt-authoring ability to create and refine Recipe templates through conversation. All delegate to existing `RecipeService` methods.

**Tools:**

- `list_recipes` — returns all recipes with id, name, and is_builtin flag. No params.
- `create_recipe` — creates a new custom recipe. Params: `name` (required), `prompt` (required), `model_override` (optional). Returns the new recipe ID.
- `update_recipe` — updates an existing recipe's name, prompt, or model override. Params: `recipe_id` (required), `name` (optional), `prompt` (optional), `model_override` (optional). Should return an error if the target recipe is built-in.

Each tool needs: a tool definition entry in the `TOOL_DEFINITIONS` array, and an executor case in `ChatToolExecutor`. The executor accesses `RecipeService` through the `ToolServices` bag.

## Acceptance criteria

- [ ] `list_recipes` returns all recipes with id, name, and is_builtin
- [ ] `create_recipe` creates a recipe and returns its ID
- [ ] `create_recipe` supports optional model_override
- [ ] `update_recipe` updates name, prompt, or model_override fields
- [ ] `update_recipe` returns an error when targeting a built-in recipe
- [ ] Error cases: missing required params, non-existent recipe_id
- [ ] Tests follow the existing `chat-tool-executor.test.ts` pattern

## Blocked by

- .scratch/ai-tools-refactor-services-bag/issue.md
