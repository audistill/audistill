---
title: "Dynamic tab bar + content display with view/edit toggle"
status: done
created: 2026-06-09
---

## Parent

`.scratch/recipe-driven-tabs/issue.md`

## What to build

Replace the fixed Brief/Detailed/Full segmented control with a dynamic secondary tab bar. Each tab displays its content with a view/edit mode toggle.

End-to-end behavior:
- Where the Brief/Detailed/Full segmented control currently sits, a tab bar renders dynamically from the ContentTabStore.
- Each tab shows its name. The pipeline tab has a subtle pin indicator and no close button. Other tabs have a close (×) button on hover.
- Clicking a tab activates it — its content fills the content area below.
- Double-clicking a tab name allows inline renaming (text input replaces the tab label, Enter confirms, Escape cancels).
- Closing a tab removes it from the store and database permanently.
- Below the tab bar, the active tab's content renders in one of two modes:
  - **View mode** (default): rendered markdown (same renderer used for current summaries)
  - **Edit mode**: raw markdown textarea (monospace, full height, auto-saves on change with 500ms debounce)
- A small view/edit segmented control sits in the top-right of the content area for mode switching.
- If the tab has no content (blank tab), show ghost placeholder text in edit mode: "Start typing, or ask the AI to generate something..."
- The old EpisodeView summary section (segmented control + summary rendering + generate buttons) is removed. The old CanvasView component is removed. ContentPane routes directly to the new tab content.

## Acceptance criteria

- [ ] Tab bar renders dynamically from ContentTabStore (correct names, order)
- [ ] Pipeline tab shows pin indicator and cannot be closed
- [ ] Other tabs show × on hover, clicking removes tab permanently
- [ ] Clicking a tab activates it and shows its content
- [ ] Double-click tab name enables inline rename (Enter saves, Escape cancels)
- [ ] View/Edit toggle in content area switches between markdown rendering and textarea
- [ ] Edit mode auto-saves content (debounced 500ms) to TabService
- [ ] Empty/blank tabs show placeholder text in edit mode
- [ ] Tab bar scrolls horizontally if tabs overflow
- [ ] Old segmented control (Brief/Detailed/Full) is removed
- [ ] Old CanvasView component is removed
- [ ] Old EpisodeView summary section is removed (generate buttons, summary rendering)
- [ ] Active tab persists per episode (switching away and back restores active tab)
- [ ] All tests pass using TDD

## Blocked by

- `.scratch/episode-tabs-data-layer/issue.md`
