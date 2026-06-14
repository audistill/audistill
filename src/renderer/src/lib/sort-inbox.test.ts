import { describe, it, expect } from 'vitest'
import { sortInboxEpisodes } from './sort-inbox'
import type { Episode } from '../store/app-store'

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 'ep-1',
    title: 'Test Episode',
    file_path: null,
    folder_id: null,
    duration_sec: 300,
    transcript: null,
    source_url: null,
    source_meta: null,
    status: 'complete',
    error_message: null,
    created_at: '2026-06-14T10:00:00Z',
    updated_at: '2026-06-14T10:00:00Z',
    ...overrides,
  }
}

describe('sortInboxEpisodes', () => {
  it('sorts by created_at descending when mode is newest', () => {
    const episodes = [
      makeEpisode({ id: 'old', created_at: '2026-06-10T10:00:00Z' }),
      makeEpisode({ id: 'new', created_at: '2026-06-14T10:00:00Z' }),
      makeEpisode({ id: 'mid', created_at: '2026-06-12T10:00:00Z' }),
    ]
    const result = sortInboxEpisodes(episodes, 'newest')
    expect(result.map((e) => e.id)).toEqual(['new', 'mid', 'old'])
  })

  it('sorts by created_at ascending when mode is oldest', () => {
    const episodes = [
      makeEpisode({ id: 'old', created_at: '2026-06-10T10:00:00Z' }),
      makeEpisode({ id: 'new', created_at: '2026-06-14T10:00:00Z' }),
      makeEpisode({ id: 'mid', created_at: '2026-06-12T10:00:00Z' }),
    ]
    const result = sortInboxEpisodes(episodes, 'oldest')
    expect(result.map((e) => e.id)).toEqual(['old', 'mid', 'new'])
  })

  it('sorts by duration_sec descending when mode is longest, nulls at bottom', () => {
    const episodes = [
      makeEpisode({ id: 'short', duration_sec: 60 }),
      makeEpisode({ id: 'none', duration_sec: null }),
      makeEpisode({ id: 'long', duration_sec: 3600 }),
      makeEpisode({ id: 'mid', duration_sec: 600 }),
    ]
    const result = sortInboxEpisodes(episodes, 'longest')
    expect(result.map((e) => e.id)).toEqual(['long', 'mid', 'short', 'none'])
  })

  it('returns empty array for empty input', () => {
    expect(sortInboxEpisodes([], 'newest')).toEqual([])
    expect(sortInboxEpisodes([], 'oldest')).toEqual([])
    expect(sortInboxEpisodes([], 'longest')).toEqual([])
  })
})
