---
title: Refactor summarization service to system/user message split
status: done
created: 2026-06-05
---

## What to build

Refactor `SummarizationService` to send summarization requests as a two-message array (system + user) instead of a single user message with XML-wrapped instructions and transcript combined.

- Rename `buildPrompt` to `buildMessages`, returning `[{role: 'system', content: ...}, {role: 'user', content: '<transcript>...</transcript>'}]`
- System message contains: the view-type prompt file content + `MARKDOWN_FORMAT_GUIDANCE` + optional custom instructions
- User message contains: only the transcript wrapped in `<transcript>` XML tags
- Update `summarize()` to pass the messages array directly to the OpenRouter API call instead of wrapping everything in a single user message

This is a pure mechanical refactor — no prompt content changes. All three view types (brief, detailed, full) use the same structure.

## Acceptance criteria

- [ ] `buildPrompt` is renamed to `buildMessages` and returns a messages array with system and user roles
- [ ] System message includes prompt template + markdown guidance + custom instructions (if set)
- [ ] User message is `<transcript>\n${transcript}\n</transcript>` only
- [ ] `summarize()` passes the messages array to the API request body
- [ ] All three view types (brief, detailed, full) work with the new structure
- [ ] No changes to prompt file content in this slice

## Blocked by

None - can start immediately
