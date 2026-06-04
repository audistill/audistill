import { useAppStore } from '../store/app-store'
import { EpisodeView } from './EpisodeView'
import { SettingsView } from './SettingsView'
import { EmptyLibraryState } from './EmptyState'

function CanvasPlaceholder(): React.JSX.Element {
  const setActiveContentView = useAppStore((s) => s.setActiveContentView)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="w-full max-w-md text-center">
        <div className="w-12 h-12 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent)]">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
          </svg>
        </div>
        <h2 className="font-heading text-lg font-semibold text-[var(--text)] mb-2">Canvas</h2>
        <p className="text-sm text-[var(--secondary)] mb-6">
          A workspace for writing and editing — coming in the next update.
        </p>
        <button
          onClick={() => setActiveContentView('episode')}
          className="px-4 py-2 rounded-[12px] bg-[var(--surface)] text-[var(--secondary)] text-sm font-medium hover:text-[var(--text)] hover:bg-white/[0.08] transition-[background-color,color] duration-150"
        >
          Back to Episode
        </button>
      </div>
    </div>
  )
}

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
        <EmptyLibraryState />
      </div>
    )
  }

  if (activeContentView === 'canvas') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
        <CanvasPlaceholder />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      <EpisodeView episode={episode} />
    </div>
  )
}
