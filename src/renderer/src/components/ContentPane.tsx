import { useAppStore } from '../store/app-store'
import { EpisodeView } from './EpisodeView'
import { CanvasView } from './CanvasView'
import { SettingsView } from './SettingsView'
import { EmptyLibraryState, NoTabsOpenState } from './EmptyState'

export function ContentPane(): React.JSX.Element {
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const episodes = useAppStore((s) => s.episodes)
  const activeContentView = useAppStore((s) => s.activeContentView)

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
        {episodes.length === 0 ? <EmptyLibraryState /> : <NoTabsOpenState />}
      </div>
    )
  }

  if (activeContentView === 'canvas') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
        <CanvasView episodeId={episode.id} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      <EpisodeView episode={episode} />
    </div>
  )
}
