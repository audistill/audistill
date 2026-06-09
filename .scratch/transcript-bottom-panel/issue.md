---
title: "Transcript bottom panel: toggle, resize, virtualized, search"
status: done
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

A toggleable bottom drawer panel that displays the episode transcript as a reference surface, visible alongside any content tab.

End-to-end behavior:
- A "Transcript" toggle button sits right-aligned in the content tab bar row (same row as the tabs and + button).
- Clicking it (or pressing Cmd+Shift+T) slides up a bottom panel within the content area. The tab content above shrinks to accommodate (simultaneously, 200ms ease-out animation).
- The panel has:
  - A header row: collapse button (−), "Transcript" label with episode duration, search icon, collapse chevron (^)
  - A resizable drag handle at the top edge (4px hit area)
  - Virtualized transcript content (using @tanstack/virtual) showing timestamp + speaker + text per line
- The transcript scrolls independently from the tab content above.
- Search: clicking the search icon (or Cmd+F when panel is focused) reveals an inline search bar. Matches are highlighted in amber. Up/down arrows navigate matches. Match count shown ("3 of 47").
- Resize: drag handle constrains between 25% and 65% of content area height. User's preferred ratio persists in settings/localStorage.
- Panel state (open/closed) persists per session. Scroll position persists across tab switches (transcript is episode-level, not tab-level).
- The old inline transcript accordion in the episode view is removed (transcript now lives exclusively in this panel).

Design follows the Xcode Debug Area pattern — a bottom panel for reference material that supports the primary content above.

## Acceptance criteria

- [ ] "Transcript" toggle button in tab bar row (right-aligned)
- [ ] Cmd+Shift+T keyboard shortcut toggles the panel
- [ ] Panel slides up with 200ms ease-out animation, content shrinks simultaneously
- [ ] Panel header shows: collapse button, "Transcript" label, duration, search icon
- [ ] Transcript renders with virtualized list (@tanstack/virtual) for performance
- [ ] Each line shows: timestamp, speaker label (if available), text
- [ ] Panel scrolls independently from tab content above
- [ ] Search: inline bar with match highlighting, navigation (up/down), match count
- [ ] Resize: drag handle between 25%-65% of content area height
- [ ] Resize preference persists across panel close/open and app restarts
- [ ] Panel open/closed state persists per session
- [ ] Scroll position preserved when switching between tabs
- [ ] Long transcripts (15,000+ lines) render without performance degradation
- [ ] Old transcript accordion in EpisodeView is removed
- [ ] Panel works correctly when chat sidebar is open (spans content area only)
- [ ] Minimum panel height of ~120px enforced; minimum content height of ~200px enforced
- [ ] All tests pass using TDD

## Blocked by

- `.scratch/dynamic-tab-bar-ui/issue.md`
