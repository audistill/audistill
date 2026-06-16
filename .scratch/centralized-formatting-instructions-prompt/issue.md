---
title: "Centralized formatting instructions and system prompt update"
status: done
created: 2026-06-16
---

## Parent

[Rich Markdown rendering with Mermaid diagrams and branded design system](../rich-markdown-mermaid-diagrams/issue.md)

## What to build

A single source of truth for the formatting instructions that both the Recipe system prompt and the Chat system prompt share. Create a module in `src/shared/` that exports the formatting rules string. Wire it into both `RECIPE_SYSTEM_FRAME` (in the Recipe service) and `buildSystemPrompt()` (in the Chat sidebar).

The formatting instructions should:
- List all supported markdown elements (h1-h3, bold, italic, bullet/numbered lists, blockquotes, nested blockquotes, links, inline code, fenced code blocks, horizontal rules, tables, task lists, footnotes, strikethrough, `==highlights==`, and mermaid code blocks)
- Provide brief examples or hints for when each is appropriate (tables for comparisons, task lists for action items, highlights for key terms, mermaid for processes/flows)
- Encourage the AI to use extended formatting when it genuinely improves comprehension of the content
- List supported Mermaid diagram types: flowchart (`graph TD`), sequence (`sequenceDiagram`), mindmap (`mindmap`), timeline (`timeline`), pie chart (`pie`)
- Explicitly ban images (no `![alt](url)`)
- Standardize on h1-h3 (resolving the existing h1-h3 vs h2-h3 mismatch between Chat and Recipe)

Remove the inline formatting sections from both `RECIPE_SYSTEM_FRAME` and `buildSystemPrompt()` and replace with the imported shared constant. The Recipe frame retains its structural requirement (TITLE:\n---\n<body>) separately — only the markdown-rules section is centralized.

## Acceptance criteria

- [ ] A shared module exports the formatting instructions as a string constant
- [ ] `RECIPE_SYSTEM_FRAME` in the Recipe service imports and uses the shared instructions (replacing the inline `<markdown-rules>` block)
- [ ] `buildSystemPrompt()` in the Chat sidebar imports and uses the shared instructions (replacing the inline "Tab Content Formatting" block)
- [ ] The formatting instructions mention all supported elements: headings, bold, italic, lists, blockquotes, nested blockquotes, links, code, fenced code, HRs, tables, task lists, footnotes, strikethrough, highlights, mermaid
- [ ] The instructions encourage usage for comprehension without forcing it
- [ ] The instructions list the 5 supported Mermaid diagram types with syntax hints
- [ ] Images are explicitly banned in the instructions
- [ ] h1-h3 is standardized across both prompts
- [ ] Existing recipe-service test is updated to verify assembled messages contain the shared formatting content
- [ ] AI responses in Chat now produce tables, task lists, and highlights when contextually appropriate

## Blocked by

- [RichMarkdown component with GFM, highlights, and branded CSS](../rich-markdown-component-gfm-branded/issue.md)
