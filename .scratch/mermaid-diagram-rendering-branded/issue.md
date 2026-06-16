---
title: "Mermaid diagram rendering with branded theme and lazy loading"
status: done
created: 2026-06-16
---

## Parent

[Rich Markdown rendering with Mermaid diagrams and branded design system](../rich-markdown-mermaid-diagrams/issue.md)

## What to build

Add Mermaid.js diagram rendering to the `RichMarkdown` component. When a fenced code block has the `mermaid` language identifier and is syntactically complete, render it as a branded SVG diagram instead of raw code.

Install `mermaid` as a dependency. Add a custom `code` component override to `RichMarkdown` that:
1. Detects `language-mermaid` class on fenced code blocks
2. Lazy-loads Mermaid via dynamic `import('mermaid')` on first encounter (zero cost if no diagrams exist)
3. Calls `mermaid.render()` with the code content
4. Injects the resulting SVG into the DOM inside a container with `overflow-x: auto`
5. On parse failure, falls back to rendering the raw code block as `<pre><code>` with a subtle error indicator (e.g. small "⚠ diagram syntax error" text in `--secondary` color above the block)

Configure Mermaid with a branded theme at initialization:
- Node fill: read from `--surface` CSS variable via `getComputedStyle()`
- Node text: read from `--text`
- Node border: read from `--accent` (terracotta)
- Edges and arrows: read from `--accent` (terracotta)
- Background: transparent
- Font: system font stack (inherit from app)
- Resolve colors at render time so dark/light mode works without separate theme configs

Streaming behavior: during Chat streaming, incomplete mermaid fenced blocks (no closing ```) render as normal code blocks (this is the default react-markdown behavior for unclosed fences). Once the closing fence arrives in the stream, the next re-render triggers Mermaid rendering. No special streaming logic needed beyond what the parser already provides.

The rendered SVG is static (non-interactive). No pan/zoom — wide diagrams scroll horizontally within their container.

## Acceptance criteria

- [ ] `mermaid` package is installed
- [ ] Mermaid is lazy-loaded — only fetched on first mermaid code block encounter, not at app startup
- [ ] Valid mermaid code blocks render as SVG diagrams within the content flow
- [ ] Diagrams use branded colors: terracotta borders/edges, surface node fills, correct text color
- [ ] Diagrams adapt to dark mode and light mode (colors resolved from CSS custom properties)
- [ ] Invalid mermaid syntax falls back to a raw code block with a subtle error indicator
- [ ] Non-mermaid fenced code blocks are unaffected (render as normal `<pre><code>`)
- [ ] Streaming in Chat is not broken — incomplete mermaid blocks show as code, complete ones render as diagrams
- [ ] Wide diagrams have horizontal scroll, not overflow
- [ ] All 5 advertised diagram types render correctly: flowchart, sequence, mindmap, timeline, pie
- [ ] Component tests cover: successful render (mocked), error fallback, non-mermaid code passthrough

## Blocked by

- [RichMarkdown component with GFM, highlights, and branded CSS](../rich-markdown-component-gfm-branded/issue.md)
