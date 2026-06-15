import { useState, useEffect } from 'react'
import { useAppStore } from '../store/app-store'
import { useSelectionStore } from '../store/selection-store'
import { FolderTreePopover } from './FolderTreePopover'
import { DeleteConfirmModal } from './DeleteConfirmModal'

export function SelectionActionBar(): React.JSX.Element | null {
  const selectedIds = useSelectionStore((s) => s.selectedEpisodeIds)
  const selectionContainer = useSelectionStore((s) => s.selectionContainer)
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  const episodes = useAppStore((s) => s.episodes)
  const [movePopoverOpen, setMovePopoverOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const selectedCount = selectedIds.size

  useEffect(() => {
    if (selectedCount === 0) return
    const handler = (e: KeyboardEvent): void => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setDeleteModalOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedCount])

  if (selectedCount === 0) return null

  const selectedTitles = [...selectedIds].map((id) => {
    const ep = episodes.find((e) => e.id === id)
    return ep?.title || ep?.file_path?.split('/').pop() || 'Untitled'
  })

  const handleDeleteConfirm = async (): Promise<void> => {
    const ids = [...selectedIds]
    setDeleteModalOpen(false)
    await window.api.deleteEpisodes(ids)
    const { episodes: currentEps, tabs, activeTabId } = useAppStore.getState()
    const idSet = new Set(ids)
    const newEpisodes = currentEps.filter((ep) => !idSet.has(ep.id))
    const newTabs = tabs.filter((t) => !idSet.has(t.episodeId))
    let newActive = activeTabId
    if (newActive && idSet.has(newActive)) {
      newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
    }
    useAppStore.setState({ episodes: newEpisodes, tabs: newTabs, activeTabId: newActive })
    useAppStore.getState().persistTabs()
    clearSelection()
  }

  const handleMoveSelect = async (folderId: string | null): Promise<void> => {
    const ids = [...selectedIds]
    setMovePopoverOpen(false)
    await window.api.moveEpisodes(ids, folderId)
    const { episodes } = useAppStore.getState()
    useAppStore.getState().setEpisodes(
      episodes.map((ep) => ids.includes(ep.id) ? { ...ep, folder_id: folderId } : ep)
    )
    clearSelection()
  }

  return (
    <>
      {movePopoverOpen && (
        <FolderTreePopover
          sourceContainer={selectionContainer === 'inbox' ? null : selectionContainer}
          onSelect={handleMoveSelect}
          onClose={() => setMovePopoverOpen(false)}
        />
      )}
      {deleteModalOpen && (
        <DeleteConfirmModal
          titles={selectedTitles}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModalOpen(false)}
        />
      )}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-40">
        <span className="text-xs font-medium text-[var(--text)] whitespace-nowrap">
          {selectedCount} selected
        </span>

        <div className="flex-1" />

        <button
          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--text)] hover:bg-white/[0.08] transition-[background-color] duration-150"
          onClick={() => setMovePopoverOpen(true)}
          title="Move to folder"
        >
          Move to...
        </button>

        <button
          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-400 hover:bg-white/[0.08] transition-[background-color] duration-150"
          onClick={() => setDeleteModalOpen(true)}
          title="Delete selected"
        >
          Delete
        </button>

        <button
          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--text)] hover:bg-white/[0.08] transition-[background-color] duration-150"
          onClick={async () => {
            const ids = [...selectedIds]
            const exported = await window.api.exportSaveEpisodes(ids)
            if (exported) clearSelection()
          }}
          title="Export selected"
        >
          Export
        </button>

        <button
          className="flex items-center justify-center w-5 h-5 rounded-md text-[var(--secondary)] hover:text-[var(--text)] hover:bg-white/[0.08] transition-[background-color,color] duration-150"
          onClick={clearSelection}
          title="Clear selection"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </>
  )
}
