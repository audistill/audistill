import { useEffect, useState } from 'react'
import type { LicenseStateSnapshot } from '../../../preload/index.d'

export function TrialBanner(): React.JSX.Element | null {
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
      className="shrink-0 flex items-center justify-center gap-3 text-xs select-none"
      style={{
        height: 32,
        background: urgent ? 'var(--accent)' : 'var(--surface)',
        color: urgent ? 'white' : 'var(--secondary)',
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
        onClick={() => window.api.license.getState().then(() => {
          const settingsBtn = document.querySelector('[data-navigate="settings-license"]')
          if (settingsBtn) (settingsBtn as HTMLElement).click()
        })}
        className="underline hover:opacity-80 cursor-pointer"
        style={{ color: urgent ? 'white' : 'var(--accent)' }}
      >
        Enter License Key
      </button>
      {urgent && (
        <>
          <span className="opacity-50">·</span>
          <button
            onClick={() => window.electron.ipcRenderer.invoke('license:open-checkout')}
            className="underline hover:opacity-80 cursor-pointer"
            style={{ color: 'white' }}
          >
            Buy Audistill
          </button>
        </>
      )}
    </div>
  )
}
