import { useRef, useEffect } from 'react'
import { useAppStore, Folder } from '../store/app-store'

interface FolderTreePopoverProps {
  sourceContainer: string | null
  onSelect: (folderId: string | null) => void
  onClose: () => void
}

export function FolderTreePopover({ sourceContainer, onSelect, onClose }: FolderTreePopoverProps): React.JSX.Element {
  const folders = useAppStore((s) => s.folders)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const getChildFolders = (parentId: string | null): Folder[] =>
    folders.filter((f) => f.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order)

  const inboxDisabled = sourceContainer === null

  return (
    <div
      ref={ref}
      className="absolute left-3 right-3 bottom-16 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] py-2 max-h-[240px] overflow-y-auto"
    >
      <div className="px-3 py-1 text-[10px] font-medium text-[var(--secondary)] uppercase tracking-wide">
        Move to
      </div>
      <button
        className={`w-full text-left px-3 py-1.5 text-[13px] rounded-md mx-1.5 transition-[background-color] duration-150 ${
          inboxDisabled ? 'text-[var(--secondary)] opacity-50 cursor-default' : 'text-[var(--text)] hover:bg-white/[0.08] cursor-pointer'
        }`}
        style={{ width: 'calc(100% - 12px)' }}
        disabled={inboxDisabled}
        onClick={() => !inboxDisabled && onSelect(null)}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-6l-2 3H10l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
          Inbox
        </div>
      </button>
      {getChildFolders(null).map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          depth={0}
          sourceContainer={sourceContainer}
          getChildFolders={getChildFolders}
          onSelect={onSelect}
        />
      ))}
      {folders.length === 0 && (
        <div className="px-3 py-2 text-xs text-[var(--secondary)]">No folders yet</div>
      )}
    </div>
  )
}

function FolderTreeItem({
  folder,
  depth,
  sourceContainer,
  getChildFolders,
  onSelect,
}: {
  folder: Folder
  depth: number
  sourceContainer: string | null
  getChildFolders: (parentId: string | null) => Folder[]
  onSelect: (folderId: string | null) => void
}): React.JSX.Element {
  const disabled = sourceContainer === folder.id
  const children = getChildFolders(folder.id)

  return (
    <>
      <button
        className={`w-full text-left py-1.5 text-[13px] rounded-md mx-1.5 transition-[background-color] duration-150 ${
          disabled ? 'text-[var(--secondary)] opacity-50 cursor-default' : 'text-[var(--text)] hover:bg-white/[0.08] cursor-pointer'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: '12px', width: 'calc(100% - 12px)' }}
        disabled={disabled}
        onClick={() => !disabled && onSelect(folder.id)}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="truncate">{folder.name}</span>
        </div>
      </button>
      {children.map((child) => (
        <FolderTreeItem
          key={child.id}
          folder={child}
          depth={depth + 1}
          sourceContainer={sourceContainer}
          getChildFolders={getChildFolders}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}
