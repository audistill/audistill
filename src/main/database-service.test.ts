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
