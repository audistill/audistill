import { randomUUID } from 'crypto'
import { DatabaseService } from './database-service'

export interface EpisodeTab {
  id: string
  episode_id: string
  recipe_id: string | null
  tab_name: string
  content: string
  is_pipeline: number
  position: number
  generated_at: string | null
  generated_model: string | null
  created_at: string
  updated_at: string
}

export interface CreateTabOptions {
  recipe_id?: string | null
  tab_name?: string
  is_pipeline?: boolean
  content?: string
  generated_at?: string | null
  generated_model?: string | null
}

export class TabService {
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
    this.initSchema()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS episode_tabs (
        id TEXT PRIMARY KEY,
        episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
        recipe_id TEXT,
        tab_name TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        is_pipeline INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL,
        generated_at TEXT,
        generated_model TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    const columns = this.db.queryAll<{ name: string }>("PRAGMA table_info('episode_tabs')")
    const columnNames = new Set(columns.map((c) => c.name))
    if (!columnNames.has('generated_at')) {
      this.db.exec('ALTER TABLE episode_tabs ADD COLUMN generated_at TEXT')
    }
    if (!columnNames.has('generated_model')) {
      this.db.exec('ALTER TABLE episode_tabs ADD COLUMN generated_model TEXT')
    }
  }

  getTabs(episodeId: string): EpisodeTab[] {
    return this.db.queryAll<EpisodeTab>(
      'SELECT * FROM episode_tabs WHERE episode_id = ? ORDER BY position',
      episodeId
    )
  }

  createTab(episodeId: string, options: CreateTabOptions): string {
    const id = randomUUID()
    const recipeId = options.recipe_id ?? null
    const tabName = options.tab_name ?? 'Untitled'
    const isPipeline = options.is_pipeline ? 1 : 0
    const content = options.content ?? ''
    const generatedAt = options.generated_at ?? null
    const generatedModel = options.generated_model ?? null

    const maxPos = this.db.queryOne<{ max_pos: number }>(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM episode_tabs WHERE episode_id = ?',
      episodeId
    )
    const position = (maxPos?.max_pos ?? -1) + 1

    this.db.run(
      `INSERT INTO episode_tabs (id, episode_id, recipe_id, tab_name, content, is_pipeline, position, generated_at, generated_model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, episodeId, recipeId, tabName, content, isPipeline, position, generatedAt, generatedModel
    )
    return id
  }

  updateTabContent(tabId: string, content: string): void {
    this.db.run(
      `UPDATE episode_tabs SET content = ?, updated_at = datetime('now') WHERE id = ?`,
      content, tabId
    )
  }

  updateTabGeneratedContent(
    tabId: string,
    content: string,
    provenance: { generated_at: string; generated_model: string }
  ): void {
    this.db.run(
      `UPDATE episode_tabs
       SET content = ?, generated_at = ?, generated_model = ?, updated_at = datetime('now')
       WHERE id = ?`,
      content, provenance.generated_at, provenance.generated_model, tabId
    )
  }

  getTab(tabId: string): EpisodeTab | undefined {
    return this.db.queryOne<EpisodeTab>(
      'SELECT * FROM episode_tabs WHERE id = ?',
      tabId
    )
  }

  deleteTab(tabId: string): void {
    const tab = this.db.queryOne<EpisodeTab>(
      'SELECT * FROM episode_tabs WHERE id = ?',
      tabId
    )
    if (!tab) return
    this.db.run('DELETE FROM episode_tabs WHERE id = ?', tabId)
  }

  renameTab(tabId: string, name: string): void {
    this.db.run(
      `UPDATE episode_tabs SET tab_name = ?, updated_at = datetime('now') WHERE id = ?`,
      name, tabId
    )
  }

  reorderTabs(episodeId: string, tabIds: string[]): void {
    for (let i = 0; i < tabIds.length; i++) {
      this.db.run(
        'UPDATE episode_tabs SET position = ? WHERE id = ? AND episode_id = ?',
        i, tabIds[i], episodeId
      )
    }
  }
}
