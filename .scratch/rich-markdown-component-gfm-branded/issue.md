---
title: "RichMarkdown component with GFM, highlights, and branded CSS"
status: done
created: 2026-06-16
---

## Parent

[Rich Markdown rendering with Mermaid diagrams and branded design system](../rich-markdown-mermaid-diagrams/issue.md)

## What to build

A shared `RichMarkdown` React component that replaces all bare `<Markdown>` usages across the app. It should support GFM (tables, task lists, footnotes, strikethrough, autolinks) and `==highlight==` syntax via remark plugins. All rendered output should be branded with Audistill's design system tokens.

Install `remark-gfm` and a remark plugin for `==text==` → `<mark>` (e.g. `remark-mark-highlight`). Create a `RichMarkdown` component that wires up both plugins and accepts a `content` string prop (and optional `streaming` boolean for future use).

Replace all four current usages of bare `<Markdown>` from `react-markdown`:
- Tab preview (view mode)
- Tab streaming content
- Chat `MessageBubble` (persisted messages)
- Chat `StreamingBubble` (in-flight messages)

Extend the `.markdown-content` CSS with branded styles:
- Terracotta `::marker` color on `ul` and `ol` list items
- `<table>` with `--surface` header background, `--border` cell borders, proper padding
- `<mark>` with `rgba(217, 119, 87, 0.15)` background, no default yellow
- Task list checkboxes with `accent-color: var(--accent)`
- Footnote references and section styled with `--secondary` text and `--surface` background
- Nested blockquotes with progressively lighter/thinner left borders
- Strikethrough with `--secondary` color

Streaming must continue to work — the component is a drop-in replacement for `<Markdown>` and should not introduce render issues when called with progressively growing content on every token.

## Acceptance criteria

- [ ] `remark-gfm` and a `==mark==` remark plugin are installed
- [ ] A `RichMarkdown` component exists and is used in all four render paths (Tab preview, Tab streaming, Chat MessageBubble, Chat StreamingBubble)
- [ ] GFM tables render as styled `<table>` with branded borders and header fill
- [ ] Task lists (`- [ ]`, `- [x]`) render as checkbox inputs with terracotta accent
- [ ] Footnotes (`[^1]`) render as superscript references with a footnote section at the bottom
- [ ] Strikethrough (`~~text~~`) renders correctly
- [ ] `==text==` renders as `<mark>` with terracotta-tinted background
- [ ] Bullet and numbered list markers are terracotta-colored
- [ ] Nested blockquotes render with progressively lighter left borders
- [ ] Streaming in Chat is not broken — partial markdown renders correctly as tokens arrive
- [ ] Non-mermaid fenced code blocks still render as `<pre><code>` (no regression)
- [ ] Component tests cover: tables, task lists, footnotes, highlights, nested blockquotes, standard markdown passthrough

## Blocked by

None - can start immediately
