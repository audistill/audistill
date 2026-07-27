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

  if (!snapshot) return null

  const { state } = snapshot

  if (state === 'licensed') return null

  if (state === 'trial') {
    return <TrialActiveBanner snapshot={snapshot} openSettings={openSettings} />
  }

  if (state === 'trial-expired') {
    return (
      <BlockedBanner
        text="Trial ended"
        primaryLabel="Buy Audistill"
        primaryAction={() => window.electron.ipcRenderer.invoke('license:open-checkout')}
        secondaryLabel="Enter Key"
        secondaryAction={openSettings}
      />
    )
  }

  if (state === 'license-invalid') {
    return (
      <BlockedBanner
        text="License inactive"
        primaryLabel="Enter Key"
        primaryAction={openSettings}
        secondaryLabel="Buy Audistill"
        secondaryAction={() => window.electron.ipcRenderer.invoke('license:open-checkout')}
      />
    )
  }

  return null
}

function TrialActiveBanner({
  snapshot,
  openSettings,
}: {
  snapshot: LicenseStateSnapshot
  openSettings: () => void
}): React.JSX.Element {
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

function BlockedBanner({
  text,
  primaryLabel,
  primaryAction,
  secondaryLabel,
  secondaryAction,
}: {
  text: string
  primaryLabel: string
  primaryAction: () => void
  secondaryLabel: string
  secondaryAction: () => void
}): React.JSX.Element {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] select-none pointer-events-none"
      style={{ color: 'var(--accent)' }}
    >
      <span>{text}</span>
      <span className="opacity-50">·</span>
      <button
        onClick={primaryAction}
        className="underline hover:opacity-80 cursor-pointer pointer-events-auto"
        style={{ color: 'var(--accent)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {primaryLabel}
      </button>
      <span className="opacity-50">·</span>
      <button
        onClick={secondaryAction}
        className="underline hover:opacity-80 cursor-pointer pointer-events-auto"
        style={{ color: 'var(--accent)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {secondaryLabel}
      </button>
    </div>
  )
}
