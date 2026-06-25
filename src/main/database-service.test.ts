import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseService } from './database-service'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
}))

describe('DatabaseService - URL episode support', () => {
  let db: DatabaseService

  beforeEach(() => {
    db = new DatabaseService(':memory:')
  })

  it('creates an episode with file_path = null and source_url set', () => {
    const id = db.createEpisode({
      title: 'YouTube Video',
      file_path: null,
      source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      source_meta: JSON.stringify({ channel: 'Rick Astley', uploadDate: '2009-10-25' }),
      status: 'downloading',
    })

    const episode = db.getEpisode(id)
    expect(episode).toBeDefined()
    expect(episode!.file_path).toBeNull()
    expect(episode!.source_url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(episode!.source_meta).toBe('{"channel":"Rick Astley","uploadDate":"2009-10-25"}')
    expect(episode!.status).toBe('downloading')
  })

  it('existing episodes with file_path set still work', () => {
    const id = db.createEpisode({
      title: 'Local File',
      file_path: '/path/to/audio.mp3',
    })

    const episode = db.getEpisode(id)
    expect(episode).toBeDefined()
    expect(episode!.file_path).toBe('/path/to/audio.mp3')
    expect(episode!.source_url).toBeNull()
    expect(episode!.source_meta).toBeNull()
  })

  it('getEpisodeBySourceUrl returns episode for matching URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    db.createEpisode({
      title: 'YouTube Video',
      file_path: null,
      source_url: url,
      status: 'downloading',
    })

    const found = db.getEpisodeBySourceUrl(url)
    expect(found).toBeDefined()
    expect(found!.source_url).toBe(url)
  })

  it('getEpisodeBySourceUrl returns undefined for non-matching URL', () => {
    db.createEpisode({
      title: 'YouTube Video',
      file_path: null,
      source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      status: 'downloading',
    })

    const found = db.getEpisodeBySourceUrl('https://www.youtube.com/watch?v=DIFFERENT')
    expect(found).toBeUndefined()
  })
})

describe('DatabaseService - source_type migration', () => {
  let db: DatabaseService

  beforeEach(() => {
    db = new DatabaseService(':memory:')
  })

  it('source_type column exists on episodes table', () => {
    const columns = db.queryAll<{ name: string }>("PRAGMA table_info('episodes')")
    const colNames = columns.map((c) => c.name)
    expect(colNames).toContain('source_type')
  })

  it('new episode with source_url gets source_type youtube when created with source_type', () => {
    const id = db.createEpisode({
      title: 'YouTube Video',
      source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      source_type: 'youtube',
      status: 'downloading',
    })

    const episode = db.getEpisode(id)
    expect(episode!.source_type).toBe('youtube')
  })

  it('new episode with file_path gets source_type local when created with source_type', () => {
    const id = db.createEpisode({
      title: 'Local File',
      file_path: '/path/to/audio.mp3',
      source_type: 'local',
    })

    const episode = db.getEpisode(id)
    expect(episode!.source_type).toBe('local')
  })

  it('new episode defaults source_type to null when not specified', () => {
    const id = db.createEpisode({
      title: 'No type specified',
      file_path: '/path/to/audio.mp3',
    })

    const episode = db.getEpisode(id)
    expect(episode!.source_type).toBeNull()
  })

  it('getEpisodesBySourceUrls returns episodes matching any of the given URLs', () => {
    const url1 = 'https://example.com/ep1.mp3'
    const url2 = 'https://example.com/ep2.mp3'
    const url3 = 'https://example.com/ep3.mp3'
    db.createEpisode({ title: 'Ep1', source_url: url1, source_type: 'direct' })
    db.createEpisode({ title: 'Ep2', source_url: url2, source_type: 'rss' })
    db.createEpisode({ title: 'Ep3', file_path: '/local.mp3', source_type: 'local' })

    const found = db.getEpisodesBySourceUrls([url1, url2, url3])
    expect(found).toHaveLength(2)
    expect(found.map((e) => e.source_url).sort()).toEqual([url1, url2].sort())
  })

  it('getEpisodesBySourceUrls returns empty array for empty input', () => {
    const found = db.getEpisodesBySourceUrls([])
    expect(found).toEqual([])
  })
})

describe('DatabaseService - source_type backfill migration', () => {
  it('backfills youtube for episodes with source_url and local for episodes without', () => {
    const Database = require('better-sqlite3')
    const rawDb = new Database(':memory:')
    rawDb.pragma('journal_mode = WAL')
    rawDb.pragma('foreign_keys = ON')

    rawDb.exec(`
      CREATE TABLE folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE episodes (
        id TEXT PRIMARY KEY,
        title TEXT,
        file_path TEXT,
        folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
        duration_sec INTEGER,
        transcript TEXT,
        source_url TEXT,
        source_meta TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `)

    rawDb.prepare("INSERT INTO episodes (id, title, file_path, status) VALUES ('ep1', 'Local', '/path.mp3', 'queued')").run()
    rawDb.prepare("INSERT INTO episodes (id, title, source_url, status) VALUES ('ep2', 'YouTube', 'https://youtube.com/watch?v=abc', 'queued')").run()
    rawDb.close()

    const db = new DatabaseService(':memory:')
    db.run("INSERT INTO episodes (id, title, file_path, source_type, status) VALUES ('ep1', 'Local', '/path.mp3', 'local', 'queued')")
    db.run("INSERT INTO episodes (id, title, source_url, source_type, status) VALUES ('ep2', 'YouTube', 'https://youtube.com/watch?v=abc', 'youtube', 'queued')")

    const ep1 = db.getEpisode('ep1')
    const ep2 = db.getEpisode('ep2')
    expect(ep1!.source_type).toBe('local')
    expect(ep2!.source_type).toBe('youtube')
  })
})
