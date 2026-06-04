import { useCallback, useRef } from 'react'

export const LEFT_SIDEBAR_MIN = 200
export const LEFT_SIDEBAR_MAX = 400
export const LEFT_SIDEBAR_DEFAULT = 280
export const RIGHT_SIDEBAR_MIN = 300
export const RIGHT_SIDEBAR_MAX = 600
export const RIGHT_SIDEBAR_DEFAULT = 360
export const SNAP_THRESHOLD = 50

export function clampWidth(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function shouldSnap(value: number, min: number): boolean {
  return value < min - SNAP_THRESHOLD
}

interface ResizeHandleProps {
  side: 'left' | 'right'
  onResize: (width: number) => void
  onSnap: () => void
  currentWidth: number
  min: number
  max: number
}

export function ResizeHandle({
  side,
  onResize,
  onSnap,
  currentWidth,
  min,
  max,
}: ResizeHandleProps): React.JSX.Element {
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startX.current = e.clientX
      startWidth.current = currentWidth

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const delta =
          side === 'left'
            ? moveEvent.clientX - startX.current
            : startX.current - moveEvent.clientX

        const raw = startWidth.current + delta

        if (shouldSnap(raw, min)) {
          onSnap()
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
          return
        }

        onResize(clampWidth(raw, min, max))
      }

      const handleMouseUp = (): void => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [side, currentWidth, min, max, onResize, onSnap]
  )

  return (
    <div
      className="w-[5px] shrink-0 cursor-col-resize relative group"
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-[var(--surface)] group-hover:bg-[var(--accent)] group-active:bg-[var(--accent)] transition-[background-color] duration-150" />
    </div>
  )
}
