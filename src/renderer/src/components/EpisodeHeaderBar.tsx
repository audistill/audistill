import { useState, useRef, useEffect, useCallback } from 'react'
import { Video, Rss, Globe, FileAudio } from 'lucide-react'
import { useContentTabStore, ContentTab } from '../store/content-tab-store'
import { useAppStore, Episode } from '../store/app-store'

// --- Source icon config ---

const SOURCE_ICONS = {
  youtube: { icon: Video, color: '#ef4444' },
  rss: { icon: Rss, color: '#f59e0b' },
  direct: { icon: Globe, color: '#3b82f6' },
  local: { icon: FileAudio, color: '#71717a' },
} as const

function getSourceIcon(sourceType: string | null) {
  return SOURCE_ICONS[sourceType as keyof typeof SOURCE_ICONS] ?? SOURCE_ICONS.local
}

function getSecondaryLabel(episode: Episode): string | null {
  if (episode.source_meta) {
    try {
      const meta = JSON.parse(episode.source_meta)
      if (episode.source_type === 'youtube' && meta.channel) return meta.channel
      if (episode.source_type === 'rss' && meta.feedTitle) return meta.feedTitle
    } catch { /* ignore */ }
  }

  if (episode.source_type === 'direct' && episode.source_url) {
    try {
      return new URL(episode.source_url).hostname.replace('www.', '')
    } catch { /* ignore */ }
  }

  if ((episode.source_type === 'local' || !episode.source_type) && episode.file_path) {
    const parts = episode.file_path.split('/')
    return parts[parts.length - 1] ?? null
  }

  return null
}

