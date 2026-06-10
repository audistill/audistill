---
title: "PRD: Audistill v3 — UI/UX Polish"
status: done
created: 2026-06-02
---

## Problem Statement

Audistill's core features (library management, episode summarization, folder organization) are functional but lack the fit-and-finish of a native macOS app. The context menu dumps all folders into a flat list making it hard to move episodes when folder count grows. Summaries are stored as markdown but rendered as plain text, losing all formatting structure. Sidebar episode items show only titles with no metadata, making it hard to distinguish episodes at a glance. Small interaction details — focus states, transitions, empty states, search UX — feel web-app-ish rather than native desktop.

## Solution

A polish pass across all existing UI components to bring them to native macOS quality. No new features — only enhance what exists. The visual reference is `prototypes/v3-polish.html` which demonstrates all changes interactively.

## User Stories

1. As a user, I want the context menu to show "Move to..." as a single item that reveals folders in a flyout submenu, so that the menu stays compact regardless of how many folders I have.
2. As a user, I want the flyout submenu to appear on hover after a short delay (~150ms), so that it feels responsive like a native macOS menu.
3. As a user, I want the flyout to show my folder hierarchy with visual indentation, so that I can see nested folders in context.
4. As a user, I want the episode's current folder to appear disabled with a "(current)" label in the flyout, so that I know where the episode already lives without leaving the menu.
5. As a user, I want the context menu to show Rename, Move to, and Delete (with a separator before Delete), so that common actions are accessible and destructive actions are visually isolated.
6. As a user, I want the context menu to auto-focus the first item on open, so that I can immediately use keyboard navigation after right-clicking.
7. As a user, I want to navigate the context menu with arrow keys (up/down between items, right to open flyout, left to close flyout), Enter to select, and Escape to close, so that I can operate it without the mouse.
8. As a user, I want episode summaries rendered with proper markdown styling (bold text, bullet lists, paragraphs), so that the Rundown format is visually structured and easy to scan.
9. As a user, I want the summary section to have a left terracotta accent bar, so that it stands out as the primary content area with visual warmth.
10. As a user, I want sidebar episode items to show a subtitle line with duration and relative date (e.g. "42m · 3 days ago"), so that I can identify episodes without opening them.
11. As a user, I want interactive elements to show a background highlight on keyboard focus (focus-visible), so that I can navigate with the keyboard and always see where focus is.
12. As a user, I want transitions to feel consistent — fast for hover/focus (150ms), slightly longer for reveals like menus and expanding sections (200ms), so that the app feels cohesive.
13. As a user, I want transitions to list explicit CSS properties rather than using `transition: all`, so that animations are predictable and performant.
14. As a user, I want empty states (empty inbox, empty folder, empty library) to show a relevant icon and encouraging microcopy guiding me toward the next action, so that the app never feels broken.
15. As a user, I want the search input to have a clear (×) button when text is entered, so that I can quickly reset my search.
16. As a user, I want the clear button to keep focus in the search input after clearing, so that I can immediately type a new query.
17. As a user, I want the search input to have an aria-label, so that assistive tools can identify it.

## Implementation Decisions

### Modules to Modify

1. **ContextMenu component** (rewrite) — Replace the current flat `ContextMenu` function in `Sidebar.tsx` with a new component supporting:
   - Structured item types: `action`, `submenu`, `separator`
   - Flyout submenu panel positioned to the right of the parent item
   - Hover-triggered flyout with 150ms delay (using `setTimeout`, cleared on mouse leave)
   - Keyboard state machine: tracks `focusedIndex` via `useState`, arrow keys move focus, Enter fires action, Escape closes, ArrowRight opens flyout, ArrowLeft closes it
   - Auto-focus first item on mount via `useEffect` + ref
   - Episode context menu items: `[Rename, {submenu: "Move to...", children: folders}, separator, Delete]`
   - Folder items in flyout: flat list with `paddingLeft` for depth, current folder shown with `opacity-50 cursor-default` and "(current)" suffix, disabled

2. **SidebarEpisode component** (modify) — Change from single-line to two-line layout:
   - Line 1: episode title (truncated)
   - Line 2: `{formatDuration(duration_sec)} · {formatRelativeDate(created_at)}` in smaller muted text
   - Add a `formatRelativeDate` utility (returns "3 days ago", "2 weeks ago", "May 12" for older than 30 days)
   - Processing episodes: keep the status indicator on line 2 instead of duration/date

