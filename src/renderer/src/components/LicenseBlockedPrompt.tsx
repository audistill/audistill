const POLAR_CHECKOUT_URL = 'https://polar.sh/audistill/checkout'

export function LicenseBlockedPrompt(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-[var(--text)]">Your trial has ended</p>
      <p className="text-xs text-[var(--secondary)] max-w-xs">
        Your library is still here — episodes, transcripts, and summaries remain viewable.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => window.electron.ipcRenderer.invoke('shell:open-external', POLAR_CHECKOUT_URL)}
          className="px-4 py-2 rounded-[12px] bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          Buy Audistill — $29
        </button>
        <button
          onClick={() => {
            const settingsBtn = document.querySelector('[data-navigate="settings"]')
            if (settingsBtn) (settingsBtn as HTMLElement).click()
          }}
          className="px-4 py-2 rounded-[12px] bg-[var(--surface)] text-[var(--text)] text-sm hover:opacity-80 transition-opacity cursor-pointer"
        >
          Enter License Key
        </button>
      </div>
    </div>
  )
}

export function isLicenseError(err: unknown): boolean {
  const message = typeof err === 'string' ? err : (err as { message?: string })?.message ?? ''
  return message.includes('Trial has ended') || message.includes('License could not be verified')
}
