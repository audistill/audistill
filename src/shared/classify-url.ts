import { parseYouTubeUrl } from './youtube-url'

export type UrlClassification = 'youtube' | 'rss' | 'direct' | 'unsupported'

const RSS_TYPES = new Set([
  'application/rss+xml',
  'application/atom+xml',
  'text/xml',
  'application/xml',
])

export function classifyUrl(url: string, contentType: string): UrlClassification {
  const ytResult = parseYouTubeUrl(url)
  if ('videoId' in ytResult) return 'youtube'

  const mime = contentType.split(';')[0].trim().toLowerCase()
  if (RSS_TYPES.has(mime)) return 'rss'
  if (mime.startsWith('audio/') || mime.startsWith('video/')) return 'direct'

  return 'unsupported'
}
