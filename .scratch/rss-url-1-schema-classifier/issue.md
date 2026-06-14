---
title: "RSS/URL support: schema migration + URL classifier"
status: done
created: 2026-06-14
---

## Parent

`.scratch/rss-and-url-support/issue.md`

## What to build

Add a `source_type` column to the Episodes table and create a shared URL classifier function that determines what kind of URL the user pasted.

**Schema migration**: Add `episodes.source_type TEXT` column. Backfill existing rows: episodes with `source_url` set get `'youtube'`, all others get `'local'`. The column accepts four values: `'local'`, `'youtube'`, `'rss'`, `'direct'`.

**URL classifier**: A pure shared function that takes a URL string and a Content-Type string (from a HEAD request) and returns a classification: `'youtube' | 'rss' | 'direct' | 'unsupported'`. Detection order:
1. YouTube regex match → `'youtube'`
2. Content-Type is `application/rss+xml`, `application/atom+xml`, `text/xml`, or `application/xml` → `'rss'`
3. Content-Type is `audio/*` or `video/*` → `'direct'`
4. Anything else → `'unsupported'`

**HEAD request IPC handler**: A main-process IPC handler (`url:head`) that performs an HTTP HEAD request (following redirects) and returns the final Content-Type and Content-Length headers. This is the bridge between the renderer (which calls the classifier) and the network.

## Acceptance criteria

- [ ] Migration adds `source_type` column and backfills existing episodes correctly
- [ ] Existing episodes with `source_url` set get `source_type = 'youtube'`
- [ ] Existing episodes without `source_url` get `source_type = 'local'`
- [ ] `classifyUrl` pure function returns correct classification for all supported Content-Types
- [ ] `classifyUrl` returns `'unsupported'` for `text/html` and other non-matching types
- [ ] YouTube regex still works for all existing URL patterns (no regression)
- [ ] `url:head` IPC handler follows redirects and returns final Content-Type + Content-Length
- [ ] Unit tests cover classifier (all Content-Type variants, edge cases)
- [ ] Migration test verifies column exists and backfill logic is correct

## Blocked by

None - can start immediately.
