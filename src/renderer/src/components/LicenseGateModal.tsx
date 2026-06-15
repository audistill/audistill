import { useEffect, useState } from 'react'
import type { LicenseStateSnapshot } from '../../../preload/index.d'
import { useAppStore } from '../store/app-store'

export function LicenseGateModal(): React.JSX.Element | null {
  const { open, action } = useAppStore((s) => s.licenseGateModal)
  const closeLicenseGateModal = useAppStore((s) => s.closeLicenseGateModal)
  const openSettings = useAppStore((s) => s.openSettings)
  const [snapshot, setSnapshot] = useState<LicenseStateSnapshot | null>(null)

  useEffect(() => {
    if (open) {
      window.api.license.getState().then(setSnapshot)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeLicenseGateModal()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closeLicenseGateModal])

  if (!open) return null

  const isInvalid = snapshot?.state === 'license-invalid'
  const headline = isInvalid ? 'License inactive' : 'Trial ended'
  const subtext = isInvalid
    ? 'Your license could not be verified. It may have been revoked or used on another device.'
    : 'Your 14-day trial has ended. Your library remains accessible.'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={closeLicenseGateModal}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-6 w-[360px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">{headline}</h3>
          <button
            onClick={closeLicenseGateModal}
            className="text-[var(--secondary)] hover:text-[var(--text)] transition-colors -mt-1 -mr-1 p-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-[var(--secondary)] mb-2">{subtext}</p>
        <p className="text-xs text-[var(--secondary)] mb-5">
          {action} requires an active license.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => {
              window.electron.ipcRenderer.invoke('license:open-checkout')
              closeLicenseGateModal()
            }}
            className="flex-1 px-4 py-2 rounded-[12px] bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Buy Audistill
          </button>
          <button
            onClick={() => {
              openSettings()
              closeLicenseGateModal()
            }}
            className="flex-1 px-4 py-2 rounded-[12px] bg-white/[0.06] text-[var(--text)] text-sm font-medium hover:bg-white/[0.12] transition-[background-color] duration-150 cursor-pointer"
          >
            Enter License Key
          </button>
        </div>
      </div>
    </div>
  )
}