3. **EpisodeView component** (modify) — Replace the `whitespace-pre-wrap` plain text summary div with:
   - Install `react-markdown` as a dependency
   - Render `episode.summary` through `<ReactMarkdown components={...}>` 
   - Custom component map: `p` → text paragraph with spacing, `strong` → bold text, `ul` → disc list with spacing, `li` → list item with margin, `h2`/`h3` → heading with font-heading class
   - Wrap the markdown output in a container with `border-l-[3px] border-[var(--accent)] pl-4` for the accent bar

4. **Empty states** (modify across Sidebar and EmptyState components) — Replace plain text empty states:
   - Empty inbox: inbox tray icon + "Add audio files to start building your knowledge base"
   - Empty folder: folder-plus icon + "Move episodes here to organize them"
   - Empty library (no folders, no episodes): headphones icon + "Drop audio files here or click Add to get started"
   - All use muted secondary color, centered layout within their container

5. **Search input** (modify in Sidebar) — Add:
   - `aria-label="Search episodes"` on the input element
   - Conditional clear button (× icon) visible when `searchQuery.length > 0`
   - Clear handler: sets search query to empty string, returns focus to input via ref

6. **Global styles / transitions** (modify `main.css` + inline classes) — Audit and fix:
   - Replace any `transition-colors` or `transition-all` with explicit properties: `transition-[background-color,color]` for hover states, `transition-[opacity]` for reveals
   - Standardize durations: `duration-150` for micro-interactions (hover, focus), `duration-200` for reveals (context menu, flyout, folder expand/collapse, transcript toggle)
   - Add `.sidebar-item:focus-visible { background-color: var(--surface); outline: none; }` 
   - Add `button:focus-visible { background-color: var(--surface); outline: none; }` as base style

### Key Technical Decisions

- **No new dependencies except `react-markdown`** — the rest is pure component restructuring
- **Context menu stays as React component** (not Electron native menu) — this allows the flyout submenu and custom styling consistent with the app's design system
- **Relative date formatting** uses `Intl.RelativeTimeFormat` — no library needed, native browser API available in Electron's Chromium
- **Flyout always positions right** — the context menu triggers from the left-positioned sidebar, so there's always room. No flip logic needed.
- **No `role="menu"` ARIA** — this is a local Electron app without screen reader use; keyboard navigation is for power users, not accessibility compliance

### Interaction Details

- **Flyout hover zone:** The parent "Move to..." item AND the flyout panel share a hover zone (mouse leaving parent to enter flyout should not close it). Implement with a shared timeout — cancel close on flyout mouseenter.
- **Context menu dismiss:** Click anywhere outside closes the menu (existing behavior preserved via `window.addEventListener('click')`).
- **Rename from context menu:** Closes the menu, then triggers the existing `setEditingFolderId` / inline rename flow already built in the sidebar.

## Testing Decisions

No automated tests for this PRD. This is a visual polish pass — all changes are validated by:

1. Running the Electron app and comparing behavior against `prototypes/v3-polish.html`
2. Verifying keyboard navigation flows (right-click → arrow keys → Enter/Escape)
3. Checking dark mode and light mode rendering
4. Testing edge cases: many folders in flyout, very long episode titles, empty states in all positions

Prior art for manual validation: the v2 PRD was also validated by running the app against `prototypes/library-ui.html`.

## Out of Scope

- Reduced motion / `prefers-reduced-motion` handling
- Changes to the summarization prompt or prompt templates
- New features (chat, export, drag-and-drop, audio playback)
- Full ARIA compliance (`role="menu"`, `aria-activedescendant`)
- Native Electron context menus (staying with React components for design consistency)
- Component-level unit tests or integration tests
- Changes to the backend / main process (all changes are renderer-only except `npm install react-markdown`)

## Further Notes

- **Prototype reference:** `prototypes/v3-polish.html` is the visual spec for this PRD. It demonstrates all 7 improvements interactively with a variant switcher at the bottom.
- **Dependency addition:** `react-markdown` (~30kb gzipped with remark dependencies). Install via `npm install react-markdown`. No configuration needed — it works as a drop-in React component.
- **Relative date utility:** Use `Intl.RelativeTimeFormat('en', { numeric: 'auto' })` with thresholds: <1 hour → "just now", <24h → "X hours ago", <7 days → "X days ago", <30 days → "X weeks ago", else → `Intl.DateTimeFormat` short date (e.g. "May 12").
- **Migration from v2:** No data migration. All changes are in the renderer layer. Database schema unchanged.
- **Future consideration:** When the Prompt Template feature is added later, the markdown renderer is already in place and will handle richer output formats automatically.
