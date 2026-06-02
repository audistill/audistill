import { useAppStore } from '../store/app-store'
import { EpisodeView } from './EpisodeView'
import { SettingsView } from './SettingsView'
import { EmptyLibraryState } from './EmptyState'

export function ContentPane(): React.JSX.Element {
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const episodes = useAppStore((s) => s.episodes)

  if (settingsOpen) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
        <SettingsView />
      </div>
    )
  }

  const episode = episodes.find((e) => e.id === activeTabId)
  if (!episode) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
        <EmptyLibraryState />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      <EpisodeView episode={episode} />
    </div>
  )
}
