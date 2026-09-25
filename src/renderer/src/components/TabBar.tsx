import { CircleHelp } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { RecordingSessionState } from '../../../shared/recording-session'
import { useAppStore } from '../store/app-store'
import { formatElapsed } from '../lib/format-elapsed'

export function TabBar(): React.JSX.Element {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const recordingWorkspaceOpen = useAppStore((s) => s.recordingWorkspaceOpen)
  const recordingWorkspaceActive = useAppStore((s) => s.recordingWorkspaceActive)
  const feedWorkspaceOpen = useAppStore((s) => s.feedWorkspaceOpen)
  const feedWorkspaceActive = useAppStore((s) => s.feedWorkspaceActive)
  const activeFeedId = useAppStore((s) => s.activeFeedId)
  const feeds = useAppStore((s) => s.feeds)
  const activateFeedWorkspace = useAppStore((s) => s.activateFeedWorkspace)
  const closeFeedWorkspace = useAppStore((s) => s.closeFeedWorkspace)
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const helpOpen = useAppStore((s) => s.helpOpen)
  const episodes = useAppStore((s) => s.episodes)
  const activateTab = useAppStore((s) => s.activateTab)
  const closeTab = useAppStore((s) => s.closeTab)
  const activateRecordingWorkspace = useAppStore((s) => s.activateRecordingWorkspace)
  const openSettings = useAppStore((s) => s.openSettings)
  const closeSettings = useAppStore((s) => s.closeSettings)
  const openHelp = useAppStore((s) => s.openHelp)
  const closeHelp = useAppStore((s) => s.closeHelp)
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar)
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar)
  const [recordingState, setRecordingState] = useState<RecordingSessionState | null>(null)

  useEffect(() => {
    if (!recordingWorkspaceOpen) {
      setRecordingState(null)
      return
    }
    let mounted = true
    const refresh = (): void => {
      window.api.recordingSession.getState().then((state) => {
        if (mounted) setRecordingState(state)
      }).catch(() => {})
    }
    refresh()
    const unsubscribe = window.api.recordingSession.onStateChanged((state) => {
      if (mounted) setRecordingState(state)
    })
    const timer = window.setInterval(refresh, 1_000)
    return () => {
      mounted = false
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [recordingWorkspaceOpen])

  const recordingLive = recordingState?.phase === 'recording'
  const recordingPaused = recordingState?.phase === 'paused'
  const recordingRecovery = recordingState?.phase === 'recovery'
  const activeFeed = feeds.find((f) => f.id === activeFeedId)

  return (
    <div className="flex items-center w-full">
      {/* Left sidebar toggle */}
      <button
        onClick={toggleLeftSidebar}
        className="flex items-center justify-center w-[36px] h-[28px] shrink-0 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        title="Toggle left sidebar (Cmd+B)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={leftSidebarOpen ? 'text-[var(--accent)]' : 'text-[var(--secondary)]'}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
        </svg>
      </button>

      {/* Scrolling tabs area */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto mx-2">
        {recordingWorkspaceOpen && (
          <button
            type="button"
            onClick={activateRecordingWorkspace}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              recordingWorkspaceActive && !settingsOpen && !helpOpen
                ? 'bg-[var(--surface)] text-[var(--text)]'
                : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
            }`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Recording Workspace"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${
              recordingLive ? 'bg-[#dc5a55]' : recordingPaused ? 'bg-amber-500' : 'bg-[var(--secondary)]'
            }`} />
            <span>{recordingRecovery ? 'Recover' : recordingPaused ? 'Paused' : 'Recording'}</span>
            {(recordingLive || recordingPaused) && recordingState && (
              <span className="font-mono tabular-nums text-[10px] opacity-75">{formatElapsed(recordingState.activeDurationMs)}</span>
            )}
          </button>
        )}
        {feedWorkspaceOpen && activeFeed && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
              feedWorkspaceActive && !settingsOpen && !helpOpen
                ? 'bg-[var(--surface)] text-[var(--text)]'
                : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
            }`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={activateFeedWorkspace}
            title={activeFeed.title}
          >
            {activeFeed.image ? (
              <img src={activeFeed.image} alt="" className="w-3.5 h-3.5 rounded-[3px] object-cover shrink-0" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--accent)]">
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </svg>
            )}
            <span className="truncate max-w-[120px]">{activeFeed.title}</span>
            <svg
              onClick={(e) => {
                e.stopPropagation()
                closeFeedWorkspace()
              }}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 opacity-0 hover:opacity-100"
              style={{ opacity: feedWorkspaceActive && !settingsOpen && !helpOpen ? 0.5 : undefined }}
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>
        )}
        {tabs.map((tab) => {
          const ep = episodes.find((e) => e.id === tab.id)
          if (!ep) return null
          const isActive = activeTabId === tab.id && !settingsOpen && !helpOpen
          const fileName = ep.file_path?.split('/').pop() || ep.file_path || 'Untitled'
          const title = ep.title || fileName

          return (
            <div
              key={tab.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                isActive ? 'bg-[var(--surface)] text-[var(--text)]' : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              } ${tab.preview ? 'italic opacity-80' : ''}`}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              onClick={() => activateTab(tab.id)}
            >
              <span className="truncate max-w-[120px]">{title}</span>
              <svg
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0 opacity-0 hover:opacity-100"
                style={{ opacity: isActive ? 0.5 : undefined }}
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </div>
          )
        })}

        {settingsOpen && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors bg-[var(--surface)] text-[var(--text)]"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => openSettings()}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Settings</span>
            <svg
              onClick={(e) => {
                e.stopPropagation()
                closeSettings()
              }}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 opacity-50 hover:opacity-100"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>
        )}

        {helpOpen && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors bg-[var(--surface)] text-[var(--text)]"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => openHelp()}
          >
            <CircleHelp size={12} strokeWidth={2} />
            <span>Help</span>
            <svg
              onClick={(e) => {
                e.stopPropagation()
                closeHelp()
              }}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 opacity-50 hover:opacity-100"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Right sidebar toggle */}
      <button
        onClick={toggleRightSidebar}
        className="flex items-center justify-center w-[36px] h-[28px] shrink-0 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        title="Toggle right sidebar (Cmd+Shift+L)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={rightSidebarOpen ? 'text-[var(--accent)]' : 'text-[var(--secondary)]'}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M15 3v18" />
        </svg>
      </button>
    </div>
  )
}
