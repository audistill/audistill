import { useEffect } from 'react'
import { useAppStore } from '../store/app-store'
import { useContentTabStore } from '../store/content-tab-store'
import { EpisodeView } from './EpisodeView'
import { SettingsView } from './SettingsView'
import { ContentTabBar } from './ContentTabBar'
import { TabContentView } from './TabContentView'
import { TranscriptPanel } from './TranscriptPanel'
import { EmptyLibraryState, NoTabsOpenState } from './EmptyState'

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
        {episodes.length === 0 ? <EmptyLibraryState /> : <NoTabsOpenState />}
      </div>
    )
  }

  if (episode.status !== 'complete') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
        <EpisodeView episode={episode} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      <EpisodeContentWithTabs episodeId={episode.id} />
    </div>
  )
}

function EpisodeContentWithTabs({ episodeId }: { episodeId: string }): React.JSX.Element {
  const loadTabs = useContentTabStore((s) => s.loadTabs)
  const tabs = useContentTabStore((s) => s.tabs)
  const loading = useContentTabStore((s) => s.loading)
  const episode = useAppStore((s) => s.episodes.find((e) => e.id === episodeId))
  const transcriptPanelOpen = useAppStore((s) => s.transcriptPanelOpen)

  useEffect(() => {
    loadTabs(episodeId)
  }, [episodeId, loadTabs])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ContentTabBar episodeId={episodeId} />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-12">
          <p className="text-sm text-[var(--secondary)]">
            No content tabs yet. Click + to create one.
          </p>
        </div>
        {transcriptPanelOpen && (
          <TranscriptPanel
            transcript={episode?.transcript ?? null}
            duration={episode?.duration_sec ?? null}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 200 }}>
      <ContentTabBar episodeId={episodeId} />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-hidden min-h-[200px]">
          <TabContentView />
        </div>
        {transcriptPanelOpen && (
          <TranscriptPanel
            transcript={episode?.transcript ?? null}
            duration={episode?.duration_sec ?? null}
          />
        )}
      </div>
    </div>
  )
}
