import { useEffect } from 'react'
import { useUpdateStore } from '../store/update-store'

export function UpdateBanner(): React.JSX.Element | null {
  const status = useUpdateStore((s) => s.status)
  const dismissedVersion = useUpdateStore((s) => s.dismissedVersion)
  const hydrate = useUpdateStore((s) => s.hydrate)
  const install = useUpdateStore((s) => s.install)
  const dismiss = useUpdateStore((s) => s.dismiss)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (status.state !== 'ready') return null
  if (dismissedVersion === status.version) return null

  return (
    <div
      className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] select-none pointer-events-none z-10"
    >
      <span className="text-[var(--text)]">
        Audistill v{status.version} is available.
      </span>
      <button
        onClick={() => {
          window.electron.ipcRenderer.invoke(
            'shell:open-external',
            `https://github.com/audistill/audistill/releases/tag/v${status.version}`
          )
        }}
        className="text-[var(--accent)] hover:opacity-80 underline cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        What&apos;s new?
      </button>
      <button
        onClick={install}
        className="px-2 py-0.5 rounded-[6px] bg-[var(--accent)] text-white text-[11px] font-medium hover:opacity-90 cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        Restart
      </button>
      <button
        onClick={dismiss}
        className="ml-0.5 text-[var(--secondary)] hover:text-[var(--text)] cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
