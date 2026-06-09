---
title: "Settings: recipe editor accordion + pipeline selector"
status: done
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

Replace the existing settings fields (Brief Summary Model, Detailed & Chat Model, Default Summary View, Custom Instructions) with a unified recipe management UI in the Settings view.

End-to-end behavior:
- Settings shows a "Default Model" field (single global model selector, replaces the two separate model fields).
- Below that, a "Pipeline Template" dropdown listing all recipes — selects which recipe auto-runs on ingest.
- Below that, a "Templates" section with a `+ New` button and an inline accordion list of all recipes.
- Each recipe row shows: name (and "built-in" badge for the three defaults). Clicking a row expands it to reveal: name input, prompt textarea, and an "Advanced" disclosure containing model override dropdown.
- Built-in recipes are expandable and viewable. They can be duplicated ("Duplicate" button) but not deleted. Their prompts are editable (user may want to tweak them).
- Custom recipes have "Delete" and "Duplicate" actions.
- All changes persist immediately via IPC to the RecipeService.

The four existing settings fields are removed:
- "Brief Summary Model" → replaced by per-recipe model override
- "Detailed & Chat Model" → becomes "Default Model" (global)
- "Default Summary View" → becomes "Pipeline Template" dropdown
- "Custom Instructions" → absorbed into each recipe's prompt field

## Acceptance criteria

- [ ] "Default Model" field replaces the two model selectors (single model, used when no recipe override)
- [ ] "Pipeline Template" dropdown shows all recipes, selecting one updates the `pipeline_recipe_id` setting
- [ ] Templates section renders accordion list of all recipes
- [ ] Built-in recipes show "built-in" badge and have Duplicate button (no Delete)
- [ ] Custom recipes show Delete and Duplicate buttons
- [ ] Expanding a recipe shows: name input, prompt textarea, model override (under Advanced disclosure)
- [ ] Creating a new recipe via "+ New" adds an expanded empty row
- [ ] Duplicating a recipe creates a copy with " (copy)" suffix in name
- [ ] All changes persist immediately to the database via RecipeService
- [ ] Previous settings fields (Brief Summary Model, Detailed & Chat Model, Default Summary View, Custom Instructions) are removed
- [ ] Existing user settings are migrated gracefully (e.g., model_fast → Brief recipe model_override)
- [ ] All tests pass using TDD

## Blocked by

- `.scratch/recipe-data-layer/issue.md`
