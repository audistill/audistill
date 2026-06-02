import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore, Episode, Folder } from '../store/app-store'

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

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'folder' | 'folders-header' | 'episode'
    folderId?: string
    parentId?: string | null
    episodeId?: string
  } | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState<{ parentId: string | null } | null>(null)

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
            onClick={async () => {
              const filePaths = await window.api.selectFiles()
              if (filePaths && filePaths.length > 0) {
                await window.api.addFiles(filePaths)
              }
            }}
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
              onContextMenu={handleEpisodeContextMenu}
            />
          ))}
          {inboxItems.length === 0 && !searchQuery && (
            <div className="px-3 py-2 text-xs text-[var(--secondary)]">No items in Inbox</div>
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
              className="flex items-center justify-center w-5 h-5 rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
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
          />
        ))}

        {folders.length === 0 && !creatingFolder && (
          <div className="px-3 py-2 text-xs text-[var(--secondary)]">No folders yet</div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={
            contextMenu.type === 'episode'
              ? [
                  ...folders.map((f) => ({
                    label: `Move to ${f.name}`,
                    action: () => handleMoveEpisode(contextMenu.episodeId!, f.id),
                  })),
                  {
                    label: 'Move to Inbox',
                    action: () => handleMoveEpisode(contextMenu.episodeId!, null),
                  },
                  {
                    label: 'Delete',
                    action: () => handleDeleteEpisode(contextMenu.episodeId!),
                    danger: true,
                  },
                ]
              : contextMenu.type === 'folder'
                ? [
                    { label: 'New Subfolder', action: () => handleNewFolder(contextMenu.folderId!) },
                    { label: 'Rename', action: () => handleRenameFolder(contextMenu.folderId!) },
                    { label: 'Delete', action: () => handleDeleteFolder(contextMenu.folderId!), danger: true },
                  ]
                : [{ label: 'New Folder', action: () => handleNewFolder(null) }]
          }
        />
      )}
    </div>
  )
}

function FolderNode({
  folder,
  folders,
  depth,
  expandedFolders,
  activeTabId,
  settingsOpen,
  editingFolderId,
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
}: {
  folder: Folder
  folders: Folder[]
  depth: number
  expandedFolders: Set<string>
  activeTabId: string | null
  settingsOpen: boolean
  editingFolderId: string | null
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
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (!isEditing) {
            // start editing on double-click instead of toggling
          }
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
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
        className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}
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
          />
        ))}

        {/* Episodes in folder */}
        {children.map((ep) => (
          <div key={ep.id} style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
            <SidebarEpisode
              episode={ep}
              isActive={activeTabId === ep.id && !settingsOpen}
              onSelect={selectEpisode}
              onPin={pinEpisode}
              onContextMenu={onEpisodeContextMenu}
            />
          </div>
        ))}
        {children.length === 0 && childFolders.length === 0 && isExpanded && (
          <div className="px-3 py-2 text-xs text-[var(--secondary)]" style={{ paddingLeft: `${(depth + 1) * 16 + 12}px` }}>
            No episodes
          </div>
        )}
      </div>
    </div>
  )
}

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

function ContextMenu({
  x,
  y,
  items,
}: {
  x: number
  y: number
  items: { label: string; action: () => void; danger?: boolean }[]
}): React.JSX.Element {
  return (
    <div
      className="fixed z-50 bg-[var(--surface)] border border-[var(--secondary)]/20 rounded-lg shadow-xl py-1 min-w-[140px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--bg)] transition-colors ${
            item.danger ? 'text-red-400' : 'text-[var(--text)]'
          }`}
          onClick={item.action}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function SidebarEpisode({
  episode,
  isActive,
  onSelect,
  onPin,
  onContextMenu,
}: {
  episode: Episode
  isActive: boolean
  onSelect: (id: string) => void
  onPin: (id: string) => void
  onContextMenu: (e: React.MouseEvent, episodeId: string) => void
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
      onContextMenu={(e) => onContextMenu(e, episode.id)}
    >
      <span className={`truncate flex-1 ${episode.status !== 'complete' ? 'text-[var(--secondary)]' : 'text-[var(--text)]'}`}>
        {title}
      </span>
      {statusIcon}
    </div>
  )
}
