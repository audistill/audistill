import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { ContentPane } from './components/ContentPane'
import { OnboardingView } from './components/OnboardingView'
import { useAppStore, Episode } from './store/app-store'

function App(): React.JSX.Element {
  const hydrate = useAppStore((s) => s.hydrate)
  const hydrated = useAppStore((s) => s.hydrated)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    window.api.getSetting('openrouter_api_key').then((key) => {
      setNeedsOnboarding(!key)
    })
  }, [hydrated])

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

  if (!hydrated || needsOnboarding === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <p className="text-[var(--secondary)] text-sm">Loading...</p>
      </div>
    )
  }

  if (needsOnboarding) {
    return (
      <div className="flex flex-col h-screen bg-[var(--bg)]">
        <div
          className="h-10 shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        <OnboardingView onComplete={() => setNeedsOnboarding(false)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div
        className="flex items-center h-10 px-4 bg-[var(--bg)] border-b border-[var(--surface)] select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="w-[70px] shrink-0" />
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <TabBar />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ContentPane />
      </div>
    </div>
  )
}

export default App
