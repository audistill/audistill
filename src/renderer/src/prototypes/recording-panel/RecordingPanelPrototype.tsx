import { FileAudio, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PrototypeSwitcher, type RecordingPrototypeVariant } from './PrototypeSwitcher'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantC } from './VariantC'
import { useRecordingPrototypeStore } from './recording-panel-prototype-store'
import './recording-panel-prototype.css'

// PROTOTYPE — THROWAWAY

function readVariant(): RecordingPrototypeVariant {
  const value = new URLSearchParams(window.location.search).get('variant')?.toUpperCase()
  return value === 'B' || value === 'C' ? value : 'A'
}

function SimulatedEpisode(): React.JSX.Element {
  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--accent-bg)] text-[var(--accent)]"><FileAudio size={16} /></span>
        <div>
          <h1 className="text-[15px] font-semibold">Quarterly planning</h1>
          <p className="text-[11px] text-[var(--secondary)]">Recorded · 00:24</p>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-8 pb-24 text-center">
        <div>
          <LoaderCircle className="recording-spinner mx-auto text-[var(--accent)]" size={25} />
          <p className="mt-4 text-sm font-medium">Transcribing Recorded Episode…</p>
          <p className="mt-1 text-xs text-[var(--secondary)]">This is a simulated processing handoff.</p>
        </div>
      </div>
    </main>
  )
}

export function RecordingPanelPrototype(): React.JSX.Element {
  const [variant, setVariant] = useState<RecordingPrototypeVariant>(readVariant)
  const workspace = useRecordingPrototypeStore((state) => state.workspace)
  const tick = useRecordingPrototypeStore((state) => state.tick)

  useEffect(() => {
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [tick])

  const changeVariant = useCallback((nextVariant: RecordingPrototypeVariant): void => {
    const url = new URL(window.location.href)
    url.searchParams.set('prototype', 'recording-panel')
    url.searchParams.set('variant', nextVariant)
    window.history.replaceState(null, '', url)
    setVariant(nextVariant)
  }, [])

  const Variant = variant === 'A' ? VariantA : variant === 'B' ? VariantB : VariantC

  return (
    <div className="recording-prototype relative flex-1 min-w-0 h-full min-h-0 overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {workspace === 'episode' ? <SimulatedEpisode /> : <Variant />}
      <PrototypeSwitcher variant={variant} onVariantChange={changeVariant} />
    </div>
  )
}
