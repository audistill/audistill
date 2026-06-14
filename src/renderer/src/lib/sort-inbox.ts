import type { Episode } from '../store/app-store'

export type InboxSortMode = 'newest' | 'oldest' | 'longest'

export interface EpisodeGroup {
  label: string
  episodes: Episode[]
}

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

export function groupInboxEpisodes(episodes: Episode[], mode: InboxSortMode): EpisodeGroup[] {
  const sorted = sortInboxEpisodes(episodes, mode)

  if (mode === 'longest') {
    return [{ label: '', episodes: sorted }]
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000

  const today: Episode[] = []
  const thisWeek: Episode[] = []
  const earlier: Episode[] = []

  for (const ep of sorted) {
    const t = new Date(ep.created_at).getTime()
    if (t >= startOfToday) {
      today.push(ep)
    } else if (t >= sevenDaysAgo) {
      thisWeek.push(ep)
    } else {
      earlier.push(ep)
    }
  }

  const buckets: [string, Episode[]][] = mode === 'oldest'
    ? [['Earlier', earlier], ['This Week', thisWeek], ['Today', today]]
    : [['Today', today], ['This Week', thisWeek], ['Earlier', earlier]]

  const groups: EpisodeGroup[] = []
  for (const [label, eps] of buckets) {
    if (eps.length > 0) groups.push({ label, episodes: eps })
  }
  return groups
}