function getFullPath(episode: Episode): string | null {
  if (episode.source_type === 'local' && episode.file_path) {
    return episode.file_path
  }
  return episode.source_url ?? null
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// --- Main component ---

interface EpisodeHeaderBarProps {
  episode: Episode
  /** If false, only show lines 1+2 (no tab bar). Used for non-complete episodes. */
  showTabs?: boolean
}

export function EpisodeHeaderBar({ episode, showTabs = true }: EpisodeHeaderBarProps): React.JSX.Element {
  const source = getSourceIcon(episode.source_type)
  const Icon = source.icon
  const secondaryLabel = getSecondaryLabel(episode)
  const fullPath = getFullPath(episode)
  const displayTitle = episode.title || episode.file_path?.split('/').pop() || 'Untitled'
  const renameEpisode = useAppStore((s) => s.renameEpisode)
  const [editing, setEditing] = useState(false)

  return (
    <div className="border-b border-[var(--surface)] shrink-0 px-4 pt-3 pb-0">
      {/* Line 1: Icon + Title */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${source.color}26` }}
        >
          <Icon size={13} style={{ color: source.color }} />
        </div>
        {editing ? (
          <HeaderInlineEdit
            initialValue={displayTitle}
            onSubmit={(name) => {
              setEditing(false)
              renameEpisode(episode.id, name)
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <h1
            className="text-[15px] font-heading font-semibold text-[var(--text)] truncate flex-1 leading-tight cursor-default"
            title={fullPath ?? displayTitle}
            onDoubleClick={() => setEditing(true)}
          >
            {displayTitle}
          </h1>
        )}
      </div>

      {/* Line 2: Metadata */}
      <div className="flex items-center gap-2 mt-1 pl-[34px]">
        {secondaryLabel && (
          <span className="text-[11px] text-[var(--secondary)] opacity-60 truncate">
            {secondaryLabel}
          </span>
        )}
        {secondaryLabel && episode.duration_sec && (
          <span className="w-0.5 h-0.5 rounded-full bg-[var(--secondary)] opacity-40 shrink-0" />
        )}
        {episode.duration_sec && (
          <span className="text-[11px] text-[var(--secondary)] opacity-60 shrink-0">
            {formatDuration(episode.duration_sec)}
          </span>
        )}
      </div>

      {/* Line 3: Content tabs (only when episode is complete) */}
      {showTabs ? (
        <TabBarRow episodeId={episode.id} />
      ) : (
        <div className="h-2" />
      )}
    </div>
  )
}

// --- Tab bar row (migrated from ContentTabBar) ---

function TabBarRow({ episodeId }: { episodeId: string }): React.JSX.Element {
  const tabs = useContentTabStore((s) => s.tabs)
  const activeTabId = useContentTabStore((s) => s.activeTabId)
  const setActiveTab = useContentTabStore((s) => s.setActiveTab)
  const deleteTab = useContentTabStore((s) => s.deleteTab)
  const renameTab = useContentTabStore((s) => s.renameTab)
  const transcriptPanelOpen = useAppStore((s) => s.transcriptPanelOpen)
  const toggleTranscriptPanel = useAppStore((s) => s.toggleTranscriptPanel)
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex items-center gap-0.5 mt-2">
      <div
        ref={scrollRef}
        className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1"
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onActivate={() => setActiveTab(tab.id)}
            onClose={() => deleteTab(tab.id)}
            onRename={(name) => renameTab(tab.id, name)}
          />
        ))}
      </div>
      <PlusButton episodeId={episodeId} />
      <button
        onClick={toggleTranscriptPanel}
        className={`ml-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          transcriptPanelOpen
            ? 'text-[var(--accent)] bg-[var(--accent)]/10'
            : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
        }`}
        aria-label="Toggle transcript panel"
        title="Toggle transcript (⌘⇧T)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>Transcript</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`transition-transform ${transcriptPanelOpen ? 'rotate-180' : ''}`}
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  )
}

// --- Plus button (migrated from ContentTabBar) ---

interface Recipe {
  id: string
  name: string
  is_builtin: number
}

function PlusButton({ episodeId }: { episodeId: string }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const tabs = useContentTabStore((s) => s.tabs)
  const createTab = useContentTabStore((s) => s.createTab)

  useEffect(() => {
    if (open) {
      window.api.recipesGetAll().then(setRecipes)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  const handleBlank = async () => {
    setOpen(false)
    await createTab(episodeId, { tab_name: 'Untitled' })
  }

  const handleRecipe = async (recipe: Recipe) => {
    setOpen(false)
    const existingTab = tabs.find((t) => t.recipe_id === recipe.id && t.is_pipeline !== 1)
    if (existingTab) {
      useContentTabStore.getState().setActiveTab(existingTab.id)
      return
    }
    const tabId = await createTab(episodeId, {
      recipe_id: recipe.id,
      tab_name: recipe.name,
    })
    await window.api.tabsExecuteRecipe(episodeId, tabId)
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="w-6 h-6 flex items-center justify-center rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
        aria-label="New tab"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1.5 rounded-lg bg-[var(--surface)] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        >
          <button
            onClick={handleBlank}
            className="w-full px-3 py-1.5 text-left text-[13px] text-[var(--text)] hover:bg-white/[0.08] rounded-md mx-1.5 transition-[background-color] duration-150"
            style={{ width: 'calc(100% - 12px)' }}
          >
            Blank
          </button>
          {recipes.length > 0 && (
            <>
              <div className="my-1.5 mx-2 border-t border-white/[0.06]" />
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleRecipe(recipe)}
                  className="w-full px-3 py-1.5 text-left text-[13px] text-[var(--text)] hover:bg-white/[0.08] rounded-md mx-1.5 transition-[background-color] duration-150"
                  style={{ width: 'calc(100% - 12px)' }}
                >
                  {recipe.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// --- Tab item (migrated from ContentTabBar) ---

function TabItem({
  tab,
  isActive,
  onActivate,
  onClose,
  onRename,
}: {
  tab: ContentTab
  isActive: boolean
  onActivate: () => void
  onClose: () => void
  onRename: (name: string) => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(tab.tab_name)
  const inputRef = useRef<HTMLInputElement>(null)
  const isPipeline = tab.is_pipeline === 1
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleDoubleClick = () => {
    setEditName(tab.tab_name)
    setEditing(true)
  }

  const handleSave = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== tab.tab_name) {
      onRename(trimmed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div
      className={`group relative flex items-center gap-1 px-3 py-1.5 rounded-t-[8px] text-sm font-medium cursor-pointer select-none transition-colors shrink-0 ${
        isActive
          ? `bg-[var(--bg)] text-[var(--text)]${editing ? '' : ' border-b-2 border-[var(--accent)]'}`
          : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
      }`}
      onClick={onActivate}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isPipeline && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-[var(--accent)] opacity-70 shrink-0"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
        </svg>
      )}

      {editing ? (
        <input
          ref={inputRef}
          className="bg-transparent outline-none border-b border-[var(--accent)] text-sm font-medium text-[var(--text)] w-24"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate max-w-[120px]">{tab.tab_name}</span>
      )}

      {!isPipeline && hovered && !editing && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="ml-1 p-0.5 rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
          aria-label={`Close ${tab.tab_name}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// --- Inline edit for header title ---

function HeaderInlineEdit({
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
      className="flex-1 bg-[var(--surface)] text-[var(--text)] text-[15px] font-heading font-semibold px-1.5 py-0.5 rounded outline-none border border-[var(--accent)] leading-tight"
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
