---
title: "Copy tab content to clipboard (dual-format markdown + HTML)"
status: done
created: 2026-06-11
---

## Parent

`.scratch/copy-export-regenerate/issue.md`

## What to build

Add a copy button to the tab content toolbar that writes the tab's markdown content to the system clipboard in dual format: `text/plain` (raw markdown) and `text/html` (rendered HTML). This enables pasting into rich-text editors (Notion, Slack, Google Docs) with proper formatting, and into plain-text editors (VS Code, Obsidian) with raw markdown.

End-to-end flow: user clicks copy icon in tab toolbar → renderer sends tab content via IPC → main process converts markdown to HTML with `marked` → main process calls `clipboard.write({ text: rawMarkdown, html: renderedHtml })` → user sees brief feedback (icon flash or tooltip).

The copy button is available on all tab types (pipeline, recipe, canvas). It is disabled while the tab is actively streaming.

## Acceptance criteria

- [ ] `marked` (or equivalent lightweight markdown-to-HTML library) added as a dependency
- [ ] IPC handler `export:copy-tab` accepts a markdown string, renders to HTML, and writes both formats to clipboard via Electron's `clipboard.write()`
- [ ] Copy icon button visible in the tab content toolbar area
- [ ] Button is disabled (visually and functionally) while `streamingTabId === activeTabId`
- [ ] Pasting into a rich-text target (e.g., TextEdit rich mode) produces formatted output
- [ ] Pasting into a plain-text target produces raw markdown
- [ ] Brief visual feedback on successful copy (icon state change, tooltip, or similar)

## Blocked by

None — can start immediately.
