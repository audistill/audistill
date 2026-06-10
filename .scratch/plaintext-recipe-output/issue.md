---
title: Replace JSON recipe output with plain-text title separator and enable live streaming
status: done
created: 2026-06-10
---

## What to build

Switch the recipe output format from JSON (`{"title": "...", "summary": "..."}`) to a plain-text convention that requires zero escaping:

```
TITLE: <title here>
---
<markdown summary>
```

Restructure the LLM message architecture so the app owns the output format contract (system message) independently of user-editable recipe content (user message).

### Why

LLMs (especially fast models like Gemini Flash) produce malformed JSON when streaming without `response_format: { type: 'json_object' }` — unescaped quotes inside long markdown strings break `JSON.parse`. The current fallback regex parser is 55 lines and still fails on edge cases. Plain text eliminates the entire class of bugs.

### Message architecture

The current structure is flat:

```
system = recipe.prompt + MARKDOWN_FORMAT_GUIDANCE
user   = <transcript>...</transcript>
```

The new structure separates concerns into three messages:

**Message 1 — System (app-owned, not user-editable):**

```xml
You are a knowledge assistant that summarises audio transcripts.

<output-format>
Your response MUST use this exact structure:

TITLE: <short descriptive title, under 80 characters>
---
<markdown body>

The first line is the title. The separator (---) marks where the body begins.
Do not wrap output in JSON, code fences, or any other container.
</output-format>

<markdown-rules>
Use only these markdown elements:
- Headings (h2-h3) for structure
- **Bold** and *italic* for emphasis
- Bullet lists and numbered lists
- Blockquotes for notable quotes
- Inline `code` for technical terms
- Horizontal rules (---) to separate major sections

Do not use tables, images, task lists, or nested blockquotes.
</markdown-rules>
```

**Message 2 — User (custom instructions + recipe template):**

```xml
<instructions>
{custom_instructions from settings, if any — omit tag entirely if empty}
</instructions>

<template>
{recipe prompt text — e.g. "Produce a concise overview (150-600 words) with sections: ## Rundown, ## Key details, ## Why it matters..."}
</template>
```

**Message 3 — User (transcript):**

```xml
<transcript>
{transcript content}
</transcript>
```

This ensures:
- Custom user prompts never need to know about `TITLE:\n---` — the system message owns that contract
- Built-in recipe prompts only describe content shape (tone, length, sections) — no format instructions
- The parsing contract is enforced at the system level, not per-recipe

### Scope

1. **System frame constant** — Create a `RECIPE_SYSTEM_FRAME` constant (replacing the current flat concat) that contains the output-format and markdown-rules XML blocks.

2. **Message assembly** — Update `RecipeService.executeRecipe()` to build three messages: system frame, user instructions+template, user transcript.

3. **Recipe prompt cleanup** — Remove all JSON format instructions from `brief.txt`, `detailed.txt`, `full.txt`. Keep only the content shape guidance (sections, length, tone).

4. **Parser simplification** — Replace `parseRecipeOutput()` and `extractJsonFromOutput()` in the ingest pipeline with a simple split on `\n---\n`. First line = title (strip `TITLE: ` prefix). Rest = summary. If no separator, entire content is the summary (graceful degradation).

5. **Live streaming UX** — Remove the spinner from `TabContentView`. Buffer tokens until `\n---\n` is found, then stream remaining tokens directly to the rendered markdown view. Users see their summary being written in real time.

6. **Remove `tab:content-updated` event from recipe flow** — With plain-text output, streamed content IS the final content. Keep the event only for non-streaming edits (chat tool executor).

## Acceptance criteria

- [ ] System message uses XML-tagged `<output-format>` and `<markdown-rules>` blocks
- [ ] Recipe prompts contain ONLY content shape guidance (no JSON or format instructions)
- [ ] Custom user instructions are passed in a separate user message with `<instructions>` tag
- [ ] `parseRecipeOutput()` is replaced with a split-based parser (under 10 lines)
- [ ] The `extractJsonFromOutput()` method is removed
- [ ] Importing a YouTube URL produces a Brief tab with rendered markdown (not raw JSON)
- [ ] During summarisation, users see markdown streaming live (no spinner)
- [ ] Title is extracted from `TITLE: ` prefix and saved to the episode record
- [ ] Graceful degradation: if no `\n---\n` separator, entire output treated as summary (no title extracted)
- [ ] Existing tests updated; new test covers: no-separator output, custom instructions in message
- [ ] Works across models: test with both the fast model (Gemini Flash) and quality model settings
- [ ] `tab:content-updated` IPC event only used for non-streaming content edits (chat tool executor)

## Blocked by

None - can start immediately
