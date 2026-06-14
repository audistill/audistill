import type { Episode } from '../store/app-store'

export type InboxSortMode = 'newest' | 'oldest' | 'longest'

export function sortInboxEpisodes(episodes: Episode[], mode: InboxSortMode): Episode[] {
  const sorted = [...episodes]
  switch (mode) {
    case 'oldest':
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
      break
    case 'longest':
      sorted.sort((a, b) => {
        if (a.duration_sec === null && b.duration_sec === null) return 0
        if (a.duration_sec === null) return 1
        if (b.duration_sec === null) return -1
        return b.duration_sec - a.duration_sec
      })
      break
    default:
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  return sorted
}
