import { useEffect, useState } from 'react'
import type { LicenseStateSnapshot } from '../../../preload/index.d'

const PRICING_URL = 'https://audistill.com/#pricing'
const POLAR_PORTAL_URL = 'https://polar.sh/audistill/portal'
const LANDING_PAGE_URL = 'https://audistill.com'

export function LicensePane(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<LicenseStateSnapshot | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ type: string; message: string } | null>(null)

  useEffect(() => {
    window.api.license.getState().then(setSnapshot)
    const unsub = window.api.license.onStateChange(setSnapshot)
    return unsub
  }, [])

  async function handleActivate(): Promise<void> {
    if (!keyInput.trim()) return
    setLoading(true)
    setError(null)
    const result = await window.api.license.activate(keyInput.trim())
    setLoading(false)
    if (result.success) {
      setKeyInput('')
    } else if (result.error) {
      setError(result.error)
    }
  }

  async function handleDeactivate(): Promise<void> {
    setLoading(true)
    await window.api.license.deactivate()
    setLoading(false)
  }

  function openExternal(url: string): void {
    window.electron.ipcRenderer.invoke('shell:open-external', url)
  }

  if (!snapshot) return <div />

  return (
    <div className="mb-8">
      <label className="block font-heading text-sm font-medium text-[var(--text)] mb-2">License</label>

      {snapshot.state === 'trial' && (
        <div className="max-w-lg space-y-3">
          <p className="text-sm text-[var(--secondary)]">
            Trial — {snapshot.trialDaysRemaining} day{snapshot.trialDaysRemaining !== 1 ? 's' : ''} remaining
          </p>
          <KeyInput
            value={keyInput}
            onChange={setKeyInput}
            onSubmit={handleActivate}
            loading={loading}
          />
          {error && <ErrorMessage error={error} />}
          <Links checkout portal={false} />
        </div>
      )}

      {snapshot.state === 'trial-expired' && (
        <div className="max-w-lg space-y-3">
          <p className="text-sm text-[var(--secondary)]">
            Trial ended — your library is still here.
          </p>
          <KeyInput
            value={keyInput}
            onChange={setKeyInput}
            onSubmit={handleActivate}
            loading={loading}
          />
          {error && <ErrorMessage error={error} />}
          <Links checkout portal={false} />
        </div>
      )}

      {snapshot.state === 'licensed' && (
        <div className="max-w-lg space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-[var(--text)]">Licensed</span>
          </div>
          {snapshot.maskedKey && (
            <p className="text-xs text-[var(--secondary)] font-mono">{snapshot.maskedKey}</p>
          )}
          {snapshot.activationLabel && (
            <p className="text-xs text-[var(--secondary)]">Device: {snapshot.activationLabel}</p>
          )}
          <button
            onClick={handleDeactivate}
            disabled={loading}
            className="px-3 py-1.5 rounded-[8px] text-xs bg-[var(--surface)] text-[var(--secondary)] hover:text-[var(--text)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Deactivating...' : 'Deactivate this device'}
          </button>
          <p className="text-xs text-[var(--secondary)]">
            <button onClick={() => openExternal(POLAR_PORTAL_URL)} className="underline hover:text-[var(--text)] cursor-pointer">
              Manage license
            </button>
          </p>
        </div>
      )}

      {snapshot.state === 'license-invalid' && (
        <div className="max-w-lg space-y-3">
          <p className="text-sm text-[var(--secondary)]">
            License could not be verified. Connect to the internet and restart, or enter a new key.
          </p>
          <KeyInput
            value={keyInput}
            onChange={setKeyInput}
            onSubmit={handleActivate}
            loading={loading}
          />
          {error && <ErrorMessage error={error} />}
          <Links checkout portal />
        </div>
      )}
    </div>
  )
}

function KeyInput({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  loading: boolean
}): React.JSX.Element {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
        className="flex-1 px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors font-mono"
        placeholder="AUDISTILL_xxxx-xxxx-xxxx"
        disabled={loading}
      />
      <button
        onClick={onSubmit}
        disabled={loading || !value.trim()}
        className="px-4 py-2.5 rounded-[12px] bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Activating...' : 'Activate'}
      </button>
    </div>
  )
}

function ErrorMessage({ error }: { error: { type: string; message: string } }): React.JSX.Element {
  if (error.type === 'activation-limit') {
    return (
      <div className="text-xs text-red-400 space-y-1">
        <p>Device limit reached. Deactivate another device first.</p>
        <p>
          <button
            onClick={() => window.electron.ipcRenderer.invoke('shell:open-external', POLAR_PORTAL_URL)}
            className="underline hover:opacity-80 cursor-pointer"
          >
            Manage devices in Polar
          </button>
        </p>
      </div>
    )
  }

  if (error.type === 'invalid-key') {
    return <p className="text-xs text-red-400">This key wasn't recognized. Double-check for typos.</p>
  }

  return <p className="text-xs text-red-400">Couldn't reach the license server. Check your connection and try again.</p>
}

function Links({ checkout, portal }: { checkout: boolean; portal: boolean }): React.JSX.Element {
  function openExternal(url: string): void {
    window.electron.ipcRenderer.invoke('shell:open-external', url)
  }

  return (
    <div className="flex gap-3 text-xs">
      {checkout && (
        <button onClick={() => openExternal(PRICING_URL)} className="text-[var(--accent)] underline hover:opacity-80 cursor-pointer">
          Buy Audistill
        </button>
      )}
      <button onClick={() => openExternal(LANDING_PAGE_URL)} className="text-[var(--secondary)] underline hover:opacity-80 cursor-pointer">
        Learn more
      </button>
      {portal && (
        <button onClick={() => openExternal(POLAR_PORTAL_URL)} className="text-[var(--secondary)] underline hover:opacity-80 cursor-pointer">
          Manage license
        </button>
      )}
    </div>
  )
}
