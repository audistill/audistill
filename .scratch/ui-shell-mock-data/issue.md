---
title: "UI shell with mock data (full layout, all views)"
status: done
created: 2026-06-02
---

## Parent

`.scratch/library-and-summarization/issue.md` — PRD: PodCapture v2 — Library & Summarization

## What to build

Replace the existing single-screen renderer with the full library UI. This is a complete React rewrite of the renderer process implementing: AppShell (sidebar + tabs + content pane layout), Sidebar (search, inbox, expandable folder tree), TabBar (preview/pin behavior, persist state in memory), EpisodeView (title, metadata, Rundown summary, collapsible transcript, chat placeholder), SettingsView (API key, model selector, custom instructions), OnboardingView (welcome + key input — non-functional, just the view), and all empty states (empty library, empty folder, empty inbox).

Populate with hardcoded mock data (3-4 episodes with realistic summaries, 2-3 folders, processing items in inbox). All navigation and interaction should work against this mock data — clicking sidebar items opens tabs, tabs preview/pin, folders expand/collapse, transcript collapses, theme follows system preference.

Use zustand for state management. Follow the visual spec in `prototypes/library-ui.html` exactly for layout, spacing, colors, and interactions.

Design system tokens (CSS variables):
- Dark: bg `#141413`, text `#faf9f5`, secondary `#c2c0b8`, surface `#1e1e1c`, accent `#d97757`
- Light: bg `#faf9f5`, text `#141413`, secondary `#7a7870`, surface `#e8e6dc`, accent `#d97757`
- Typography: Poppins (headings), SF Pro / system stack (body)
- Border radius: 12px, generous spacing

Tab behavior: single-click sidebar item = preview (italic tab, replaces existing preview). Double-click = pin (persistent tab). Settings opens as closable tab from gear icon in sidebar header. Sidebar highlight syncs with active tab.

No backend wiring — all data is in-memory mock. IPC layer is not touched yet.

## Acceptance criteria

- [ ] App launches and shows the Craft.do-style layout (sidebar ~280px + tab bar + content pane)
- [ ] Sidebar shows Inbox section with mock processing items (with animated status indicators)
- [ ] Sidebar shows expandable/collapsible folder tree with mock folders and episodes
- [ ] Search input in sidebar header (filtering mock data in-memory)
- [ ] Single-click sidebar item opens in preview tab (italic title, replaces other preview)
- [ ] Double-click sidebar item opens in pinned tab (persistent, closeable)
- [ ] Episode detail view shows: editable title (pencil on hover), metadata line, Rundown summary (lead/details/why it matters), collapsed transcript (expandable), chat placeholder pinned at bottom
- [ ] Settings view shows API key field, model selector, custom instructions textarea (non-functional, just renders)
- [ ] Onboarding view renders (welcome + key input + validate button — no real validation)
- [ ] Empty states render for: empty library, empty folder, empty inbox
- [ ] Dark/light mode follows macOS system preference via CSS variables
- [ ] Sidebar highlight stays in sync with active tab
- [ ] Gear icon in sidebar header opens Settings as a closable tab
- [ ] "+ Add" button visible in sidebar header (opens native file dialog placeholder/alert)
- [ ] Layout matches `prototypes/library-ui.html` visual spec

## Blocked by

None — can start immediately.
