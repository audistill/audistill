import { parseYouTubeUrl } from './youtube-url'

export type UrlClassification = 'youtube' | 'rss' | 'direct' | 'unsupported'

const RSS_TYPES = new Set([
  'application/rss+xml',
  'application/atom+xml',
  'text/xml',
  'application/xml',
])

const SUPPORTED_MEDIA_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/ogg',
  'audio/aac',
  'audio/opus',
  'audio/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
  'video/ogg',
])

export function classifyUrl(url: string, contentType: string): UrlClassification {
  const ytResult = parseYouTubeUrl(url)
  if ('videoId' in ytResult) return 'youtube'

  const mime = contentType.split(';')[0].trim().toLowerCase()
  if (RSS_TYPES.has(mime)) return 'rss'
  if (mime.startsWith('audio/') || mime.startsWith('video/')) return 'direct'

  return 'unsupported'
}

export function isSupportedMediaType(contentType: string): boolean {
  const mime = contentType.split(';')[0].trim().toLowerCase()
  return SUPPORTED_MEDIA_TYPES.has(mime)
}
