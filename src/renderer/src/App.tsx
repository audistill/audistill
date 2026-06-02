import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { ContentPane } from './components/ContentPane'
import { useAppStore } from './store/app-store'

function App(): React.JSX.Element {
  const updateEpisode = useAppStore((s) => s.updateEpisode)
  const episodes = useAppStore((s) => s.episodes)

  useEffect(() => {
    const interval = setInterval(() => {
      const ep4 = episodes.find((e) => e.id === 'ep4')
      if (ep4 && ep4.status === 'transcribing' && ep4.progress < 100) {
        const newProgress = Math.min(100, ep4.progress + 2)
        if (newProgress >= 100) {
          updateEpisode('ep4', { progress: 100, status: 'summarizing' })
          setTimeout(() => {
            updateEpisode('ep4', {
              status: 'complete',
              title: 'Team Standup: Sprint 42 Progress & Blockers',
              summary: {
                rundown:
                  'Weekly team standup covering Sprint 42 progress. Backend migration is 80% complete, frontend blocked on design review, and the QA team raised concerns about test coverage in the new auth module.',
                details: [
                  'Backend migration to new API gateway running ahead of schedule — expected completion Wednesday',
                  'Frontend team blocked for 2 days waiting on finalized design specs for the settings page',
                  'QA flagged that new auth module has only 45% test coverage vs. the 80% team standard',
                  'Decision made to extend sprint by 2 days rather than cut scope on the auth feature',
                ],
                whyItMatters:
                  "The sprint extension sets a precedent for prioritizing quality over velocity. The auth module coverage gap is a real risk — a bug there hits every user. Worth monitoring whether the design review bottleneck recurs next sprint.",
              },
              transcript: [
                { time: '00:00', text: "Alright everyone, let's get started. Quick round-robin, starting with backend..." },
                { time: '02:15', text: 'Migration is going well. We finished the user service yesterday and payments is next...' },
              ],
            })
          }, 3000)
        } else {
          updateEpisode('ep4', { progress: newProgress })
        }
      }
    }, 500)

    return () => clearInterval(interval)
  }, [episodes, updateEpisode])

  return (
    <div className="flex flex-col h-screen">
      {/* Title bar with traffic lights + tab bar */}
      <div
        className="flex items-center h-10 px-4 bg-[var(--bg)] border-b border-[var(--surface)] select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex gap-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
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
