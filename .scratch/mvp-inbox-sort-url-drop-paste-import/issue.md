---
title: "MVP Polish: Inbox Sort/Group, URL Drop, Paste-to-Import"
status: done
created: 2026-06-14
---

## Problem Statement

Audistill's Library grows unwieldy once a user accumulates 10-50+ Episodes in the Inbox. The flat chronological list offers no way to scan or sort, and the Inbox cannot be collapsed to give Folders more visual space. Meanwhile, importing content from external sources requires navigating a multi-step menu flow (click Add → Import from URL → paste → Go) even though the user already has the URL on their clipboard or is dragging it from a browser tab.

## Solution

Three targeted improvements that make the MVP feel polished without adding conceptual weight:

1. **Inbox Sort & Date Grouping** — collapsible Inbox with a cycle-on-click sort toggle and automatic date-bucket dividers.
2. **URL Drop** — drag a link from any browser onto the app window to trigger the existing URL classification → preview → ingest flow.
3. **Paste-to-Import** — Cmd+V / Ctrl+V a URL from the clipboard to jump directly into the preview flow when no text input is focused.

## User Stories

1. As a user with 30+ Episodes in my Inbox, I want to collapse the Inbox section so that my Folders get more visual space in the sidebar.
2. As a user scanning my Inbox, I want to sort by newest-first, oldest-first, or longest-duration so that I can find the Episode I'm looking for faster.
3. As a user browsing a chronological Inbox, I want Episodes grouped under date dividers (Today / This Week / Earlier) so that I can orient myself temporally without reading each timestamp.
4. As a user sorting by longest duration, I want a flat list without date dividers so that the sort order isn't visually contradicted by date groups.
5. As a user reopening the app, I want my chosen sort order to persist across restarts so that I don't have to re-select it each session.
6. As a user who found a YouTube link in my browser, I want to drag that link onto the Audistill window and see the same preview (thumbnail, title, Import button) that I'd get from the URL popover so that importing is faster.
7. As a user dragging a podcast RSS link from a browser, I want to drop it on the app and see the feed picker so that I can select which episodes to import.
8. As a user dragging a direct audio file URL, I want to drop it on the app and see the direct-import preview (title, format, size) so that I can confirm before importing.
9. As a user dragging content into the window, I want the drop overlay to clearly communicate what's accepted ("Audio files, YouTube links, podcast feeds") regardless of what I'm dragging.
10. As a user dropping a URL, I want to see a loading/classification state in the overlay before the preview appears so that the transition feels smooth rather than jarring.
11. As a user who just copied a YouTube URL to my clipboard, I want to Cmd+V in the app (when I'm not typing in a text field) and immediately see the video preview so that I can import with one keystroke.
12. As a user who pastes a non-URL string, I want nothing to happen so that the shortcut doesn't interfere with normal clipboard usage.
13. As a user who pastes a URL while typing in the search box or Chat, I want the paste to behave normally (insert text) so that the shortcut only fires when no input is focused.
14. As a user who drops an unsupported URL, I want to see the same error state ("Unsupported URL") that the URL popover shows so that I understand what went wrong.
15. As a user who drops a duplicate URL, I want to see the "Already imported" state so that I know I don't need to import again.

## Implementation Decisions

### Inbox Sort/Group

- Add `inboxSort: 'newest' | 'oldest' | 'longest'` and `inboxCollapsed: boolean` to the Zustand app store.
- Add `setInboxSort` and `toggleInboxCollapsed` actions.
- Persist `inboxSort` and `inboxCollapsed` via `localStorage` (same pattern as other UI state like `expandedFolders`).
- Sort/group logic is a pure function: takes `Episode[]` + sort mode, returns either a flat sorted array (longest) or grouped buckets `{ label: string, episodes: Episode[] }[]` (newest/oldest).
- Date bucketing uses three groups: "Today" (same calendar day), "This week" (within last 7 days, excluding today), "Earlier" (everything else). Based on `created_at`.
- The Inbox header row gains a chevron (same `▾`/`▸` pattern as folder nodes) and a sort label (e.g. "Newest") to the right of the count badge. Clicking the label cycles: Newest → Oldest → Longest → Newest.
- Date dividers are thin horizontal rules with centered small text, styled consistently with existing secondary text (`text-[10px] text-[var(--secondary)]`).
- Sort/filter controls are scoped to Inbox only. Folder episode lists remain unsorted (display order from DB).

### URL Drop

- In `App.tsx`'s existing `handleDrop`, check `dataTransfer.getData('text/uri-list')` or `dataTransfer.getData('text/plain')` for a valid URL when no files are present.
- If a URL is detected, open the `UrlImportPopover` programmatically and trigger its submit/classification flow with the dropped URL pre-filled.
- The `UrlImportPopover` needs a new prop or mode: `initialUrl?: string` that auto-submits on mount (equivalent to typing + hitting Go).
- The `DropOverlay` visual updates:
  - Increase `backdrop-blur` significantly (from current `bg-black/60` to e.g. `bg-black/60 backdrop-blur-xl`).
  - Update copy to: primary text "Drop to import", secondary text "Audio files, YouTube links, podcast feeds".
  - After a URL is dropped, the overlay can transition to "Checking link..." state briefly while classification runs.

### Paste-to-Import (Cmd+V / Ctrl+V)

- Add a global `paste` event listener in `App.tsx`.
- On paste, check `document.activeElement` — if it's an `input`, `textarea`, or `[contenteditable]`, do nothing (let native paste happen).
- Otherwise, read `clipboardData.getData('text/plain')`, attempt to parse as URL (`new URL(text)`), and if valid, trigger the same flow as URL drop (open UrlImportPopover with `initialUrl`).
- No visual indicator before the popover appears — the paste is fast enough that the preview appears nearly immediately.

## Testing Decisions

Good tests for these features exercise external behavior (what the user sees / what state changes) rather than internal implementation details.

### Inbox Sort/Group

- Test the pure sort/group function: given a list of Episodes with known `created_at` and `duration_sec` values, assert correct ordering and bucket assignment for each sort mode.
- Test edge cases: episodes from today only, no episodes, episodes all in "Earlier" bucket, episodes with null duration.
- Prior art: `src/shared/classify-url.test.ts` — pure function tests with vi.

### URL Drop

- The classification logic is already tested in `classify-url.test.ts`.
- Test the dataTransfer sniffing logic: given a drop event with `text/uri-list` data, assert it routes to the URL flow rather than the file flow.
- Prior art: `src/main/url-head-service.test.ts` for mocking network calls.

### Paste-to-Import

- Test the focus-guard: paste events when an input is focused should not trigger import.
- Test URL validation: non-URL clipboard content should be ignored.
- Test valid URL: clipboard containing a URL should trigger the import flow.

## Out of Scope

- Full-text transcript search (searching within transcript content, not just titles).
- Filter by source type (YouTube/RSS/Local/Direct).
- Sort/filter/group controls on Folder episode lists.
- Drag-and-drop reordering of episodes within the sidebar.
- Any changes to the URL classification logic itself.
- Smart/automatic folder assignment based on source.

## Further Notes

- The three features share a common backend: the URL classification → preview → ingest pipeline built in `UrlImportPopover`. The work is primarily about exposing that pipeline through additional entry points (drop, paste) and adding lightweight UI state (sort/collapse) to the sidebar.
- The DropOverlay visual polish (stronger blur, updated copy) is a low-risk improvement that makes the entire drag-drop experience feel more premium regardless of what's being dropped.
- Sort state persistence via localStorage is intentionally simple — no DB migration needed.
