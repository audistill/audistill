---
title: "Prompt templates + SummarizationService multi-tier refactor + tests"
status: done
created: 2026-06-03
---

## Parent

[PRD: Multi-tier Summary Views](.scratch/summary-views/issue.md)

## What to build

Replace the single hardcoded `BASE_PROMPT` in SummarizationService with three prompt template files, and refactor the service to accept a `viewType` parameter that selects the correct template.

Create three prompt files in `src/main/prompts/`:
- `brief.txt` — Quick overview. 150-400 words. Lead sentence, key bullets, significance.
- `detailed.txt` — Structured reference. 500-1500 words. Multiple topical sections with bullets, auto-detected from content type.
- `full.txt` — Comprehensive notes. 2000-5000 words. Chapter-style with narrative paragraphs.

All prompts must:
- Instruct the LLM to match the transcript's language (including section headings)
- Use dynamic section headings chosen by the LLM based on content type (meeting, lecture, interview, podcast, etc.)
- Include scaling guidance (~10-20% of transcript length, within the tier's word range)
- Require specific details (names, numbers, comparisons)
- Return JSON with `"title"` and `"summary"` fields

Refactor `SummarizationService.summarize(transcript, viewType)` to:
- Load the corresponding prompt template file
- Append custom instructions
- Call OpenRouter as before

Title handling: only use the returned `title` when the episode has no title yet. The caller will decide this — the service always returns both fields.

## Acceptance criteria

- [ ] Three prompt files exist at `src/main/prompts/brief.txt`, `detailed.txt`, `full.txt`
- [ ] `SummarizationService.summarize()` signature is `(transcript: string, viewType: 'brief' | 'detailed' | 'full')`
- [ ] Correct prompt template is loaded based on `viewType`
- [ ] Custom instructions are appended to all three templates
- [ ] The old `BASE_PROMPT` constant is removed
- [ ] Unit tests (vitest, mocked HTTP) verify: correct template per view type, custom instructions appended, JSON parsing works, malformed JSON handled gracefully
- [ ] Each prompt file contains language-matching and dynamic-heading instructions
- [ ] Prompt files contain content-type examples (meeting, podcast, lecture, etc.)

## Blocked by

None - can start immediately.
