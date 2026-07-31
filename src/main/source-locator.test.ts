import { describe, expect, it, vi } from 'vitest'
import {
  openEpisodeSource,
  type EpisodeSourceFinder,
  type SourceLocatorOpener,
} from './source-locator'

function makeOpener(): SourceLocatorOpener {
  return {
    openExternal: vi.fn().mockResolvedValue(undefined),
    openPath: vi.fn().mockResolvedValue(''),
  }
}

function makeFinder(overrides: {
  source_type?: string | null
  source_url?: string | null
  file_path?: string | null
} = {}): EpisodeSourceFinder {
  return vi.fn().mockReturnValue({
    source_type: 'youtube',
    source_url: 'https://example.com/episode',
    file_path: null,
    ...overrides,
  })
}

const unavailableResult = {
  success: false,
  error: 'This Episode has no Source Locator.',
}

describe('openEpisodeSource', () => {
  it.each([
    ['youtube', 'https://example.com/watch?v=episode'],
    ['direct', 'http://example.com/episode.mp3'],
    ['rss', 'https://feeds.example.com/enclosures/episode.mp3'],
  ])(
    'opens the persisted %s Source Locator',
    async (sourceType, sourceUrl) => {
      const opener = makeOpener()
      const findEpisode = makeFinder({ source_type: sourceType, source_url: sourceUrl })

      await expect(openEpisodeSource('episode-1', findEpisode, opener)).resolves.toEqual({ success: true })

      expect(findEpisode).toHaveBeenCalledWith('episode-1')
      expect(opener.openExternal).toHaveBeenCalledWith(sourceUrl)
      expect(opener.openPath).not.toHaveBeenCalled()
    },
  )

  it('opens the persisted Local Source Locator in the default app', async () => {
    const opener = makeOpener()
    const findEpisode = makeFinder({
      source_type: 'local',
      source_url: null,
      file_path: '/media/interview.mp3',
    })

    await expect(openEpisodeSource('episode-1', findEpisode, opener)).resolves.toEqual({ success: true })

    expect(opener.openPath).toHaveBeenCalledWith('/media/interview.mp3')
    expect(opener.openExternal).not.toHaveBeenCalled()
  })

  it.each([undefined, null, '', '   ', { id: 'episode-1' }])(
    'rejects malformed Episode ID %j without consulting the database',
    async (episodeId) => {
      const opener = makeOpener()
      const findEpisode = makeFinder()

      await expect(openEpisodeSource(episodeId, findEpisode, opener)).resolves.toEqual(unavailableResult)

      expect(findEpisode).not.toHaveBeenCalled()
      expect(opener.openExternal).not.toHaveBeenCalled()
      expect(opener.openPath).not.toHaveBeenCalled()
    },
  )

  it('returns a failure result for an unknown Episode', async () => {
    const opener = makeOpener()
    const findEpisode = vi.fn().mockReturnValue(undefined)

    await expect(openEpisodeSource('missing-episode', findEpisode, opener)).resolves.toEqual(unavailableResult)

    expect(opener.openExternal).not.toHaveBeenCalled()
    expect(opener.openPath).not.toHaveBeenCalled()
  })

  it('returns a failure result when the Episode lookup fails', async () => {
    const opener = makeOpener()
    const findEpisode = vi.fn(() => {
      throw new Error('database unavailable')
    })

    await expect(openEpisodeSource('episode-1', findEpisode, opener)).resolves.toEqual(unavailableResult)
  })

  it.each([
    { source_type: 'recorded', source_url: null, file_path: null },
    { source_type: 'local', source_url: null, file_path: null },
  ])('returns a failure result for an Episode without a Source Locator', async (episode) => {
    const opener = makeOpener()
    const findEpisode = makeFinder(episode)

    await expect(openEpisodeSource('episode-1', findEpisode, opener)).resolves.toEqual(unavailableResult)

    expect(opener.openExternal).not.toHaveBeenCalled()
    expect(opener.openPath).not.toHaveBeenCalled()
  })

  it.each(['file:///tmp/episode.mp3', 'javascript:alert(1)', 'not a URL'])(
    'rejects the unsupported persisted remote Source Locator %s',
    async (sourceUrl) => {
      const opener = makeOpener()
      const findEpisode = makeFinder({ source_url: sourceUrl })

      await expect(openEpisodeSource('episode-1', findEpisode, opener)).resolves.toEqual({
        success: false,
        error: 'This Source URL cannot be opened.',
      })

      expect(opener.openExternal).not.toHaveBeenCalled()
    },
  )

  it('rejects a relative persisted Local Source Locator', async () => {
    const opener = makeOpener()
    const findEpisode = makeFinder({
      source_type: 'local',
      source_url: null,
      file_path: '../interview.mp3',
    })

    await expect(openEpisodeSource('episode-1', findEpisode, opener)).resolves.toEqual({
      success: false,
      error: 'Original file could not be opened.',
    })

    expect(opener.openPath).not.toHaveBeenCalled()
  })

  it('reports when the default app cannot open a persisted Local Source Locator', async () => {
    const opener = makeOpener()
    vi.mocked(opener.openPath).mockResolvedValue('The file does not exist')
    const findEpisode = makeFinder({
      source_type: 'local',
      source_url: null,
      file_path: '/missing/interview.mp3',
    })

    await expect(openEpisodeSource('episode-1', findEpisode, opener)).resolves.toEqual({
      success: false,
      error: 'Original file could not be opened.',
    })
  })
})
