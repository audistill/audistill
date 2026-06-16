---
title: "Rich Markdown rendering with Mermaid diagrams and branded design system"
status: done
created: 2026-06-16
---

## Problem Statement

Tab content and Chat messages render only basic Markdown (headings, bold, italic, lists, blockquotes, code, links, HRs). The AI is explicitly forbidden from producing tables, task lists, or diagrams. This limits the AI's ability to communicate structured information effectively — comparisons lack tables, processes lack visual flow diagrams, and action items can't use checkboxes. The rendering is also visually generic with no brand identity in the formatted output.

## Solution

Extend the Markdown rendering pipeline to support Mermaid.js diagrams, GFM tables, task lists, footnotes, strikethrough, and `==highlight==` syntax. Brand the entire rendered output with Audistill's terracotta accent color system. Update the AI system prompts to encourage use of these features when they aid comprehension. Centralize formatting instructions so Chat and Recipe execution share a single source of truth.

## User Stories

1. As a user viewing a Tab, I want to see Mermaid diagrams rendered as branded SVG visuals, so that process flows and relationships discussed in an episode are immediately understandable.
2. As a user chatting with the AI, I want the AI to produce tables when comparing topics, so that I can scan structured information quickly.
3. As a user reviewing action items from a meeting, I want task lists with checkboxes, so that I can see what was discussed as to-dos at a glance.
4. As a user reading AI-generated content, I want key terms and critical points highlighted with a branded background, so that important information stands out.
5. As a user viewing footnotes in generated content, I want them rendered as proper footnote references with a footnote section, so that supplementary detail doesn't clutter the main flow.
6. As a user viewing a Tab while the AI is still streaming, I want incomplete Mermaid code blocks to show as raw code until the block closes, so that streaming is never broken or visually jarring.
7. As a user viewing a Mermaid diagram that failed to parse, I want to see the raw source code with a subtle error indicator, so that content is never silently lost.
8. As a user in dark mode, I want Mermaid diagrams to use surface fills and terracotta borders that match my current theme, so that diagrams feel native to the app.
9. As a user in light mode, I want the same branded diagram treatment adapted for the light palette, so that diagrams are always readable.
10. As a user viewing bullet lists, I want terracotta-colored bullet markers, so that the rendered content feels cohesive with the Audistill brand.
11. As a user viewing a table, I want branded borders and header styling using the app's color tokens, so that tables look intentional rather than default browser chrome.
12. As a user asking the AI to explain a complex topic, I want the AI to proactively use diagrams and tables when they aid understanding, so that I get the best representation without having to explicitly request formatting.
13. As a user editing a Tab in edit mode, I want to see the raw extended markdown syntax (mermaid blocks, ==highlights==, task lists), so that I can modify them directly.
14. As a user copying or exporting Tab content, I want the raw extended markdown preserved, so that it renders correctly in other tools that support these extensions.
15. As a user with many Episodes that have no diagrams, I want Mermaid.js to only load when needed, so that app startup is not slowed by unused code.
16. As a user viewing a diagram that's wider than the content area, I want horizontal scroll on the diagram container, so that I can see the full diagram without breaking the page layout.
17. As a user running a custom Recipe that asks for a visual overview, I want the Recipe output to include Mermaid diagrams in the generated Tab, so that visual content works everywhere not just Chat.
18. As a user viewing nested blockquotes (quote-within-quote), I want them styled with indentation and progressively lighter borders, so that quoted citations are visually clear.

## Implementation Decisions

