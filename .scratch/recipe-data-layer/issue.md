---
title: "Recipe data layer: schema, service, seed built-ins"
status: ready-for-agent
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

The foundational data layer for prompt template recipes. This includes the database schema, a RecipeService with CRUD operations, and seeding of three built-in recipes (Brief, Detailed, Full) on first run.

End-to-end behavior:
- On app startup, a `recipes` table exists in SQLite with three built-in rows (seeded from the existing prompt `.txt` files).
- RecipeService provides `getRecipes()`, `getRecipe(id)`, `createRecipe(data)`, `updateRecipe(id, data)`, `deleteRecipe(id)`, `getPipelineRecipe()`.
- Built-in recipes cannot be deleted (attempting to delete throws or returns an error).
- Each recipe has: id, name, prompt, optional model_override, is_builtin flag, sort_order.
- A settings key `pipeline_recipe_id` designates which recipe auto-runs on ingest (defaults to the Brief recipe).
- RecipeService can execute a recipe against a transcript: builds system/user messages, calls OpenRouter streaming API, forwards tokens via a callback. This replaces the summarization logic in SummarizationService.

The existing prompt files (`brief.txt`, `detailed.txt`, `full.txt`) remain as the source of truth for built-in recipe prompts. On first run, their contents are loaded into the recipes table. If the DB already has built-in recipes, prompts are NOT overwritten (user may have changed settings that affect behavior).

## Acceptance criteria

- [ ] `recipes` table created via migration with columns: id, name, prompt, model_override, is_builtin, sort_order, created_at
- [ ] Three built-in recipes seeded on first run (Brief, Detailed, Full) with prompts from existing `.txt` files
- [ ] RecipeService CRUD operations work correctly (create, read, update, delete)
- [ ] Built-in recipes cannot be deleted (is_builtin protection)
- [ ] Built-in recipes CAN be updated (name, model_override — but not is_builtin flag)
- [ ] Custom recipes can be created with name + prompt + optional model_override
- [ ] `getPipelineRecipe()` returns the recipe designated in settings (defaults to Brief)
- [ ] `executeRecipe(recipeId, transcript, onToken)` streams LLM response tokens via callback
- [ ] Model resolution: recipe.model_override > global default model setting
- [ ] IPC handlers registered for recipe CRUD and listing
- [ ] All tests pass using TDD (red-green-refactor)

## Blocked by

None - can start immediately
