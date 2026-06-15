import { useEffect, useState } from 'react'
import type { LicenseStateSnapshot } from '../../../preload/index.d'
import { useAppStore } from '../store/app-store'

export function TrialBanner(): React.JSX.Element | null {
  const openSettings = useAppStore((s) => s.openSettings)
  const [snapshot, setSnapshot] = useState<LicenseStateSnapshot | null>(null)

  useEffect(() => {
    window.api.license.getState().then(setSnapshot)
    const unsub = window.api.license.onStateChange(setSnapshot)
    return unsub
  }, [])

  if (!snapshot || snapshot.state !== 'trial') return null

  const days = snapshot.trialDaysRemaining ?? 0
  const urgent = days <= 2

  return (
    <div
      className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] select-none pointer-events-none"
      style={{
        color: urgent ? 'var(--accent)' : 'var(--secondary)',
      }}
    >
      <span>
        {urgent
          ? days === 1
            ? 'Trial ends tomorrow'
            : `Trial ends in ${days} days`
          : `Trial — ${days} day${days !== 1 ? 's' : ''} remaining`}
      </span>
      <span className="opacity-50">·</span>
      <button
        onClick={openSettings}
        className="underline hover:opacity-80 cursor-pointer pointer-events-auto"
        style={{ color: 'var(--accent)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        Enter License Key
      </button>
      {urgent && (
        <>
          <span className="opacity-50">·</span>
          <button
            onClick={() => window.electron.ipcRenderer.invoke('license:open-checkout')}
            className="underline hover:opacity-80 cursor-pointer pointer-events-auto"
            style={{ color: 'var(--accent)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            Buy Audistill
          </button>
        </>
      )}
    </div>
  )
}
