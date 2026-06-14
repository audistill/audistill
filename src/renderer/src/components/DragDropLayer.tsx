import { useState, useEffect } from 'react'

export const DRAG_MIME = 'application/x-audistill-episode'

interface DragState {
  active: boolean
  title: string
  x: number
  y: number
}

export function DragDropLayer(): React.JSX.Element | null {
  const [drag, setDrag] = useState<DragState>({ active: false, title: '', x: 0, y: 0 })

  useEffect(() => {
    const onDragStart = (e: CustomEvent<{ title: string }>): void => {
      setDrag({ active: true, title: e.detail.title, x: 0, y: 0 })
    }
    const onDrag = (e: DragEvent): void => {
      if (e.clientX === 0 && e.clientY === 0) return
      setDrag((d) => (d.active ? { ...d, x: e.clientX, y: e.clientY } : d))
    }
    const onDragEnd = (): void => {
      setDrag({ active: false, title: '', x: 0, y: 0 })
    }

    window.addEventListener('audistill-drag-start', onDragStart as EventListener)
    window.addEventListener('drag', onDrag)
    window.addEventListener('dragend', onDragEnd)
    return () => {
      window.removeEventListener('audistill-drag-start', onDragStart as EventListener)
      window.removeEventListener('drag', onDrag)
      window.removeEventListener('dragend', onDragEnd)
    }
  }, [])

  if (!drag.active || (drag.x === 0 && drag.y === 0)) return null

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{ left: drag.x + 12, top: drag.y - 14 }}
    >
      <div className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_12px_rgba(0,0,0,0.3)] text-xs text-[var(--text)] max-w-[180px] truncate">
        {drag.title}
      </div>
    </div>
  )
}
