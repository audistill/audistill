---
title: "UrlImportPopover Auto-Submit Mode"
status: done
created: 2026-06-14
---

## Parent

.scratch/mvp-inbox-sort-url-drop-paste-import/issue.md

## What to build

Add an `initialUrl` prop to `UrlImportPopover`. When provided, the popover skips the input step and immediately runs the same classification/preview flow that the "Go" button triggers — equivalent to the user having typed the URL and pressed Go.

This enables both URL drop and paste-to-import to reuse the existing popover infrastructure without duplicating classification, preview, or error handling logic.

The popover should position itself centered or in a sensible default position when opened programmatically (not anchored to the Add button).

## Acceptance criteria

- [ ] `UrlImportPopover` accepts an optional `initialUrl: string` prop
- [ ] When `initialUrl` is provided, the popover auto-submits on mount (no user interaction required to start classification)
- [ ] The same classification flow runs: YouTube → metadata preview, RSS → feed picker, Direct → file preview, Unsupported → error
- [ ] Error states (unsupported, duplicate, network failure) display the same UI as manual URL entry
- [ ] The popover can be opened without an anchor ref (for programmatic use from drop/paste flows)
- [ ] Existing manual URL entry flow (no `initialUrl`) continues to work unchanged

## Blocked by

None - can start immediately