- **Single shared `RichMarkdown` component**: A new React component replaces all four current usages of bare `<Markdown>` (Tab preview, Tab streaming, Chat MessageBubble, Chat StreamingBubble). Accepts `content` string and optional `streaming` boolean prop.
- **Remark plugin stack**: `remark-gfm` (tables, task lists, footnotes, strikethrough, autolinks) and `remark-mark-highlight` (or equivalent for `==text==` → `<mark>`). No `rehype-raw` — raw HTML stays disabled.
- **Mermaid rendering via custom code component**: The `RichMarkdown` component provides a custom `code` renderer that detects `language-mermaid` class. On complete fenced blocks, it lazy-loads Mermaid and renders to SVG. On parse failure, falls back to raw code block with a subtle "⚠ diagram syntax error" indicator.
- **Lazy loading Mermaid**: Dynamic `import('mermaid')` on first encounter of a mermaid code block. Zero cost if no diagrams exist in the viewed content.
- **Static SVG output**: Diagrams are non-interactive. Container has `overflow-x: auto` for wide diagrams.
- **Mermaid theme — terracotta accents (Option B)**: Node fill uses `--surface`, node text uses `--text`, node borders and edges/arrows use `--accent` (terracotta). Background transparent. Theme values read from `getComputedStyle()` at render time so dark/light mode works without re-initialization.
- **Supported Mermaid diagram types** (advertised to AI): Flowchart (`graph TD`), Sequence (`sequenceDiagram`), Mindmap (`mindmap`), Timeline (`timeline`), Pie chart (`pie`). All other Mermaid types will still render if produced, but the prompt only encourages these five.
- **Centralized formatting instructions**: A new module `src/shared/formatting-instructions.ts` exports the formatting rules string. Both `recipe-service.ts` (main process) and `ChatSidebar.tsx` (renderer) import from it. The Recipe system frame and Chat system prompt reference this single source.
- **Formatting prompt content**: Lists all supported elements with examples, encourages usage when it aids comprehension, explicitly bans images. Allows nested blockquotes.
- **Branded CSS for markdown-content**: Terracotta `::marker` on bullets, styled `<table>` with `--surface` header fill and `--border` cell borders, `<mark>` with `rgba(217, 119, 87, 0.15)` background, task list checkboxes with `accent-color: var(--accent)`, nested blockquotes with progressively lighter left borders.
- **Images remain banned**: No `<img>` rendering — the AI has no valid image source from transcripts.
- **Export/Edit unchanged**: Copy, export, and edit mode show raw extended markdown syntax. No WYSIWYG.

## Testing Decisions

Good tests for this feature verify external rendering behavior — given markdown input, assert on the rendered DOM output or the shape of the system prompt. Do not test internal Mermaid API calls or plugin wiring.

**Modules to test:**

1. **`src/shared/formatting-instructions.ts`** — Unit test that the exported constant contains required markers (mentions mermaid, tables, highlights, task lists, the image ban). Guards against accidental deletion of formatting guidance. Pattern: pure module test like `classify-url.test.ts`.

2. **`src/renderer/src/components/RichMarkdown.test.tsx`** — Component tests verifying:
   - Standard markdown (headings, bold, lists) renders unchanged
   - GFM table syntax produces `<table>` elements
   - Task list syntax (`- [ ]`, `- [x]`) produces checkbox inputs
   - `==text==` produces `<mark>` elements
   - Footnote syntax produces footnote references and section
   - Mermaid code block with valid syntax produces an SVG container (mock Mermaid's `render()`)
   - Mermaid code block with invalid syntax falls back to `<pre><code>` with error indicator
   - Non-mermaid fenced code blocks render as normal `<pre><code>`
   - Pattern: component unit tests using vitest + testing library

3. **`src/main/recipe-service.test.ts`** — Extend existing test to verify the assembled system message includes the shared formatting instructions content. Pattern: already exists, asserts on message assembly.

## Out of Scope

- WYSIWYG editing of extended markdown in Tab edit mode
- Interactive/zoomable diagram canvas (pan, zoom, drag)
- Image rendering or image pipeline
- Custom diagram types beyond Mermaid.js
- Mermaid diagram types beyond the five advertised (flowchart, sequence, mindmap, timeline, pie) — they'll still render if produced, but no prompt encouragement
- Re-rendering diagrams on live theme change (re-mount handles it)
- Syntax highlighting within fenced code blocks (non-mermaid)
- Changes to the write_tab / edit_tab tool interfaces

## Further Notes

- The existing h1-h3 vs h2-h3 mismatch between Chat and Recipe prompts should be resolved when centralizing. Recommend h1-h3 for both — Tabs can use h1 as document title, Chat rarely produces h1 anyway.
- The `marked` package in dependencies appears unused by the renderer (only `react-markdown` is used for display). Confirm whether `marked` can be removed or if it's used elsewhere before cleanup.
- Mermaid.js is ~1.5-2MB. Acceptable for Electron (disk space only, lazy-loaded so no startup cost). Monitor if it affects renderer memory on machines with many open Tabs containing diagrams.
