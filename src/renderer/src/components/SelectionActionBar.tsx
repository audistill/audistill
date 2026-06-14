import { useSelectionStore } from '../store/selection-store'

export function SelectionActionBar(): React.JSX.Element | null {
  const selectedCount = useSelectionStore((s) => s.selectedEpisodeIds.size)
  const clearSelection = useSelectionStore((s) => s.clearSelection)

  if (selectedCount === 0) return null

  return (
    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_16px_rgba(0,0,0,0.3)] z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <span className="text-xs font-medium text-[var(--text)] whitespace-nowrap">
        {selectedCount} selected
      </span>

      <div className="flex-1" />

      <button
        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--text)] hover:bg-white/[0.08] transition-[background-color] duration-150"
        onClick={() => {}}
        title="Move to folder"
      >
        Move to...
      </button>

      <button
        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-400 hover:bg-white/[0.08] transition-[background-color] duration-150"
        onClick={() => {}}
        title="Delete selected"
      >
        Delete
      </button>

      <button
        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--text)] hover:bg-white/[0.08] transition-[background-color] duration-150"
        onClick={() => {}}
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
  )
}
