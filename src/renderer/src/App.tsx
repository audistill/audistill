import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { ContentPane } from './components/ContentPane'
import { useAppStore, Episode } from './store/app-store'

function App(): React.JSX.Element {
  const hydrate = useAppStore((s) => s.hydrate)
  const hydrated = useAppStore((s) => s.hydrated)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    const unsubscribe = window.api.onEpisodeUpdated((episode) => {
      useAppStore.getState().updateEpisode(episode.id, {
        ...episode,
        status: episode.status as Episode['status'],
      })
    })
    return unsubscribe
  }, [hydrated])

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <p className="text-[var(--secondary)] text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Title bar with traffic lights + tab bar */}
      <div
        className="flex items-center h-10 px-4 bg-[var(--bg)] border-b border-[var(--surface)] select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="w-[70px] shrink-0" />
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <TabBar />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ContentPane />
      </div>
    </div>
  )
}

export default App
