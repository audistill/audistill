import { Video, Rss, Globe, FileAudio } from 'lucide-react'
import type { Episode } from './App'

export const SOURCE_ICONS = {
  youtube: { icon: Video, color: '#ef4444' },
  rss: { icon: Rss, color: '#f59e0b' },
  direct: { icon: Globe, color: '#3b82f6' },
  local: { icon: FileAudio, color: '#71717a' },
} as const

export function getSourceIcon(sourceType: string | null) {
  return SOURCE_ICONS[sourceType as keyof typeof SOURCE_ICONS] ?? SOURCE_ICONS.local
}

export function getSecondaryLabel(episode: Episode): string | null {
  if (!episode.source_type) return null

  if (episode.source_meta) {
    try {
      const meta = JSON.parse(episode.source_meta)
      if (episode.source_type === 'youtube' && meta.channel) return meta.channel
      if (episode.source_type === 'rss' && meta.feedTitle) return meta.feedTitle
    } catch { /* ignore */ }
  }

  if (episode.source_url) {
    try {
      return new URL(episode.source_url).hostname.replace('www.', '')
    } catch { /* ignore */ }
  }

  if (episode.source_type === 'local' && 'file_path' in episode && episode.file_path) {
    const parts = episode.file_path.split('/')
    return parts[parts.length - 1] ?? null
  }

  return null
}

export function getFullPath(episode: Episode): string | null {
  if (episode.source_type === 'local' && 'file_path' in episode) {
    return (episode as { file_path?: string }).file_path ?? null
  }
  return episode.source_url ?? null
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
