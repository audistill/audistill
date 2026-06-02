import { useAppStore, Episode } from '../store/app-store'

export function Sidebar(): React.JSX.Element {
  const episodes = useAppStore((s) => s.episodes)
  const folders = useAppStore((s) => s.folders)
  const expandedFolders = useAppStore((s) => s.expandedFolders)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const selectEpisode = useAppStore((s) => s.selectEpisode)
  const pinEpisode = useAppStore((s) => s.pinEpisode)
  const openSettings = useAppStore((s) => s.openSettings)
  const toggleFolder = useAppStore((s) => s.toggleFolder)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)

  const filteredEpisodes = searchQuery
    ? episodes.filter((ep) => {
        const title = (ep.title || ep.file_path).toLowerCase()
        const summary = ep.summary?.toLowerCase() || ''
        const q = searchQuery.toLowerCase()
        return title.includes(q) || summary.includes(q)
      })
    : episodes

  const inboxItems = filteredEpisodes.filter((e) => e.folder_id === null)
  const folderEpisodes = (folderId: string) =>
    filteredEpisodes.filter((e) => e.folder_id === folderId && e.status === 'complete')

  return (
    <div className="w-[280px] shrink-0 bg-[var(--bg)] border-r border-[var(--surface)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between shrink-0">
        <span className="font-heading text-sm font-semibold text-[var(--text)]">PodCapture</span>
        <div className="flex items-center gap-1">
          <button
            onClick={openSettings}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            onClick={() => alert('Native file dialog would open here.\nSelected files go to Inbox and start processing.')}
            className="flex items-center gap-1 px-2 py-1 rounded-[12px] text-xs font-medium text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-[12px] bg-[var(--surface)] text-[var(--secondary)] text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search episodes..."
            className="bg-transparent outline-none w-full text-[var(--text)] placeholder-[var(--secondary)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {/* Inbox */}
        <div className="mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-heading font-medium text-[var(--secondary)] uppercase tracking-wide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-6l-2 3H10l-2-3H2" />
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
            Inbox
            {inboxItems.length > 0 && (
              <span className="ml-auto bg-[var(--surface)] text-[var(--secondary)] px-1.5 py-0.5 rounded text-[10px]">
                {inboxItems.length}
              </span>
            )}
          </div>
          {inboxItems.map((ep) => (
            <SidebarEpisode
              key={ep.id}
              episode={ep}
              isActive={activeTabId === ep.id && !settingsOpen}
              onSelect={selectEpisode}
              onPin={pinEpisode}
            />
          ))}
          {inboxItems.length === 0 && !searchQuery && (
            <div className="px-3 py-2 text-xs text-[var(--secondary)]">No items in Inbox</div>
          )}
        </div>

        {/* Folders */}
        <div className="mb-2">
          <div className="px-3 py-1.5 text-xs font-heading font-medium text-[var(--secondary)] uppercase tracking-wide">
            Folders
          </div>
        </div>
        {folders
          .filter((f) => f.parent_id === null)
          .map((folder) => {
            const children = folderEpisodes(folder.id)
            const isExpanded = expandedFolders.has(folder.id)
            return (
              <div key={folder.id} className="mb-1">
                <div
                  className="sidebar-item flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--text)] cursor-pointer"
                  onClick={() => toggleFolder(folder.id)}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  {folder.name}
                  <span className="ml-auto text-[10px] text-[var(--secondary)]">{children.length}</span>
                </div>
                <div
                  className={`pl-4 overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[500px]' : 'max-h-0'}`}
                >
                  {children.map((ep) => (
                    <SidebarEpisode
                      key={ep.id}
                      episode={ep}
                      isActive={activeTabId === ep.id && !settingsOpen}
                      onSelect={selectEpisode}
                      onPin={pinEpisode}
                    />
                  ))}
                  {children.length === 0 && isExpanded && (
                    <div className="px-3 py-2 text-xs text-[var(--secondary)]">No episodes</div>
                  )}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

function SidebarEpisode({
  episode,
  isActive,
  onSelect,
  onPin,
}: {
  episode: Episode
  isActive: boolean
  onSelect: (id: string) => void
  onPin: (id: string) => void
}): React.JSX.Element {
  const fileName = episode.file_path.split('/').pop() || episode.file_path
  const title = episode.title || fileName

  let statusIcon: React.ReactNode = null
  if (episode.status === 'transcribing') {
    statusIcon = (
      <div className="flex gap-0.5 items-center">
        <span className="processing-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <span className="text-[10px] text-[var(--accent)] ml-1">Transcribing</span>
      </div>
    )
  } else if (episode.status === 'queued') {
    statusIcon = <span className="text-[10px] text-[var(--secondary)]">Queued</span>
  } else if (episode.status === 'summarizing') {
    statusIcon = (
      <div className="flex gap-0.5 items-center">
        <span className="processing-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <span className="text-[10px] text-[var(--accent)] ml-1">Summarizing</span>
      </div>
    )
  } else if (episode.status === 'error') {
    statusIcon = <span className="text-[10px] text-red-400">Error</span>
  }

  return (
    <div
      className={`sidebar-item flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(episode.id)}
      onDoubleClick={() => onPin(episode.id)}
    >
      <span className={`truncate flex-1 ${episode.status !== 'complete' ? 'text-[var(--secondary)]' : 'text-[var(--text)]'}`}>
        {title}
      </span>
      {statusIcon}
    </div>
  )
}
