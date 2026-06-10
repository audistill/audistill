---
title: "Informative toast for skipped files on mixed drop"
status: done
created: 2026-06-10
---

## What to build

When a user drops a batch of files that contains both supported and unsupported formats, show a toast listing the skipped filenames. Currently, unsupported files are silently ignored and the user only sees feedback when *zero* files match.

Behavior:
- If all files are valid: no toast, proceed normally
- If some files are valid and some are not: ingest valid files AND show toast like "2 files skipped (unsupported format): report.zip, notes.docx"
- If no files are valid: keep current behavior ("No supported audio files found")

Keep the toast brief — show filenames only (not full paths). If more than 3 files are skipped, truncate: "3 files skipped: a.zip, b.docx, c.txt" but for 5+: "5 files skipped (unsupported format)".

## Acceptance criteria

- [ ] Mixed drop (valid + invalid) shows toast with skipped filenames
- [ ] Valid files from the same drop are still ingested normally
- [ ] All-invalid drop retains current "No supported audio files found" message
- [ ] All-valid drop shows no toast
- [ ] Toast truncates gracefully for large numbers of skipped files

## Blocked by

- [Expand ingest allowlist to 11 formats](../expand-format-allowlist/issue.md)
