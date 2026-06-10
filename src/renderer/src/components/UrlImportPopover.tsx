import { useState, useRef, useEffect, useCallback } from 'react'
import { parseYouTubeUrl } from '../../../shared/youtube-url'

type PopoverState =
  | { step: 'input' }
  | { step: 'checking' }
  | { step: 'install' }

export function UrlImportPopover({ anchorRef, onClose, onDetected }: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
  onDetected: (canonicalUrl: string) => void
}): React.JSX.Element {
  const [state, setState] = useState<PopoverState>({ step: 'input' })
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, left: rect.left })
    }
  }, [anchorRef])

  useEffect(() => {
    inputRef.current?.focus()
  }, [pos])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleSubmit = useCallback(async () => {
    setError(null)
    const result = parseYouTubeUrl(url.trim())
    if ('error' in result) {
      setError(result.error)
      return
    }

    setState({ step: 'checking' })
    const detected = await window.api.ytdlpDetect()
    if (detected) {
      onDetected(result.canonical)
    } else {
      setState({ step: 'install' })
    }
  }, [url, onDetected])

  const handleCheckAgain = useCallback(async () => {
    const detected = await window.api.ytdlpDetect()
    if (detected) {
      setState({ step: 'input' })
      setError(null)
      if (url.trim()) {
        const result = parseYouTubeUrl(url.trim())
        if ('canonical' in result) {
          onDetected(result.canonical)
          return
        }
      }
    }
  }, [url, onDetected])

  const handleBrowse = useCallback(async () => {
    const path = await window.api.selectDirectory()
    if (!path) return
    const detected = await window.api.ytdlpSetPath(path)
    if (detected) {
      setState({ step: 'input' })
      setError(null)
      if (url.trim()) {
        const result = parseYouTubeUrl(url.trim())
        if ('canonical' in result) {
          onDetected(result.canonical)
          return
        }
      }
    } else {
      setError('Selected file is not a valid yt-dlp binary')
    }
  }, [url, onDetected])

  if (!pos) return <div />

  const popoverClass = "fixed w-80 bg-[var(--bg)] border border-[var(--surface)] rounded-[12px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-4 z-[9999]"

  if (state.step === 'install') {
    return (
      <div
        ref={popoverRef}
        className={popoverClass}
        style={{ top: pos.top, left: pos.left }}
      >
        <h3 className="text-sm font-heading font-semibold text-[var(--text)] mb-2">yt-dlp required</h3>
        <p className="text-xs text-[var(--secondary)] mb-3">
          To import from YouTube, install yt-dlp:
        </p>
        <code className="block text-xs bg-[var(--surface)] rounded-[8px] px-3 py-2 text-[var(--text)] font-mono mb-3 select-all">
          brew install yt-dlp
        </code>
        <a
          href="https://github.com/yt-dlp/yt-dlp/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--accent)] hover:underline block mb-3"
        >
          yt-dlp releases on GitHub
        </a>
        <div className="flex gap-2">
          <button
            onClick={handleBrowse}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--surface)] text-[var(--text)] hover:bg-white/[0.08] transition-colors"
          >
            Browse...
          </button>
          <button
            onClick={handleCheckAgain}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            Check again
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div
      ref={popoverRef}
      className={popoverClass}
      style={{ top: pos.top, left: pos.left }}
    >
      <label className="block text-xs font-medium text-[var(--secondary)] mb-1.5">
        YouTube URL
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose() }}
          className="flex-1 px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--secondary)]"
          placeholder="https://youtube.com/watch?v=..."
          disabled={state.step === 'checking'}
        />
        <button
          onClick={handleSubmit}
          disabled={state.step === 'checking' || !url.trim()}
          className="px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.step === 'checking' ? '...' : 'Go'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
    </div>
  )
}
