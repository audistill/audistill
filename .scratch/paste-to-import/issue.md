---
title: "Paste-to-Import (Cmd+V / Ctrl+V)"
status: done
created: 2026-06-14
---

## Parent

.scratch/mvp-inbox-sort-url-drop-paste-import/issue.md

## What to build

Add a global paste listener that detects URLs on the clipboard and triggers the URL import preview flow — collapsing the 4-step import process to a single Cmd+V / Ctrl+V keystroke.

A `paste` event listener in `App.tsx` checks whether the active element is a text input (`input`, `textarea`, or `[contenteditable]`). If it is, the paste proceeds normally. If no text input is focused, the listener reads `clipboardData.getData('text/plain')`, validates it as a URL (`new URL(text)` succeeds), and opens `UrlImportPopover` with the `initialUrl` prop.

Non-URL clipboard content is silently ignored. No visual indicator appears before the popover — the flow is fast enough that the preview surfaces almost immediately.

## Acceptance criteria

- [ ] Cmd+V / Ctrl+V with a YouTube URL on clipboard (no input focused) opens the YouTube preview
- [ ] Cmd+V / Ctrl+V with an RSS URL on clipboard opens the feed picker
- [ ] Cmd+V / Ctrl+V with a direct audio URL on clipboard opens the direct-import preview
- [ ] Pasting while an `input`, `textarea`, or `[contenteditable]` element is focused does NOT trigger import (native paste behavior preserved)
- [ ] Pasting non-URL text (e.g. "hello world") when no input is focused does nothing
- [ ] Pasting an invalid URL (e.g. "not://a url") when no input is focused does nothing
- [ ] The feature works on both macOS (Cmd+V) and other platforms (Ctrl+V)

## Blocked by

- .scratch/url-import-popover-auto-submit/issue.md
