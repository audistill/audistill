---
title: "Scaffold Electron app with electron-vite"
status: done
created: 2026-06-02
---

## Parent

[PRD: Audistill — Minimum Prototype](.scratch/podscribe-prototype-prd/issue.md)

## What to build

Initialize the project using `electron-vite` with the React + TypeScript template and `pnpm` as the package manager. Set up Tailwind CSS and shadcn/ui. Define the design system CSS variables (--bg, --text, --secondary, --surface, --accent) for both dark and light mode, with automatic theme switching via `nativeTheme.themeSource = 'system'`. Configure typography (Poppins for headings, system font stack for body). The app should launch a BrowserWindow showing the idle state shell (empty content area, app chrome only). Spatial design: 12px corner radius, generous padding.

## Acceptance criteria

- [ ] `pnpm dev` launches an Electron window with hot reload
- [ ] Tailwind CSS and shadcn/ui are installed and configured
- [ ] CSS custom properties for the 5 color tokens are defined for both dark and light themes
- [ ] App follows macOS system theme automatically (dark/light)
- [ ] Poppins font is loaded for headings; body uses the system font stack
- [ ] BrowserWindow uses frameless or native titlebar appropriate for macOS
- [ ] Project structure follows electron-vite conventions (src/main, src/preload, src/renderer)
- [ ] `pnpm build` produces a runnable packaged app (not necessarily signed/notarized)

## Blocked by

None - can start immediately
