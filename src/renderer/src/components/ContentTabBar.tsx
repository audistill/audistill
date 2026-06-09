import { useState, useRef, useEffect } from 'react'
import { useContentTabStore, ContentTab } from '../store/content-tab-store'

export function ContentTabBar(): React.JSX.Element {
  const tabs = useContentTabStore((s) => s.tabs)
  const activeTabId = useContentTabStore((s) => s.activeTabId)
  const setActiveTab = useContentTabStore((s) => s.setActiveTab)
  const deleteTab = useContentTabStore((s) => s.deleteTab)
  const renameTab = useContentTabStore((s) => s.renameTab)
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
          ? 'bg-[var(--bg)] text-[var(--text)] border-b-2 border-[var(--accent)]'
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
