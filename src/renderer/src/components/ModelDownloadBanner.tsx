import { useEffect } from 'react'
import { useModelStatusStore } from '../store/model-status-store'

export function ModelDownloadBanner(): React.JSX.Element | null {
  // Subscribe to primitives only to avoid infinite re-render loops
  const state = useModelStatusStore((s) => s.status.state)
  const percent = useModelStatusStore((s) => s.status.percent ?? 0)
  const error = useModelStatusStore((s) => s.status.error)
  const hydrate = useModelStatusStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (state === 'ready') return null

  if (state === 'downloading') {
    return (
      <div className="shrink-0 px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <svg className="w-4 h-4 shrink-0 text-[var(--accent)] animate-spin" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-[var(--text)]">
            Downloading Transcription Model…
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg)] overflow-hidden max-w-[200px]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs text-[var(--secondary)] tabular-nums">
            {percent}%
          </span>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="shrink-0 px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <svg className="w-4 h-4 shrink-0 text-red-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 4a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0V5zm.75 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" />
          </svg>
          <span className="text-xs text-[var(--text)]">
            Transcription Model download failed
          </span>
          {error && (
            <span className="text-xs text-[var(--secondary)] truncate max-w-[200px]" title={error}>
              — {error}
            </span>
          )}
        </div>
        <button
          onClick={() => window.api.modelDownload()}
          className="shrink-0 px-3 py-1 text-xs rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }

  // not-downloaded state (model deleted or first launch before download starts)
  return (
    <div className="shrink-0 px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] flex items-center gap-3">
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <svg className="w-4 h-4 shrink-0 text-[var(--secondary)]" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 4a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0V5zm.75 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" />
        </svg>
        <span className="text-xs text-[var(--text)]">
          Transcription Model not available — Ingest is disabled
        </span>
      </div>
      <button
        onClick={() => window.api.modelDownload()}
        className="shrink-0 px-3 py-1 text-xs rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
      >
        Download
      </button>
    </div>
  )
}
