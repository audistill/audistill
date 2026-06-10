export type YouTubeUrlResult =
  | { canonical: string; videoId: string }
  | { error: string }

export function parseYouTubeUrl(input: string): YouTubeUrlResult {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return { error: 'Only YouTube video URLs are supported' }
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')
  if (host !== 'youtube.com' && host !== 'youtu.be') {
    return { error: 'Only YouTube video URLs are supported' }
  }

  if (host === 'youtube.com') {
    const path = url.pathname
    if (path.startsWith('/playlist')) {
      return { error: 'Playlist URLs are not supported — paste a single video URL' }
    }
    if (path.startsWith('/channel/') || path.startsWith('/@')) {
      return { error: 'Channel URLs are not supported — paste a single video URL' }
    }
  }

  let videoId: string | null = null

  if (host === 'youtu.be') {
    videoId = url.pathname.slice(1).split('/')[0] || null
  } else {
    const path = url.pathname
    if (path === '/watch') {
      videoId = url.searchParams.get('v')
    } else {
      const match = path.match(/^\/(shorts|live|embed)\/([^/]+)/)
      if (match) {
        videoId = match[2]
      }
    }
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return { error: 'Only YouTube video URLs are supported' }
  }

  return {
    canonical: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
  }
}
