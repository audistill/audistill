import { isAbsolute } from 'node:path'
import type { OpenSourceLocatorResult, SourceLocator } from '../shared/source-locator'

export interface SourceLocatorOpener {
  openExternal: (url: string) => Promise<void>
  openPath: (path: string) => Promise<string>
}

interface EpisodeSource {
  source_type: string | null
  source_url: string | null
  file_path: string | null
}

export type EpisodeSourceFinder = (episodeId: string) => EpisodeSource | undefined

const SOURCE_UNAVAILABLE: OpenSourceLocatorResult = {
  success: false,
  error: 'This Episode has no Source Locator.',
}

function getSourceLocator(episode: EpisodeSource): SourceLocator | null {
  if (episode.source_type === 'local' && episode.file_path) {
    return { kind: 'local', value: episode.file_path }
  }

  if (
    (episode.source_type === 'youtube' || episode.source_type === 'rss' || episode.source_type === 'direct') &&
    episode.source_url
  ) {
    return { kind: 'remote', value: episode.source_url }
  }

  return null
}

function isSupportedRemoteUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

async function openSourceLocator(
  locator: SourceLocator,
  opener: SourceLocatorOpener,
): Promise<OpenSourceLocatorResult> {
  if (locator.kind === 'remote') {
    if (!isSupportedRemoteUrl(locator.value)) {
      return { success: false, error: 'This Source URL cannot be opened.' }
    }

    try {
      await opener.openExternal(locator.value)
      return { success: true }
    } catch {
      return { success: false, error: 'Source URL could not be opened.' }
    }
  }

  if (isAbsolute(locator.value)) {
    try {
      const error = await opener.openPath(locator.value)
      if (!error) return { success: true }
    } catch {
      // Return the same user-facing error as Electron openPath failures.
    }
  }

  return { success: false, error: 'Original file could not be opened.' }
}

export async function openEpisodeSource(
  episodeId: unknown,
  findEpisode: EpisodeSourceFinder,
  opener: SourceLocatorOpener,
): Promise<OpenSourceLocatorResult> {
  if (typeof episodeId !== 'string' || episodeId.trim() === '') {
    return SOURCE_UNAVAILABLE
  }

  let episode: EpisodeSource | undefined
  try {
    episode = findEpisode(episodeId)
  } catch {
    return SOURCE_UNAVAILABLE
  }

  if (!episode) return SOURCE_UNAVAILABLE

  const locator = getSourceLocator(episode)
  if (!locator) return SOURCE_UNAVAILABLE

  return openSourceLocator(locator, opener)
}
