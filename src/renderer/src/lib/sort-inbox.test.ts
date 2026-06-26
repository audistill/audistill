import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sortInboxEpisodes, groupInboxEpisodes } from './sort-inbox'
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
    source_type: null,
    status: 'complete',
    error_message: null,
    is_starred: false,
    starred_at: null,
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

describe('groupInboxEpisodes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('groups episodes into Today, This Week, Earlier buckets for newest mode', () => {
    const episodes = [
      makeEpisode({ id: 'today', created_at: '2026-06-14T08:00:00Z' }),
      makeEpisode({ id: 'this-week', created_at: '2026-06-10T10:00:00Z' }),
      makeEpisode({ id: 'earlier', created_at: '2026-06-01T10:00:00Z' }),
    ]
    const result = groupInboxEpisodes(episodes, 'newest')
    expect(result.map((g) => ({ label: g.label, ids: g.episodes.map((e) => e.id) }))).toEqual([
      { label: 'Today', ids: ['today'] },
      { label: 'This Week', ids: ['this-week'] },
      { label: 'Earlier', ids: ['earlier'] },
    ])
  })

  it('returns flat list with no label for longest mode', () => {
    const episodes = [
      makeEpisode({ id: 'short', duration_sec: 60, created_at: '2026-06-14T08:00:00Z' }),
      makeEpisode({ id: 'long', duration_sec: 3600, created_at: '2026-06-01T10:00:00Z' }),
    ]
    const result = groupInboxEpisodes(episodes, 'longest')
    expect(result).toEqual([{ label: '', episodes: expect.any(Array) }])
    expect(result[0].episodes.map((e) => e.id)).toEqual(['long', 'short'])
  })

  it('omits empty groups', () => {
    const episodes = [
      makeEpisode({ id: 'today-1', created_at: '2026-06-14T08:00:00Z' }),
      makeEpisode({ id: 'today-2', created_at: '2026-06-14T09:00:00Z' }),
    ]
    const result = groupInboxEpisodes(episodes, 'newest')
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Today')
    expect(result[0].episodes).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(groupInboxEpisodes([], 'newest')).toEqual([])
  })

  it('groups correctly with oldest mode (ascending within buckets)', () => {
    const episodes = [
      makeEpisode({ id: 'today', created_at: '2026-06-14T08:00:00Z' }),
      makeEpisode({ id: 'earlier', created_at: '2026-06-01T10:00:00Z' }),
    ]
    const result = groupInboxEpisodes(episodes, 'oldest')
    expect(result.map((g) => g.label)).toEqual(['Earlier', 'Today'])
    expect(result[0].episodes[0].id).toBe('earlier')
  })
})
