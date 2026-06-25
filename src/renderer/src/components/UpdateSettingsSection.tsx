import { useState } from 'react'
import { useUpdateStore } from '../store/update-store'

export function UpdateSettingsSection(): React.JSX.Element {
  const status = useUpdateStore((s) => s.status)
  const check = useUpdateStore((s) => s.check)
  const install = useUpdateStore((s) => s.install)
  const [checking, setChecking] = useState(false)
  const [lastCheckResult, setLastCheckResult] = useState<'latest' | 'ready' | null>(null)

  const handleCheck = async (): Promise<void> => {
    setChecking(true)
    setLastCheckResult(null)
    await check()
    const updated = useUpdateStore.getState().status
    if (updated.state === 'ready') {
      setLastCheckResult('ready')
    } else {
      setLastCheckResult('latest')
    }
    setChecking(false)
  }

  return (
    <div className="mb-8">
      <label className="block font-heading text-sm font-medium text-[var(--text)] mb-0.5">App Updates</label>
      <p className="text-xs text-[var(--secondary)] mb-3">
        Version: {status.currentVersion || '—'}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCheck}
          disabled={checking}
          className="px-3 py-1.5 text-xs font-medium rounded-[8px] bg-[var(--surface)] text-[var(--text)] hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? 'Checking…' : 'Check for Updates'}
        </button>

        {lastCheckResult === 'latest' && status.state === 'idle' && (
          <span className="text-xs text-[var(--secondary)]">You&apos;re on the latest version</span>
        )}

        {(status.state === 'ready' || lastCheckResult === 'ready') && status.state === 'ready' && (
          <span className="text-xs text-[var(--text)]">
            v{status.version} is ready to install ·{' '}
            <button
              onClick={install}
              className="text-[var(--accent)] hover:opacity-80 underline cursor-pointer"
            >
              Restart now
            </button>
          </span>
        )}

        {status.state === 'downloading' && (
          <span className="text-xs text-[var(--secondary)]">Downloading update… {status.percent}%</span>
        )}
      </div>
    </div>
  )
}
