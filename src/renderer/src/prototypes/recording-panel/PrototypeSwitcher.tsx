import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { type RecordingPrototypePhase, useRecordingPrototypeStore } from './recording-panel-prototype-store'

// PROTOTYPE — THROWAWAY

export type RecordingPrototypeVariant = 'A' | 'B' | 'C'

interface PrototypeSwitcherProps {
  variant: RecordingPrototypeVariant
  onVariantChange: (variant: RecordingPrototypeVariant) => void
}

const variants: RecordingPrototypeVariant[] = ['A', 'B', 'C']
const variantLabels: Record<RecordingPrototypeVariant, string> = {
  A: 'A — Focused Session',
  B: 'B — Episode Workspace',
  C: 'C — Control Desk'
}
const states: Array<{ label: string; phase: RecordingPrototypePhase }> = [
  { label: 'Setup', phase: 'setup' },
  { label: 'Recording', phase: 'recording' },
  { label: 'Paused', phase: 'paused' },
  { label: 'Disconnected', phase: 'disconnected' },
  { label: 'Preparing', phase: 'preparing' }
]

function isEditing(target: EventTarget | null): boolean {
  return target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
}

function isWithinTabList(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('[role="tablist"]') !== null
}

export function PrototypeSwitcher({ variant, onVariantChange }: PrototypeSwitcherProps): React.JSX.Element {
  const phase = useRecordingPrototypeStore((state) => state.phase)
  const setPhase = useRecordingPrototypeStore((state) => state.setPhase)
  const systemAudioPermissionDenied = useRecordingPrototypeStore((state) => state.systemAudioPermissionDenied)
  const microphonePermissionDenied = useRecordingPrototypeStore((state) => state.microphonePermissionDenied)
  const setPermissionDenied = useRecordingPrototypeStore((state) => state.setPermissionDenied)
  const reset = useRecordingPrototypeStore((state) => state.reset)
  const cycle = (direction: -1 | 1): void => {
    const index = variants.indexOf(variant)
    onVariantChange(variants[(index + direction + variants.length) % variants.length])
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditing(event.target) || isWithinTabList(event.target)) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        cycle(-1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        cycle(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [variant, onVariantChange])

  return (
    <aside className="recording-prototype-switcher fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-[16px] border border-[var(--border)] bg-[var(--bg)]/95 p-2 backdrop-blur-md" aria-label="Recording prototype controls">
      <button type="button" onClick={() => cycle(-1)} aria-label="Previous variant" className="rounded-[9px] p-1.5 text-[var(--secondary)] hover:bg-[var(--surface)]"><ChevronLeft size={15} /></button>
      <span className="min-w-[156px] px-1 text-center text-xs font-semibold">{variantLabels[variant]}</span>
      <button type="button" onClick={() => cycle(1)} aria-label="Next variant" className="rounded-[9px] p-1.5 text-[var(--secondary)] hover:bg-[var(--surface)]"><ChevronRight size={15} /></button>
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      {states.map((item) => (
        <button key={item.phase} type="button" aria-pressed={phase === item.phase} onClick={() => setPhase(item.phase)} className={`rounded-[8px] px-2 py-1.5 text-[11px] font-medium ${phase === item.phase ? 'bg-[var(--accent)] text-white' : 'text-[var(--secondary)] hover:bg-[var(--surface)]'}`}>{item.label}</button>
      ))}
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      <button
        type="button"
        aria-pressed={systemAudioPermissionDenied}
        onClick={() => setPermissionDenied('system', !systemAudioPermissionDenied)}
        className={`rounded-[8px] px-2 py-1.5 text-[11px] font-medium ${systemAudioPermissionDenied ? 'bg-amber-500/15 text-[var(--recording-warning)]' : 'text-[var(--secondary)] hover:bg-[var(--surface)]'}`}
      >
        System permission
      </button>
      <button
        type="button"
        aria-pressed={microphonePermissionDenied}
        onClick={() => setPermissionDenied('microphone', !microphonePermissionDenied)}
        className={`rounded-[8px] px-2 py-1.5 text-[11px] font-medium ${microphonePermissionDenied ? 'bg-amber-500/15 text-[var(--recording-warning)]' : 'text-[var(--secondary)] hover:bg-[var(--surface)]'}`}
      >
        Mic permission
      </button>
      <button type="button" onClick={reset} className="ml-1 flex items-center gap-1 rounded-[8px] px-2 py-1.5 text-[11px] font-medium text-[var(--secondary)] hover:bg-[var(--surface)]"><RotateCcw size={12} /> Reset</button>
    </aside>
  )
}
