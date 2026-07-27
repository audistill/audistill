import { useEffect, useRef } from 'react'

interface DeleteConfirmModalProps {
  titles: string[]
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({ titles, onConfirm, onCancel }: DeleteConfirmModalProps): React.JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const count = titles.length

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const heading = count === 1 ? 'Delete episode?' : `Delete ${count} episodes?`

  const shownTitles = titles.slice(0, 3)
  const remaining = count - shownTitles.length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-5 w-[320px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">{heading}</h3>
        <div className="mb-4 space-y-1">
          {shownTitles.map((title, i) => (
            <div key={i} className="text-xs text-[var(--secondary)] truncate">
              {title}
            </div>
          ))}
          {remaining > 0 && (
            <div className="text-xs text-[var(--secondary)]">
              and {remaining} more
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--secondary)] mb-4">This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text)] bg-white/[0.06] hover:bg-white/[0.12] transition-[background-color] duration-150"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition-[background-color] duration-150"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
