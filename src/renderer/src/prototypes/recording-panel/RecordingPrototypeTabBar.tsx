import { useAppStore } from '../../store/app-store'
import {
  type RecordingPrototypePhase,
  useRecordingPrototypeStore
} from './recording-panel-prototype-store'
import { formatElapsedTime } from './prototype-utils'

// PROTOTYPE — THROWAWAY

const phaseDotClasses: Record<Exclude<RecordingPrototypePhase, 'setup'>, string> = {
  recording: 'bg-red-500',
  paused: 'bg-amber-500',
  disconnected: 'bg-amber-500',
  preparing: 'bg-[var(--accent)]'
}

const phaseLabels: Record<RecordingPrototypePhase, string> = {
  setup: 'Setup',
  recording: 'Recording',
  paused: 'Paused',
  disconnected: 'Recording, microphone disconnected',
  preparing: 'Preparing Episode'
}

export function RecordingPrototypeTabBar(): React.JSX.Element {
  const leftSidebarOpen = useAppStore((state) => state.leftSidebarOpen)
  const rightSidebarOpen = useAppStore((state) => state.rightSidebarOpen)
  const toggleLeftSidebar = useAppStore((state) => state.toggleLeftSidebar)
  const toggleRightSidebar = useAppStore((state) => state.toggleRightSidebar)

  const phase = useRecordingPrototypeStore((state) => state.phase)
  const workspace = useRecordingPrototypeStore((state) => state.workspace)
  const elapsedSeconds = useRecordingPrototypeStore((state) => state.elapsedSeconds)
  const setWorkspace = useRecordingPrototypeStore((state) => state.setWorkspace)

  const tabClassName = (active: boolean): string =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
      active
        ? 'bg-[var(--surface)] text-[var(--text)]'
        : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
    }`

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()

    const nextWorkspace = workspace === 'episode' ? 'recording' : 'episode'
    setWorkspace(nextWorkspace)
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')
    tabs?.[nextWorkspace === 'episode' ? 0 : 1]?.focus()
  }

  return (
    <div className="flex items-center w-full">
      <button
        onClick={toggleLeftSidebar}
        className="flex items-center justify-center w-[36px] h-[28px] shrink-0 rounded-md transition-colors hover:bg-[var(--surface)]/50"
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

      <div className="flex items-center gap-1 flex-1 overflow-x-auto mx-2" role="tablist" aria-label="AudiStill workspaces">
        <button
          type="button"
          role="tab"
          aria-selected={workspace === 'episode'}
          tabIndex={workspace === 'episode' ? 0 : -1}
          className={tabClassName(workspace === 'episode')}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => setWorkspace('episode')}
          onKeyDown={handleTabKeyDown}
        >
          Quarterly planning
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={workspace === 'recording'}
          aria-label={`Recording workspace, ${phaseLabels[phase]}, ${formatElapsedTime(elapsedSeconds)}`}
          tabIndex={workspace === 'recording' ? 0 : -1}
          className={tabClassName(workspace === 'recording')}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => setWorkspace('recording')}
          onKeyDown={handleTabKeyDown}
        >
          {phase === 'setup' ? (
            'New recording'
          ) : (
            <>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${phaseDotClasses[phase]}`} />
              <span>{formatElapsedTime(elapsedSeconds)}</span>
            </>
          )}
        </button>
      </div>

      <button
        onClick={toggleRightSidebar}
        className="flex items-center justify-center w-[36px] h-[28px] shrink-0 rounded-md transition-colors hover:bg-[var(--surface)]/50"
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
