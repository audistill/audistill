import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface Episode {
  id: string
  title: string | null
  file_path: string | null
  folder_id: string | null
  duration_sec: number | null
  transcript: string | null
  source_url: string | null
  source_meta: string | null
  source_type: string | null
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

export interface ChatMessage {
  id: string
  episode_id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_calls: string | null
  created_at: string
}

export interface LicenseRecord {
  trial_started_at: string | null
  license_key: string | null
  activation_id: string | null
  last_validated_at: string | null
  machine_id: string | null
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
    this.migrate()
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
        file_path TEXT,
        folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
        duration_sec INTEGER,
        transcript TEXT,
        source_url TEXT,
        source_meta TEXT,
        source_type TEXT,
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

      CREATE TABLE IF NOT EXISTS episode_chat_messages (
        id TEXT PRIMARY KEY,
        episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
        content TEXT NOT NULL,
        tool_calls TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS episode_canvas (
        id TEXT PRIMARY KEY,
        episode_id TEXT NOT NULL UNIQUE REFERENCES episodes(id) ON DELETE CASCADE,
        content TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS episode_tabs (
        id TEXT PRIMARY KEY,
        episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
        recipe_id TEXT,
        tab_name TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        is_pipeline INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS license (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        trial_started_at TEXT,
        license_key TEXT,
        activation_id TEXT,
        last_validated_at TEXT,
        machine_id TEXT
      );
    `)
  }

  private migrate(): void {
    const columns = this.db
      .prepare("PRAGMA table_info('episodes')")
      .all() as { name: string }[]
    const colNames = new Set(columns.map((c) => c.name))

    if (colNames.size === 0) return

    if (!colNames.has('source_url')) {
      this.db.exec(`
        ALTER TABLE episodes ADD COLUMN source_url TEXT;
        ALTER TABLE episodes ADD COLUMN source_meta TEXT;
      `)
    }

    const filePathCol = (this.db
      .prepare("PRAGMA table_info('episodes')")
      .all() as { name: string; notnull: number }[])
      .find((c) => c.name === 'file_path')
    if (filePathCol && filePathCol.notnull === 1) {
      this.db.exec(`
        CREATE TABLE episodes_new (
          id TEXT PRIMARY KEY,
          title TEXT,
          file_path TEXT,
          folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
          duration_sec INTEGER,
          transcript TEXT,
          source_url TEXT,
          source_meta TEXT,
          source_type TEXT,
          status TEXT NOT NULL DEFAULT 'queued',
          error_message TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO episodes_new SELECT id, title, file_path, folder_id, duration_sec, transcript, source_url, source_meta, NULL, status, error_message, created_at, updated_at FROM episodes;
        DROP TABLE episodes;
        ALTER TABLE episodes_new RENAME TO episodes;
      `)
    }

    const colNamesAfter = new Set(
      (this.db.prepare("PRAGMA table_info('episodes')").all() as { name: string }[]).map((c) => c.name)
    )
    if (!colNamesAfter.has('source_type')) {
      this.db.exec("ALTER TABLE episodes ADD COLUMN source_type TEXT")
      this.db.exec(`
        UPDATE episodes SET source_type = 'youtube' WHERE source_url IS NOT NULL;
        UPDATE episodes SET source_type = 'local' WHERE source_url IS NULL;
      `)
    }
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

  getEpisodeBySourceUrl(url: string): Episode | undefined {
    return this.db.prepare('SELECT * FROM episodes WHERE source_url = ?').get(url) as Episode | undefined
  }

  getEpisodesBySourceUrls(urls: string[]): Episode[] {
    if (urls.length === 0) return []
    const placeholders = urls.map(() => '?').join(', ')
    return this.db
      .prepare(`SELECT * FROM episodes WHERE source_url IN (${placeholders})`)
      .all(...urls) as Episode[]
  }

  createEpisode(data: {
    title?: string | null
    file_path?: string | null
    folder_id?: string | null
    duration_sec?: number | null
    source_url?: string | null
    source_meta?: string | null
    source_type?: string | null
    status?: string
  }): string {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO episodes (id, title, file_path, folder_id, duration_sec, source_url, source_meta, source_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, data.title ?? null, data.file_path ?? null, data.folder_id ?? null, data.duration_sec ?? null, data.source_url ?? null, data.source_meta ?? null, data.source_type ?? null, data.status ?? 'queued')
    return id
  }

  updateEpisode(id: string, fields: Partial<Omit<Episode, 'id' | 'created_at'>>): void {
    const allowed = ['title', 'file_path', 'folder_id', 'duration_sec', 'transcript', 'source_url', 'source_meta', 'source_type', 'status', 'error_message']
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

  searchEpisodes(query: string): (Episode & { matched_in: string; matched_tab_name?: string })[] {
    const pattern = `%${query}%`
    const rows = this.db
      .prepare(
        `SELECT e.*,
           CASE
             WHEN e.title LIKE ? THEN 'title'
             WHEN e.transcript LIKE ? THEN 'transcript'
             ELSE 'tab'
           END AS matched_in,
           et.tab_name AS matched_tab_name
         FROM episodes e
         LEFT JOIN episode_tabs et ON et.episode_id = e.id AND et.content LIKE ?
         WHERE e.title LIKE ? OR e.transcript LIKE ? OR et.content LIKE ?
         GROUP BY e.id
         ORDER BY e.created_at DESC`
      )
      .all(pattern, pattern, pattern, pattern, pattern, pattern) as (Episode & { matched_in: string; matched_tab_name?: string })[]
    return rows
  }

  filterEpisodes(filters: {
    folder_id?: string | null
    date_from?: string
    date_to?: string
    duration_min?: number
    duration_max?: number
    source_type?: string
    has_transcript?: boolean
  }): Episode[] {
    const conditions: string[] = ["e.status = 'complete'"]
    const params: unknown[] = []

    if (filters.folder_id === null) {
      conditions.push('e.folder_id IS NULL')
    } else if (filters.folder_id !== undefined) {
      conditions.push('e.folder_id = ?')
      params.push(filters.folder_id)
    }

    if (filters.date_from) {
      conditions.push('e.created_at >= ?')
      params.push(filters.date_from)
    }
    if (filters.date_to) {
      conditions.push('e.created_at <= ?')
      params.push(filters.date_to)
    }
    if (filters.duration_min !== undefined) {
      conditions.push('e.duration_sec >= ?')
      params.push(filters.duration_min)
    }
    if (filters.duration_max !== undefined) {
      conditions.push('e.duration_sec <= ?')
      params.push(filters.duration_max)
    }
    if (filters.source_type) {
      conditions.push('e.source_type = ?')
      params.push(filters.source_type)
    }
    if (filters.has_transcript === true) {
      conditions.push("e.transcript IS NOT NULL AND e.transcript != ''")
    } else if (filters.has_transcript === false) {
      conditions.push("(e.transcript IS NULL OR e.transcript = '')")
    }

    const sql = `SELECT e.* FROM episodes e WHERE ${conditions.join(' AND ')} ORDER BY e.created_at DESC`
    return this.db.prepare(sql).all(...params) as Episode[]
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

  getChatMessages(episodeId: string): ChatMessage[] {
    return this.db
      .prepare('SELECT * FROM episode_chat_messages WHERE episode_id = ? ORDER BY created_at ASC')
      .all(episodeId) as ChatMessage[]
  }

  saveChatMessage(episodeId: string, role: 'user' | 'assistant' | 'tool', content: string, toolCalls?: string | null): string {
    const id = randomUUID()
    this.db
      .prepare('INSERT INTO episode_chat_messages (id, episode_id, role, content, tool_calls) VALUES (?, ?, ?, ?, ?)')
      .run(id, episodeId, role, content, toolCalls ?? null)
    return id
  }

  clearChatMessages(episodeId: string): void {
    this.db.prepare('DELETE FROM episode_chat_messages WHERE episode_id = ?').run(episodeId)
  }

  getCanvas(episodeId: string): string {
    const row = this.db
      .prepare('SELECT content FROM episode_canvas WHERE episode_id = ?')
      .get(episodeId) as { content: string } | undefined
    return row?.content ?? ''
  }

  saveCanvas(episodeId: string, content: string): void {
    this.db
      .prepare(
        `INSERT INTO episode_canvas (id, episode_id, content, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(episode_id) DO UPDATE SET content = excluded.content, updated_at = datetime('now')`
      )
      .run(randomUUID(), episodeId, content)
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  run(sql: string, ...params: unknown[]): void {
    this.db.prepare(sql).run(...params)
  }

  queryAll<T>(sql: string, ...params: unknown[]): T[] {
    return this.db.prepare(sql).all(...params) as T[]
  }

  queryOne<T>(sql: string, ...params: unknown[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined
  }

  getLicenseRecord(): LicenseRecord | null {
    const row = this.db.prepare('SELECT * FROM license WHERE id = 1').get() as (LicenseRecord & { id: number }) | undefined
    if (!row) return null
    const { id: _, ...record } = row
    return record
  }

  upsertLicenseRecord(fields: Partial<LicenseRecord>): void {
    const existing = this.db.prepare('SELECT id FROM license WHERE id = 1').get()
    if (!existing) {
      this.db.prepare(
        `INSERT INTO license (id, trial_started_at, license_key, activation_id, last_validated_at, machine_id)
         VALUES (1, ?, ?, ?, ?, ?)`
      ).run(
        fields.trial_started_at ?? null,
        fields.license_key ?? null,
        fields.activation_id ?? null,
        fields.last_validated_at ?? null,
        fields.machine_id ?? null
      )
    } else {
      const entries = Object.entries(fields).filter(([key]) =>
        ['trial_started_at', 'license_key', 'activation_id', 'last_validated_at', 'machine_id'].includes(key)
      )
      if (entries.length === 0) return
      const sets = entries.map(([key]) => `${key} = ?`).join(', ')
      const values = entries.map(([, val]) => val ?? null)
      this.db.prepare(`UPDATE license SET ${sets} WHERE id = 1`).run(...values)
    }
  }

  close(): void {
    this.db.close()
  }
}
