import { useEffect, useRef } from 'react'

interface UnsubscribeFeedModalProps {
  feedTitle: string
  onConfirm: () => void
  onCancel: () => void
}

export function UnsubscribeFeedModal({ feedTitle, onConfirm, onCancel }: UnsubscribeFeedModalProps): React.JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null)

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-5 w-[340px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Unsubscribe from {feedTitle}?</h3>
        <p className="text-xs text-[var(--secondary)] mb-4 leading-relaxed">
          Episodes already added from this feed will be kept in your Library. Only the Subscription and its Feed Items will be removed.
        </p>
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
            Unsubscribe
          </button>
        </div>
      </div>
    </div>
  )
}
