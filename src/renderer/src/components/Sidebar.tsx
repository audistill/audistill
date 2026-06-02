import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore, Episode, Folder } from '../store/app-store'

function formatRelativeDate(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffHours < 1) return 'just now'
  if (diffHours < 24) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-diffHours, 'hour')
  }
  if (diffDays < 7) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-diffDays, 'day')
  }
  if (diffDays < 30) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-diffWeeks, 'week')
  }
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(dateStr))
}

function formatDurationShort(seconds: number | null): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

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
  const createFolder = useAppStore((s) => s.createFolder)
  const renameFolder = useAppStore((s) => s.renameFolder)
  const deleteFolder = useAppStore((s) => s.deleteFolder)

  const moveEpisode = useAppStore((s) => s.moveEpisode)
  const deleteEpisode = useAppStore((s) => s.deleteEpisode)
  const renameEpisode = useAppStore((s) => s.renameEpisode)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'folder' | 'folders-header' | 'episode'
    folderId?: string
    parentId?: string | null
    episodeId?: string
  } | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState<{ parentId: string | null } | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (): void => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

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

  const getChildFolders = (parentId: string | null) =>
    folders.filter((f) => f.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order)

  const handleFolderContextMenu = (e: React.MouseEvent, folderId: string): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', folderId })
  }

  const handleFoldersHeaderContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folders-header', parentId: null })
  }

  const handleNewFolder = (parentId: string | null): void => {
    setContextMenu(null)
    setCreatingFolder({ parentId })
  }

  const handleRenameFolder = (id: string): void => {
    setContextMenu(null)
    setEditingFolderId(id)
  }

  const handleDeleteFolder = (id: string): void => {
    setContextMenu(null)
    const folder = folders.find((f) => f.id === id)
    if (!folder) return
    if (window.confirm(`Delete folder "${folder.name}"? Episodes will be moved to Inbox.`)) {
      deleteFolder(id)
    }
  }

  const handleEpisodeContextMenu = (e: React.MouseEvent, episodeId: string): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'episode', episodeId })
  }

  const handleMoveEpisode = (episodeId: string, folderId: string | null): void => {
    setContextMenu(null)
    moveEpisode(episodeId, folderId)
  }

  const handleDeleteEpisode = (episodeId: string): void => {
    setContextMenu(null)
    const ep = episodes.find((e) => e.id === episodeId)
    const title = ep?.title || ep?.file_path.split('/').pop() || 'this episode'
    if (window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      deleteEpisode(episodeId)
    }
  }

  const handleRenameEpisode = (episodeId: string): void => {
    setContextMenu(null)
    setEditingEpisodeId(episodeId)
  }

  const handleClearSearch = (): void => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  return (
    <div className="w-[280px] shrink-0 bg-[var(--bg)] border-r border-[var(--surface)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between shrink-0">
        <span className="font-heading text-sm font-semibold text-[var(--text)]">PodCapture</span>
        <div className="flex items-center gap-1">
          <button
            onClick={openSettings}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-[background-color,color] duration-150"
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            onClick={async () => {
              const filePaths = await window.api.selectFiles()
              if (filePaths && filePaths.length > 0) {
                await window.api.addFiles(filePaths)
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-[12px] text-xs font-medium text-[var(--accent)] hover:bg-[var(--surface)] transition-[background-color] duration-150"
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
            ref={searchInputRef}
            type="text"
            placeholder="Search episodes..."
            aria-label="Search episodes"
            className="bg-transparent outline-none w-full text-[var(--text)] placeholder-[var(--secondary)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.length > 0 && (
            <button
              onClick={handleClearSearch}
              className="flex items-center justify-center w-4 h-4 rounded-full text-[var(--secondary)] hover:text-[var(--text)] transition-[color] duration-150 shrink-0"
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
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
              isEditing={editingEpisodeId === ep.id}
              onSelect={selectEpisode}
              onPin={pinEpisode}
              onContextMenu={handleEpisodeContextMenu}
              onRenameSubmit={async (id, name) => {
                await renameEpisode(id, name)
                setEditingEpisodeId(null)
              }}
              onRenameCancel={() => setEditingEpisodeId(null)}
            />
          ))}
          {inboxItems.length === 0 && !searchQuery && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--secondary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 opacity-60">
                <path d="M22 12h-6l-2 3H10l-2-3H2" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
              <span>Add audio files to start building your knowledge base</span>
            </div>
          )}
        </div>

        {/* Folders */}
        <div className="mb-2">
          <div
            className="flex items-center justify-between px-3 py-1.5 text-xs font-heading font-medium text-[var(--secondary)] uppercase tracking-wide cursor-default"
            onContextMenu={handleFoldersHeaderContextMenu}
          >
            <span>Folders</span>
            <button
              onClick={() => handleNewFolder(null)}
              className="flex items-center justify-center w-5 h-5 rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-[background-color,color] duration-150"
              title="New Folder"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {/* New folder input at root level */}
        {creatingFolder && creatingFolder.parentId === null && (
          <NewFolderInput
            onSubmit={async (name) => {
              await createFolder(name, null)
              setCreatingFolder(null)
            }}
            onCancel={() => setCreatingFolder(null)}
          />
        )}

        {getChildFolders(null).map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            folders={folders}
            depth={0}
            expandedFolders={expandedFolders}
            activeTabId={activeTabId}
            settingsOpen={settingsOpen}
            editingFolderId={editingFolderId}
            editingEpisodeId={editingEpisodeId}
            creatingFolder={creatingFolder}
            folderEpisodes={folderEpisodes}
            getChildFolders={getChildFolders}
            toggleFolder={toggleFolder}
            selectEpisode={selectEpisode}
            pinEpisode={pinEpisode}
            onContextMenu={handleFolderContextMenu}
            onEpisodeContextMenu={handleEpisodeContextMenu}
            onRenameSubmit={async (id, name) => {
              await renameFolder(id, name)
              setEditingFolderId(null)
            }}
            onRenameCancel={() => setEditingFolderId(null)}
            onCreateSubmit={async (name, parentId) => {
              await createFolder(name, parentId)
              setCreatingFolder(null)
            }}
            onCreateCancel={() => setCreatingFolder(null)}
            onEpisodeRenameSubmit={async (id, name) => {
              await renameEpisode(id, name)
              setEditingEpisodeId(null)
            }}
            onEpisodeRenameCancel={() => setEditingEpisodeId(null)}
          />
        ))}

        {folders.length === 0 && !creatingFolder && (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--secondary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 opacity-60">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <path d="M12 11v6M9 14h6" />
            </svg>
            <span>Right-click to create a folder</span>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenu.type === 'episode' && (
        <EpisodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          episodeId={contextMenu.episodeId!}
          episodes={episodes}
          getChildFolders={getChildFolders}
          onRename={handleRenameEpisode}
          onMove={handleMoveEpisode}
          onDelete={handleDeleteEpisode}
          onClose={() => setContextMenu(null)}
        />
      )}
      {contextMenu && contextMenu.type === 'folder' && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            { type: 'action', label: 'New Subfolder', action: () => handleNewFolder(contextMenu.folderId!) },
            { type: 'action', label: 'Rename', action: () => handleRenameFolder(contextMenu.folderId!) },
            { type: 'separator' },
            { type: 'action', label: 'Delete', action: () => handleDeleteFolder(contextMenu.folderId!), danger: true },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
      {contextMenu && contextMenu.type === 'folders-header' && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[{ type: 'action', label: 'New Folder', action: () => handleNewFolder(null) }]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

// --- Context Menu with flyout submenu ---

type MenuItemAction = { type: 'action'; label: string; action: () => void; danger?: boolean }
type MenuItemSeparator = { type: 'separator' }

type SubmenuChild = {
  label: string
  action: () => void
  disabled?: boolean
  depth: number
}

function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: (MenuItemAction | MenuItemSeparator)[]
  onClose: () => void
}): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  const actionableItems = items.filter((i) => i.type !== 'separator')

  useEffect(() => {
    menuRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'ArrowDown') {
      setFocusedIndex((prev) => (prev + 1) % actionableItems.length)
    } else if (e.key === 'ArrowUp') {
      setFocusedIndex((prev) => (prev - 1 + actionableItems.length) % actionableItems.length)
    } else if (e.key === 'Enter') {
      const item = actionableItems[focusedIndex]
      if (item && item.type === 'action') {
        item.action()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let actionIdx = -1
  return (
    <div
      ref={menuRef}
      tabIndex={-1}
      className="fixed z-50 bg-[var(--surface)] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] py-1.5 min-w-[160px] outline-none"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={i} className="my-1.5 mx-2 border-t border-white/[0.06]" />
        }
        actionIdx++
        const idx = actionIdx
        const isFocused = idx === focusedIndex
        return (
          <button
            key={i}
            className={`w-full text-left mx-1.5 px-2 py-1 text-[13px] rounded-md transition-[background-color] duration-150 ${
              item.danger ? 'text-red-400' : 'text-[var(--text)]'
            } ${isFocused ? 'bg-white/[0.08]' : 'hover:bg-white/[0.08]'}`}
            style={{ width: 'calc(100% - 12px)' }}
            onClick={item.action}
            onMouseEnter={() => setFocusedIndex(idx)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function EpisodeContextMenu({
  x,
  y,
  episodeId,
  episodes,
  getChildFolders,
  onRename,
  onMove,
  onDelete,
  onClose,
}: {
  x: number
  y: number
  episodeId: string
  episodes: Episode[]
  getChildFolders: (parentId: string | null) => Folder[]
  onRename: (id: string) => void
  onMove: (episodeId: string, folderId: string | null) => void
  onDelete: (id: string) => void
  onClose: () => void
}): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [flyoutFocusedIndex, setFlyoutFocusedIndex] = useState(0)
  const flyoutTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const episode = episodes.find((e) => e.id === episodeId)
  const currentFolderId = episode?.folder_id ?? null

  const actionLabels = ['Rename', 'Move to...', 'Delete']

  useEffect(() => {
    menuRef.current?.focus()
  }, [])

  const buildFolderList = (): SubmenuChild[] => {
    const result: SubmenuChild[] = []
    const walk = (parentId: string | null, depth: number): void => {
      const children = getChildFolders(parentId)
      for (const f of children) {
        result.push({
          label: f.name + (f.id === currentFolderId ? ' (current)' : ''),
          action: () => onMove(episodeId, f.id),
          disabled: f.id === currentFolderId,
          depth,
        })
        walk(f.id, depth + 1)
      }
    }
    walk(null, 0)
    result.push({
      label: 'Inbox' + (currentFolderId === null ? ' (current)' : ''),
      action: () => onMove(episodeId, null),
      disabled: currentFolderId === null,
      depth: 0,
    })
    return result
  }

  const folderList = buildFolderList()

  const openFlyout = (): void => {
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current)
    flyoutTimeout.current = setTimeout(() => setFlyoutOpen(true), 150)
  }

  const closeFlyout = (): void => {
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current)
    flyoutTimeout.current = setTimeout(() => setFlyoutOpen(false), 150)
  }

  const cancelClose = (): void => {
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    e.preventDefault()
    e.stopPropagation()

    if (flyoutOpen) {
      if (e.key === 'ArrowDown') {
        setFlyoutFocusedIndex((prev) => (prev + 1) % folderList.length)
      } else if (e.key === 'ArrowUp') {
        setFlyoutFocusedIndex((prev) => (prev - 1 + folderList.length) % folderList.length)
      } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        setFlyoutOpen(false)
      } else if (e.key === 'Enter') {
        const item = folderList[flyoutFocusedIndex]
        if (item && !item.disabled) item.action()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      setFocusedIndex((prev) => (prev + 1) % actionLabels.length)
    } else if (e.key === 'ArrowUp') {
      setFocusedIndex((prev) => (prev - 1 + actionLabels.length) % actionLabels.length)
    } else if (e.key === 'ArrowRight' && focusedIndex === 1) {
      setFlyoutOpen(true)
      setFlyoutFocusedIndex(0)
    } else if (e.key === 'Enter') {
      if (focusedIndex === 0) onRename(episodeId)
      else if (focusedIndex === 1) {
        setFlyoutOpen(true)
        setFlyoutFocusedIndex(0)
      } else if (focusedIndex === 2) onDelete(episodeId)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      ref={menuRef}
      tabIndex={-1}
      className="fixed z-50 bg-[var(--surface)] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] py-1.5 min-w-[160px] outline-none"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {/* Rename */}
      <button
        className={`w-full text-left mx-1.5 px-2 py-1 text-[13px] text-[var(--text)] rounded-md transition-[background-color] duration-150 ${focusedIndex === 0 ? 'bg-white/[0.08]' : 'hover:bg-white/[0.08]'}`}
        style={{ width: 'calc(100% - 12px)' }}
        onClick={() => onRename(episodeId)}
        onMouseEnter={() => setFocusedIndex(0)}
      >
        Rename
      </button>

      {/* Move to... with flyout */}
      <div
        className="relative"
        onMouseEnter={() => {
          setFocusedIndex(1)
          openFlyout()
        }}
        onMouseLeave={closeFlyout}
      >
        <button
          className={`w-full text-left mx-1.5 px-2 py-1 text-[13px] text-[var(--text)] flex items-center justify-between rounded-md transition-[background-color] duration-150 ${focusedIndex === 1 ? 'bg-white/[0.08]' : 'hover:bg-white/[0.08]'}`}
          style={{ width: 'calc(100% - 12px)' }}
        >
          <span>Move to...</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        {/* Flyout submenu */}
        {flyoutOpen && (
          <div
            className="absolute left-full top-0 ml-1 bg-[var(--surface)] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] py-1.5 min-w-[160px] max-h-[300px] overflow-y-auto"
            onMouseEnter={cancelClose}
            onMouseLeave={closeFlyout}
          >
            {folderList.map((item, i) => (
              <button
                key={i}
                className={`text-left mx-1.5 py-1 text-[13px] text-[var(--text)] rounded-md transition-[background-color] duration-150 ${
                  item.disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'
                } ${i === flyoutFocusedIndex ? 'bg-white/[0.08]' : 'hover:bg-white/[0.08]'}`}
                style={{ paddingLeft: `${8 + item.depth * 14}px`, paddingRight: '8px', width: 'calc(100% - 12px)' }}
                onClick={() => { if (!item.disabled) item.action() }}
                onMouseEnter={() => setFlyoutFocusedIndex(i)}
                disabled={item.disabled}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="my-1.5 mx-2 border-t border-white/[0.06]" />

      {/* Delete */}
      <button
        className={`w-full text-left mx-1.5 px-2 py-1 text-[13px] text-red-400 rounded-md transition-[background-color] duration-150 ${focusedIndex === 2 ? 'bg-white/[0.08]' : 'hover:bg-white/[0.08]'}`}
        style={{ width: 'calc(100% - 12px)' }}
        onClick={() => onDelete(episodeId)}
        onMouseEnter={() => setFocusedIndex(2)}
      >
        Delete
      </button>
    </div>
  )
}

// --- Folder Node ---

function FolderNode({
  folder,
  folders,
  depth,
  expandedFolders,
  activeTabId,
  settingsOpen,
  editingFolderId,
  editingEpisodeId,
  creatingFolder,
  folderEpisodes,
  getChildFolders,
  toggleFolder,
  selectEpisode,
  pinEpisode,
  onContextMenu,
  onEpisodeContextMenu,
  onRenameSubmit,
  onRenameCancel,
  onCreateSubmit,
  onCreateCancel,
  onEpisodeRenameSubmit,
  onEpisodeRenameCancel,
}: {
  folder: Folder
  folders: Folder[]
  depth: number
  expandedFolders: Set<string>
  activeTabId: string | null
  settingsOpen: boolean
  editingFolderId: string | null
  editingEpisodeId: string | null
  creatingFolder: { parentId: string | null } | null
  folderEpisodes: (folderId: string) => Episode[]
  getChildFolders: (parentId: string | null) => Folder[]
  toggleFolder: (id: string) => void
  selectEpisode: (id: string) => void
  pinEpisode: (id: string) => void
  onContextMenu: (e: React.MouseEvent, folderId: string) => void
  onEpisodeContextMenu: (e: React.MouseEvent, episodeId: string) => void
  onRenameSubmit: (id: string, name: string) => Promise<void>
  onRenameCancel: () => void
  onCreateSubmit: (name: string, parentId: string | null) => Promise<void>
  onCreateCancel: () => void
  onEpisodeRenameSubmit: (id: string, name: string) => Promise<void>
  onEpisodeRenameCancel: () => void
}): React.JSX.Element {
  const children = folderEpisodes(folder.id)
  const childFolders = getChildFolders(folder.id)
  const isExpanded = expandedFolders.has(folder.id)
  const isEditing = editingFolderId === folder.id

  return (
    <div className="mb-1" style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : undefined }}>
      <div
        className="sidebar-item flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--text)] cursor-pointer"
        onClick={() => toggleFolder(folder.id)}
        onContextMenu={(e) => onContextMenu(e, folder.id)}
        tabIndex={0}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-[transform] duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        {isEditing ? (
          <InlineEdit
            initialValue={folder.name}
            onSubmit={(name) => onRenameSubmit(folder.id, name)}
            onCancel={onRenameCancel}
          />
        ) : (
          <span className="truncate flex-1">{folder.name}</span>
        )}
        {!isEditing && (
          <span className="ml-auto text-[10px] text-[var(--secondary)]">{children.length}</span>
        )}
      </div>
      <div
        className={`overflow-hidden transition-[max-height] duration-200 ${isExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}
      >
        {/* New folder input as subfolder */}
        {creatingFolder && creatingFolder.parentId === folder.id && (
          <div style={{ paddingLeft: '16px' }}>
            <NewFolderInput
              onSubmit={(name) => onCreateSubmit(name, folder.id)}
              onCancel={onCreateCancel}
            />
          </div>
        )}

        {/* Child folders (recursive) */}
        {childFolders.map((child) => (
          <FolderNode
            key={child.id}
            folder={child}
            folders={folders}
            depth={depth + 1}
            expandedFolders={expandedFolders}
            activeTabId={activeTabId}
            settingsOpen={settingsOpen}
            editingFolderId={editingFolderId}
            editingEpisodeId={editingEpisodeId}
            creatingFolder={creatingFolder}
            folderEpisodes={folderEpisodes}
            getChildFolders={getChildFolders}
            toggleFolder={toggleFolder}
            selectEpisode={selectEpisode}
            pinEpisode={pinEpisode}
            onContextMenu={onContextMenu}
            onEpisodeContextMenu={onEpisodeContextMenu}
            onRenameSubmit={onRenameSubmit}
            onRenameCancel={onRenameCancel}
            onCreateSubmit={onCreateSubmit}
            onCreateCancel={onCreateCancel}
            onEpisodeRenameSubmit={onEpisodeRenameSubmit}
            onEpisodeRenameCancel={onEpisodeRenameCancel}
          />
        ))}

        {/* Episodes in folder */}
        {children.map((ep) => (
          <div key={ep.id} style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
            <SidebarEpisode
              episode={ep}
              isActive={activeTabId === ep.id && !settingsOpen}
              isEditing={editingEpisodeId === ep.id}
              onSelect={selectEpisode}
              onPin={pinEpisode}
              onContextMenu={onEpisodeContextMenu}
              onRenameSubmit={onEpisodeRenameSubmit}
              onRenameCancel={onEpisodeRenameCancel}
            />
          </div>
        ))}
        {children.length === 0 && childFolders.length === 0 && isExpanded && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--secondary)]" style={{ paddingLeft: `${(depth + 1) * 16 + 12}px` }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 opacity-60">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <path d="M12 11v6M9 14h6" />
            </svg>
            <span>Move episodes here to organize them</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Inline Edit ---

function InlineEdit({
  initialValue,
  onSubmit,
  onCancel,
}: {
  initialValue: string
  onSubmit: (value: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = useCallback((): void => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== initialValue) {
      onSubmit(trimmed)
    } else {
      onCancel()
    }
  }, [value, initialValue, onSubmit, onCancel])

  return (
    <input
      ref={inputRef}
      className="flex-1 bg-[var(--surface)] text-[var(--text)] text-sm px-1.5 py-0.5 rounded outline-none border border-[var(--accent)]"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSubmit()
        if (e.key === 'Escape') onCancel()
      }}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

// --- New Folder Input ---

function NewFolderInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback((): void => {
    const trimmed = value.trim()
    if (trimmed) {
      onSubmit(trimmed)
    } else {
      onCancel()
    }
  }, [value, onSubmit, onCancel])

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-[var(--secondary)]">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <input
        ref={inputRef}
        className="flex-1 bg-[var(--surface)] text-[var(--text)] text-sm px-1.5 py-0.5 rounded outline-none border border-[var(--accent)]"
        placeholder="Folder name..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
      />
    </div>
  )
}

// --- Sidebar Episode (two-line) ---

function SidebarEpisode({
  episode,
  isActive,
  isEditing,
  onSelect,
  onPin,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel,
}: {
  episode: Episode
  isActive: boolean
  isEditing: boolean
  onSelect: (id: string) => void
  onPin: (id: string) => void
  onContextMenu: (e: React.MouseEvent, episodeId: string) => void
  onRenameSubmit: (id: string, name: string) => Promise<void>
  onRenameCancel: () => void
}): React.JSX.Element {
  const fileName = episode.file_path.split('/').pop() || episode.file_path
  const title = episode.title || fileName
  const progressEntry = useAppStore((s) => s.progress[episode.id])

  const isProcessing = episode.status !== 'complete' && episode.status !== 'error'

  let statusLine: React.ReactNode = null
  if (episode.status === 'transcribing') {
    statusLine = (
      <div className="flex gap-0.5 items-center">
        <span className="processing-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <span className="text-[10px] text-[var(--accent)] ml-1">Transcribing</span>
      </div>
    )
  } else if (episode.status === 'queued') {
    statusLine = <span className="text-[10px] text-[var(--secondary)]">Queued</span>
  } else if (episode.status === 'summarizing') {
    statusLine = (
      <div className="flex gap-0.5 items-center">
        <span className="processing-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <span className="text-[10px] text-[var(--accent)] ml-1">Summarizing</span>
      </div>
    )
  } else if (episode.status === 'error') {
    statusLine = <span className="text-[10px] text-red-400">Error</span>
  } else {
    const parts: string[] = []
    if (episode.duration_sec) parts.push(formatDurationShort(episode.duration_sec))
    if (episode.created_at) parts.push(formatRelativeDate(episode.created_at))
    if (parts.length > 0) {
      statusLine = <span className="text-[10px] text-[var(--secondary)]">{parts.join(' · ')}</span>
    }
  }

  if (isEditing) {
    return (
      <div className="px-3 py-1.5">
        <InlineEdit
          initialValue={episode.title || fileName}
          onSubmit={(name) => onRenameSubmit(episode.id, name)}
          onCancel={onRenameCancel}
        />
      </div>
    )
  }

  return (
    <div
      className={`sidebar-item flex flex-col gap-0.5 px-3 py-1.5 rounded-lg cursor-pointer ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(episode.id)}
      onDoubleClick={() => onPin(episode.id)}
      onContextMenu={(e) => onContextMenu(e, episode.id)}
      tabIndex={0}
    >
      <span className={`truncate text-sm ${isProcessing ? 'text-[var(--secondary)]' : 'text-[var(--text)]'}`}>
        {title}
      </span>
      {statusLine}
      {progressEntry && (
        <div className="h-[3px] rounded-full bg-white/[0.08] mt-0.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
            style={{ width: `${progressEntry.percent}%` }}
          />
        </div>
      )}
    </div>
  )
}
