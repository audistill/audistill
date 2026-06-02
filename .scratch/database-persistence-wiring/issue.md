---
title: "DatabaseService + persistence wiring"
status: done
created: 2026-06-02
---

## Parent

`.scratch/library-and-summarization/issue.md` — PRD: PodCapture v2 — Library & Summarization

## What to build

Add SQLite persistence to PodCapture. Create a DatabaseService module (main process) using `better-sqlite3` that manages schema initialization and full CRUD for episodes, folders, open_tabs, and settings. Wire it to the renderer via IPC so the UI loads real data from the database and writes changes back.

Replace the mock data from the UI shell with data loaded from SQLite on app launch. Tab state persists across restarts. The zustand store hydrates from IPC calls to the database on startup.

Schema (from PRD):
```sql
CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  title TEXT,
  file_path TEXT NOT NULL,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  duration_sec INTEGER,
  transcript TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE open_tabs (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  is_preview INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

Database location: `app.getPath('userData')/podcapture.db`. IDs generated as UUIDs. `folder_id = NULL` means Inbox.

Expand the preload/IPC layer to expose: `getEpisodes`, `getEpisode`, `getFolders`, `getOpenTabs`, `saveOpenTabs`, `getSetting`, `setSetting`.

## Acceptance criteria

- [ ] `better-sqlite3` added as dependency, DatabaseService module created in main process
- [ ] Schema auto-creates on first launch (all four tables)
- [ ] App hydrates sidebar (episodes, folders) from database on startup
- [ ] Open tabs persist across app restart (close app with 2 tabs open → relaunch → same tabs appear)
- [ ] Settings values persist (set a value → restart → value is there)
- [ ] Preload/IPC API exposes read operations for episodes, folders, tabs, settings
- [ ] Database stored at `app.getPath('userData')/podcapture.db`
- [ ] Empty database results in empty states showing correctly (no mock data fallback)

## Blocked by

- `.scratch/ui-shell-mock-data/issue.md` — UI shell with mock data
