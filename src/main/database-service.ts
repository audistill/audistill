import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface Episode {
  id: string
  title: string | null
  file_path: string
  folder_id: string | null
  duration_sec: number | null
  transcript: string | null
  status: string
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface EpisodeSummary {
  id: string
  episode_id: string
  view_type: 'brief' | 'detailed' | 'full'
  content: string
  status: 'generating' | 'complete' | 'error'
  error_message: string | null
  created_at: string
}

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
}

export interface OpenTab {
  id: string
  episode_id: string
  position: number
  is_preview: number
}

export class DatabaseService {
  private db: Database.Database

  constructor(dbPath?: string) {
    const path = dbPath ?? join(app.getPath('userData'), 'audistill.db')
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.init()
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        title TEXT,
        file_path TEXT NOT NULL,
        folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
        duration_sec INTEGER,
        transcript TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS episode_summaries (
        id TEXT PRIMARY KEY,
        episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
        view_type TEXT NOT NULL CHECK (view_type IN ('brief', 'detailed', 'full')),
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'complete', 'error')),
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(episode_id, view_type)
      );

      CREATE TABLE IF NOT EXISTS open_tabs (
        id TEXT PRIMARY KEY,
        episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        is_preview INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `)
  }

  getEpisodes(folderId?: string | null): Episode[] {
    if (folderId === undefined) {
      return this.db.prepare('SELECT * FROM episodes ORDER BY created_at DESC').all() as Episode[]
    }
    if (folderId === null) {
      return this.db
        .prepare('SELECT * FROM episodes WHERE folder_id IS NULL ORDER BY created_at DESC')
        .all() as Episode[]
    }
    return this.db
      .prepare('SELECT * FROM episodes WHERE folder_id = ? ORDER BY created_at DESC')
      .all(folderId) as Episode[]
  }

  getEpisode(id: string): Episode | undefined {
    return this.db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as Episode | undefined
  }

  createEpisode(data: {
    title?: string | null
    file_path: string
    folder_id?: string | null
    duration_sec?: number | null
    status?: string
  }): string {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO episodes (id, title, file_path, folder_id, duration_sec, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, data.title ?? null, data.file_path, data.folder_id ?? null, data.duration_sec ?? null, data.status ?? 'queued')
    return id
  }

  updateEpisode(id: string, fields: Partial<Omit<Episode, 'id' | 'created_at'>>): void {
    const allowed = ['title', 'file_path', 'folder_id', 'duration_sec', 'transcript', 'status', 'error_message']
    const entries = Object.entries(fields).filter(([key]) => allowed.includes(key))
    if (entries.length === 0) return

    const sets = entries.map(([key]) => `${key} = ?`).join(', ')
    const values = entries.map(([, val]) => val ?? null)
    this.db
      .prepare(`UPDATE episodes SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
      .run(...values, id)
  }

  deleteEpisode(id: string): void {
    this.db.prepare('DELETE FROM episodes WHERE id = ?').run(id)
  }

  getFolders(): Folder[] {
    return this.db.prepare('SELECT * FROM folders ORDER BY sort_order, name').all() as Folder[]
  }

  createFolder(name: string, parentId?: string | null): string {
    const id = randomUUID()
    const maxOrder = this.db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM folders WHERE parent_id IS ?')
      .get(parentId ?? null) as { max_order: number }
    this.db
      .prepare('INSERT INTO folders (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)')
      .run(id, name, parentId ?? null, maxOrder.max_order + 1)
    return id
  }

  updateFolder(id: string, fields: Partial<Pick<Folder, 'name' | 'parent_id' | 'sort_order'>>): void {
    const allowed = ['name', 'parent_id', 'sort_order']
    const entries = Object.entries(fields).filter(([key]) => allowed.includes(key))
    if (entries.length === 0) return

    const sets = entries.map(([key]) => `${key} = ?`).join(', ')
    const values = entries.map(([, val]) => val ?? null)
    this.db.prepare(`UPDATE folders SET ${sets} WHERE id = ?`).run(...values, id)
  }

  deleteFolder(id: string): void {
    this.db.prepare('DELETE FROM folders WHERE id = ?').run(id)
  }

  getOpenTabs(): OpenTab[] {
    return this.db.prepare('SELECT * FROM open_tabs ORDER BY position').all() as OpenTab[]
  }

  saveOpenTabs(tabs: { episode_id: string; position: number; is_preview: boolean }[]): void {
    const txn = this.db.transaction(() => {
      this.db.prepare('DELETE FROM open_tabs').run()
      const insert = this.db.prepare(
        'INSERT INTO open_tabs (id, episode_id, position, is_preview) VALUES (?, ?, ?, ?)'
      )
      for (const tab of tabs) {
        insert.run(randomUUID(), tab.episode_id, tab.position, tab.is_preview ? 1 : 0)
      }
    })
    txn()
  }

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? null
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(key, value)
  }

  searchEpisodes(query: string): Episode[] {
    const pattern = `%${query}%`
    return this.db
      .prepare(
        `SELECT DISTINCT e.* FROM episodes e
         LEFT JOIN episode_summaries es ON es.episode_id = e.id
         WHERE e.title LIKE ? OR es.content LIKE ?
         ORDER BY e.created_at DESC`
      )
      .all(pattern, pattern) as Episode[]
  }

  createSummary(episodeId: string, viewType: 'brief' | 'detailed' | 'full', status: 'generating' | 'complete' | 'error' = 'generating'): string {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO episode_summaries (id, episode_id, view_type, content, status)
         VALUES (?, ?, ?, '', ?)`
      )
      .run(id, episodeId, viewType, status)
    return id
  }

  updateSummary(episodeId: string, viewType: 'brief' | 'detailed' | 'full', fields: { content?: string; status?: 'generating' | 'complete' | 'error'; error_message?: string | null }): void {
    const allowed = ['content', 'status', 'error_message']
    const entries = Object.entries(fields).filter(([key]) => allowed.includes(key))
    if (entries.length === 0) return

    const sets = entries.map(([key]) => `${key} = ?`).join(', ')
    const values = entries.map(([, val]) => val ?? null)
    this.db
      .prepare(`UPDATE episode_summaries SET ${sets} WHERE episode_id = ? AND view_type = ?`)
      .run(...values, episodeId, viewType)
  }

  getSummaries(episodeId: string): EpisodeSummary[] {
    return this.db
      .prepare('SELECT * FROM episode_summaries WHERE episode_id = ?')
      .all(episodeId) as EpisodeSummary[]
  }

  getSummary(episodeId: string, viewType: 'brief' | 'detailed' | 'full'): EpisodeSummary | undefined {
    return this.db
      .prepare('SELECT * FROM episode_summaries WHERE episode_id = ? AND view_type = ?')
      .get(episodeId, viewType) as EpisodeSummary | undefined
  }

  close(): void {
    this.db.close()
  }
}
