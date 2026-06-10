import { useState, useRef, useEffect } from 'react'
import { useContentTabStore, ContentTab } from '../store/content-tab-store'
import { useAppStore } from '../store/app-store'

interface Recipe {
  id: string
  name: string
  is_builtin: number
}

export function ContentTabBar({ episodeId }: { episodeId: string }): React.JSX.Element {
  const tabs = useContentTabStore((s) => s.tabs)
  const activeTabId = useContentTabStore((s) => s.activeTabId)
  const setActiveTab = useContentTabStore((s) => s.setActiveTab)
  const deleteTab = useContentTabStore((s) => s.deleteTab)
  const renameTab = useContentTabStore((s) => s.renameTab)
  const transcriptPanelOpen = useAppStore((s) => s.transcriptPanelOpen)
  const toggleTranscriptPanel = useAppStore((s) => s.toggleTranscriptPanel)
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex items-center gap-0.5 border-b border-[var(--surface)] px-4 min-h-[36px]">
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
    const existingTab = tabs.find((t) => t.recipe_id === recipe.id)
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
