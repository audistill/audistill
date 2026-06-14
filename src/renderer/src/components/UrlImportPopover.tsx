import { useState, useRef, useEffect, useCallback } from 'react'
import { parseYouTubeUrl } from '../../../shared/youtube-url'
import { classifyUrl, isSupportedMediaType } from '../../../shared/classify-url'

interface YouTubeMetadata {
  title: string
  channel: string
  duration: number
  thumbnail: string
  uploadDate: string
}

interface DirectMetadata {
  filename: string
  contentType: string
  fileSize: number | null
}

interface DuplicateEpisode {
  id: string
  title: string | null
}

type PopoverState =
  | { step: 'input' }
  | { step: 'checking' }
  | { step: 'install' }
  | { step: 'loading'; url: string }
  | { step: 'preview-youtube'; canonicalUrl: string; metadata: YouTubeMetadata }
  | { step: 'preview-direct'; url: string; metadata: DirectMetadata; title: string }
  | { step: 'duplicate'; episode: DuplicateEpisode }
  | { step: 'error'; message: string }

export function UrlImportPopover({ anchorRef, onClose, onImport, onImportDirect }: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
  onImport: (canonicalUrl: string, metadata: YouTubeMetadata) => void
  onImportDirect?: (url: string, metadata: { title: string; filename: string; contentType: string; fileSize: number | null }) => void
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

  const fetchYouTubePreview = useCallback(async (canonicalUrl: string) => {
    setState({ step: 'loading', url: canonicalUrl })

    const duplicate = await window.api.ytdlpCheckDuplicate(canonicalUrl)
    if (duplicate) {
      setState({ step: 'duplicate', episode: { id: duplicate.id, title: duplicate.title } })
      return
    }

    const result = await window.api.ytdlpFetchMetadata(canonicalUrl)
    if ('code' in result) {
      setState({ step: 'error', message: result.message })
    } else {
      setState({ step: 'preview-youtube', canonicalUrl, metadata: result })
    }
  }, [])

  const fetchDirectPreview = useCallback(async (inputUrl: string, contentType: string, contentLength: number | null) => {
    if (!isSupportedMediaType(contentType)) {
      const mime = contentType.split(';')[0].trim()
      setState({ step: 'error', message: `Unsupported format (${mime}). Supported: mp3, mp4, m4a, wav, ogg, webm, flac, aac, opus.` })
      return
    }

    const duplicate = await window.api.ytdlpCheckDuplicate(inputUrl)
    if (duplicate) {
      setState({ step: 'duplicate', episode: { id: duplicate.id, title: duplicate.title } })
      return
    }

    const pathname = new URL(inputUrl).pathname
    const filename = pathname.split('/').pop() || 'audio'
    const stem = filename.replace(/\.[^.]+$/, '')

    setState({
      step: 'preview-direct',
      url: inputUrl,
      metadata: { filename, contentType: contentType.split(';')[0].trim(), fileSize: contentLength },
      title: decodeURIComponent(stem),
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    setError(null)
    const trimmed = url.trim()
    if (!trimmed) return

    try {
      new URL(trimmed)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    const ytResult = parseYouTubeUrl(trimmed)
    if ('videoId' in ytResult) {
      setState({ step: 'checking' })
      const detected = await window.api.ytdlpDetect()
      if (detected) {
        fetchYouTubePreview(ytResult.canonical)
      } else {
        setState({ step: 'install' })
      }
      return
    }

    setState({ step: 'loading', url: trimmed })
    try {
      const head = await window.api.urlHead(trimmed)
      const contentType = head.contentType || ''
      const classification = classifyUrl(trimmed, contentType)

      switch (classification) {
        case 'youtube':
          fetchYouTubePreview(trimmed)
          break
        case 'direct':
          fetchDirectPreview(trimmed, contentType, head.contentLength)
          break
        case 'rss':
          setState({ step: 'error', message: 'RSS feed support coming soon.' })
          break
        case 'unsupported':
          setState({ step: 'error', message: 'Unsupported URL — paste a direct link to an audio/video file or an RSS feed.' })
          break
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch URL'
      setState({ step: 'error', message })
    }
  }, [url, fetchYouTubePreview, fetchDirectPreview])

  const handleCheckAgain = useCallback(async () => {
    const detected = await window.api.ytdlpDetect()
    if (detected) {
      setState({ step: 'input' })
      setError(null)
      if (url.trim()) {
        const result = parseYouTubeUrl(url.trim())
        if ('canonical' in result) {
          fetchYouTubePreview(result.canonical)
          return
        }
      }
    }
  }, [url, fetchYouTubePreview])

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
          fetchYouTubePreview(result.canonical)
          return
        }
      }
    } else {
      setError('Selected file is not a valid yt-dlp binary')
    }
  }, [url, fetchYouTubePreview])

  const handleTryAnother = useCallback(() => {
    setState({ step: 'input' })
    setUrl('')
    setError(null)
  }, [])

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

  if (state.step === 'loading') {
    return (
      <div
        ref={popoverRef}
        className={popoverClass}
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="flex items-center gap-3 py-2">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-sm text-[var(--secondary)]">Checking URL...</span>
        </div>
      </div>
    )
  }

  if (state.step === 'preview-youtube') {
    const { metadata, canonicalUrl } = state
    return (
      <div
        ref={popoverRef}
        className={popoverClass}
        style={{ top: pos.top, left: pos.left }}
      >
        {metadata.thumbnail && (
          <img
            src={metadata.thumbnail}
            alt=""
            className="w-full h-36 object-cover rounded-[8px] mb-3"
          />
        )}
        <h3 className="text-sm font-heading font-semibold text-[var(--text)] mb-1 line-clamp-2">
          {metadata.title}
        </h3>
        <p className="text-xs text-[var(--secondary)] mb-3">
          {metadata.channel} &middot; {formatDuration(metadata.duration)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--surface)] text-[var(--text)] hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onImport(canonicalUrl, metadata)}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            Import
          </button>
        </div>
      </div>
    )
  }

  if (state.step === 'preview-direct') {
    const { url: directUrl, metadata, title } = state
    return (
      <div
        ref={popoverRef}
        className={popoverClass}
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="mb-3">
          <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-[var(--surface)] text-[var(--secondary)] mb-2">
            {metadata.contentType}
          </span>
          <input
            type="text"
            defaultValue={title}
            className="block w-full px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const editedTitle = (e.target as HTMLInputElement).value.trim() || title
                onImportDirect?.(directUrl, { title: editedTitle, ...metadata })
              }
              if (e.key === 'Escape') onClose()
            }}
            ref={(el) => { if (el) setTimeout(() => el.focus(), 0) }}
            id="direct-title-input"
          />
          <p className="text-xs text-[var(--secondary)] mt-1.5">
            {metadata.filename}
            {metadata.fileSize ? ` · ${formatFileSize(metadata.fileSize)}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--surface)] text-[var(--text)] hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const input = document.getElementById('direct-title-input') as HTMLInputElement | null
              const editedTitle = input?.value.trim() || title
              onImportDirect?.(directUrl, { title: editedTitle, ...metadata })
            }}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            Import
          </button>
        </div>
      </div>
    )
  }

  if (state.step === 'duplicate') {
    return (
      <div
        ref={popoverRef}
        className={popoverClass}
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)] shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <h3 className="text-sm font-heading font-semibold text-[var(--text)]">Already imported</h3>
        </div>
        <p className="text-xs text-[var(--secondary)] mb-3">
          {state.episode.title || 'This file'} is already in your library.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleTryAnother}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--surface)] text-[var(--text)] hover:bg-white/[0.08] transition-colors"
          >
            Try another URL
          </button>
        </div>
      </div>
    )
  }

  if (state.step === 'error') {
    return (
      <div
        ref={popoverRef}
        className={popoverClass}
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="flex items-start gap-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-xs text-[var(--secondary)] leading-relaxed">
            {state.message}
          </p>
        </div>
        <button
          onClick={handleTryAnother}
          className="w-full px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--surface)] text-[var(--text)] hover:bg-white/[0.08] transition-colors"
        >
          Try another URL
        </button>
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
        Paste URL
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose() }}
          className="flex-1 px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--secondary)]"
          placeholder="YouTube, RSS feed, or audio/video URL"
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
