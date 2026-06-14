---
title: "URL Drop + Overlay Polish"
status: done
created: 2026-06-14
---

## Parent

.scratch/mvp-inbox-sort-url-drop-paste-import/issue.md

## What to build

Enable dragging a URL from a browser onto the Audistill window to trigger the URL classification → preview → ingest flow. Also polish the drop overlay visual.

In the existing drop handler in `App.tsx`, when no files are present in the drop event, check `dataTransfer.getData('text/uri-list')` and `dataTransfer.getData('text/plain')` for a valid URL. If found, open `UrlImportPopover` with the `initialUrl` prop to kick off classification.

Polish the `DropOverlay` component:
- Increase backdrop blur significantly (add `backdrop-blur-xl` or similar)
- Update primary text to "Drop to import"
- Update secondary text to "Audio files, YouTube links, podcast feeds"
- After a URL is dropped, transition the overlay to a brief "Checking link..." loading state before the popover takes over

## Acceptance criteria

- [ ] Dragging a YouTube URL from a browser and dropping it on the window opens the YouTube preview (thumbnail, title, Import button)
- [ ] Dragging an RSS feed URL and dropping it opens the feed picker
- [ ] Dragging a direct audio URL and dropping it opens the direct-import preview
- [ ] Dropping an unsupported URL shows the "Unsupported URL" error state
- [ ] Dropping a duplicate URL shows the "Already imported" state
- [ ] File drops continue to work as before (routed to `addFiles`)
- [ ] Drop overlay has visibly stronger backdrop blur than before
- [ ] Drop overlay text reads "Drop to import" with subtitle "Audio files, YouTube links, podcast feeds"
- [ ] After URL drop, a brief loading/classification state is visible before the preview popover appears

## Blocked by

- .scratch/url-import-popover-auto-submit/issue.md
