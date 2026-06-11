---
title: "Export single tab as markdown file"
status: done
created: 2026-06-11
---

## Parent

`.scratch/copy-export-regenerate/issue.md`

## What to build

Add an export-file button to the tab toolbar that saves the current tab's content as a `.md` file via Electron's native save dialog.

End-to-end flow: user clicks export icon in tab toolbar → renderer sends episode title + tab name + content via IPC → main process computes suggested filename → main process opens `dialog.showSaveDialog` with pre-filled filename and `.md` filter → user confirms → file written to disk.

**Filename convention:** `slugified-episode-title--tab-name.md`. Slugification: lowercase, replace non-alphanumeric characters with hyphens, collapse consecutive hyphens, trim leading/trailing hyphens. Double-dash `--` separates title from tab name.

Collision handling is delegated to the native OS save dialog (no custom auto-increment logic).

## Acceptance criteria

- [ ] Export-file icon button visible in tab toolbar (alongside copy icon)
- [ ] Button disabled while tab is streaming
- [ ] IPC handler `export:save-tab` receives content + episode title + tab name
- [ ] Suggested filename follows `slugified-title--tab-name.md` convention
- [ ] Special characters in title/tab-name are safely slugified
- [ ] Native save dialog opens with `.md` file filter and suggested name pre-filled
- [ ] File is written with UTF-8 encoding on user confirmation
- [ ] Dialog cancellation is handled gracefully (no error, no side effect)

## Blocked by

None — can start immediately.
