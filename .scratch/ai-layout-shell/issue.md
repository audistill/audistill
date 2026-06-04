---
title: "Layout shell: sidebar toggles + content view switching"
status: done
created: 2026-06-04
---

## Parent

`.scratch/ai-chat-and-canvas/issue.md`

## What to build

Add the structural layout changes that enable the Chat and Canvas features without implementing either feature's logic.

End-to-end behavior:
- TabBar gains two panel-style toggle icons: one at the left edge (after macOS traffic lights) to show/hide the left sidebar, and one at the right edge to show/hide the right sidebar area. Icons use muted gray when the panel is closed, warm amber tint when open.
- Each icon sits in a fixed ~36px zone at the tab bar edges, visually separated from the scrolling tabs.
- The left sidebar is open by default (matching current behavior). The right sidebar is closed by default (placeholder empty div for now — the ChatSidebar component comes in a later slice).
- EpisodeView gains a canvas icon button in the metadata row (right-aligned, same row as filename/duration/date). Clicking it switches the main content area to a placeholder Canvas view. Clicking it again (or an equivalent control in the Canvas placeholder) switches back to Episode view.
- The existing "Ask about this episode... (coming soon)" chat placeholder at the bottom of EpisodeView is removed.
- ContentPane routes between EpisodeView and a placeholder CanvasView based on the active content view state.
- Keyboard shortcuts: Cmd+B toggles left sidebar, Cmd+Shift+L toggles right sidebar.
- App store gains: `leftSidebarOpen` (boolean, default true), `rightSidebarOpen` (boolean, default false), `activeContentView` ('episode' | 'canvas', per-episode or global — simplest is global for v1).

## Acceptance criteria

- [ ] Left sidebar toggle icon appears in TabBar after traffic lights; clicking it hides/shows the Sidebar component
- [ ] Right sidebar toggle icon appears at the right edge of TabBar; clicking it shows/hides a placeholder right panel (360px fixed width)
- [ ] Toggle icons use muted color when closed, amber accent when open
- [ ] Canvas icon button appears in EpisodeView metadata row; clicking switches main content to a placeholder "Canvas" view
- [ ] Switching back to Episode view works (either via the same icon or a control in the placeholder)
- [ ] The segmented control row position is preserved — placeholder Canvas view shows nothing in that space for now
- [ ] "Ask about this episode... (coming soon)" placeholder is removed from EpisodeView
- [ ] Cmd+B toggles left sidebar, Cmd+Shift+L toggles right sidebar
- [ ] Layout does not break when both sidebars are open, when both are closed, or any combination
- [ ] No regressions to existing episode view, tab navigation, or sidebar functionality

## Blocked by

None - can start immediately
