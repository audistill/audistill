import { useAppStore } from '../store/app-store'

export function TabBar(): React.JSX.Element {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const episodes = useAppStore((s) => s.episodes)
  const activateTab = useAppStore((s) => s.activateTab)
  const closeTab = useAppStore((s) => s.closeTab)
  const openSettings = useAppStore((s) => s.openSettings)
  const closeSettings = useAppStore((s) => s.closeSettings)
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar)
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar)

  return (
    <div className="flex items-center w-full">
      {/* Left sidebar toggle */}
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

      {/* Scrolling tabs area */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto mx-2">
        {tabs.map((tab) => {
          const ep = episodes.find((e) => e.id === tab.id)
          if (!ep) return null
          const isActive = activeTabId === tab.id && !settingsOpen
          const fileName = ep.file_path.split('/').pop() || ep.file_path
          const title = ep.title || fileName

          return (
            <div
              key={tab.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                isActive ? 'bg-[var(--surface)] text-[var(--text)]' : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
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
      </div>

      {/* Right sidebar toggle */}
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
