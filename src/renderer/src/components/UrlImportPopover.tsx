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

interface FeedItem {
  title: string
  enclosureUrl: string
  guid: string | null
  pubDate: string | null
  duration: string | null
  description: string | null
}

interface FeedPreview {
  title: string
  image: string | null
  feedUrl: string
  items: FeedItem[]
}

type PopoverState =
  | { step: 'input' }
  | { step: 'checking' }
  | { step: 'install' }
  | { step: 'loading'; url: string }
  | { step: 'preview-youtube'; canonicalUrl: string; metadata: YouTubeMetadata }
  | { step: 'preview-direct'; url: string; metadata: DirectMetadata; title: string }
  | { step: 'preview-list'; feed: FeedPreview }
  | { step: 'duplicate'; episode: DuplicateEpisode }
  | { step: 'error'; message: string }

export function UrlImportPopover({ anchorRef, onClose, onImport, onImportDirect, onImportRss }: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
  onImport: (canonicalUrl: string, metadata: YouTubeMetadata) => void
  onImportDirect?: (url: string, metadata: { title: string; filename: string; contentType: string; fileSize: number | null }) => void
  onImportRss?: (items: { title: string; enclosureUrl: string; guid: string | null; feedUrl: string; feedTitle: string; feedImage: string | null; pubDate: string | null; description: string | null; duration: string | null }[]) => void
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

    const existingUrls = await window.api.checkDuplicates([inputUrl])
    if (existingUrls.length > 0) {
      setState({ step: 'duplicate', episode: { id: '', title: null } })
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
          try {
            const feed = await window.api.feedFetchMetadata(trimmed)
            if (feed.items.length === 0) {
              setState({ step: 'error', message: 'This feed has no episodes with audio files.' })
            } else {
              setState({ step: 'preview-list', feed })
            }
          } catch (feedErr) {
            const msg = feedErr instanceof Error ? feedErr.message : 'Failed to parse feed'
            setState({ step: 'error', message: msg })
          }
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

  if (state.step === 'preview-list') {
    return (
      <RssPreviewList
        feed={state.feed}
        popoverRef={popoverRef}
        popoverClass={popoverClass}
        pos={pos}
        onClose={onClose}
        onImport={(selectedItems) => {
          onImportRss?.(selectedItems.map((item) => ({
            title: item.title,
            enclosureUrl: item.enclosureUrl,
            guid: item.guid,
            feedUrl: state.feed.feedUrl,
            feedTitle: state.feed.title,
            feedImage: state.feed.image,
            pubDate: item.pubDate,
            description: item.description,
            duration: item.duration,
          })))
          onClose()
        }}
      />
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

const DEFAULT_VISIBLE_ITEMS = 50

function RssPreviewList({ feed, popoverRef, popoverClass, pos, onClose, onImport }: {
  feed: FeedPreview
  popoverRef: React.RefObject<HTMLDivElement | null>
  popoverClass: string
  pos: { top: number; left: number }
  onClose: () => void
  onImport: (items: FeedItem[]) => void
}): React.JSX.Element {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [duplicateUrls, setDuplicateUrls] = useState<Set<string>>(new Set())

  useEffect(() => {
    const urls = feed.items.map((item) => item.enclosureUrl)
    window.api.checkDuplicates(urls).then((existing) => {
      setDuplicateUrls(new Set(existing))
    })
  }, [feed])

  const visibleItems = showAll ? feed.items : feed.items.slice(0, DEFAULT_VISIBLE_ITEMS)
  const hasMore = feed.items.length > DEFAULT_VISIBLE_ITEMS

  const selectableIndices = visibleItems
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => !duplicateUrls.has(item.enclosureUrl))
    .map(({ i }) => i)

  const toggleItem = (index: number) => {
    if (duplicateUrls.has(visibleItems[index].enclosureUrl)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === selectableIndices.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableIndices))
    }
  }

  return (
    <div
      ref={popoverRef}
      className={`${popoverClass} !w-96 max-h-[480px] flex flex-col`}
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="flex items-center gap-3 mb-3 shrink-0">
        {feed.image && (
          <img src={feed.image} alt="" className="w-10 h-10 rounded-[6px] object-cover" />
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-heading font-semibold text-[var(--text)] truncate">
            {feed.title}
          </h3>
          <p className="text-[10px] text-[var(--secondary)]">
            {feed.items.length} episodes
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 shrink-0">
        <button
          onClick={toggleAll}
          className="text-[10px] text-[var(--accent)] hover:underline"
        >
          {selected.size === visibleItems.length ? 'Deselect all' : 'Select all'}
        </button>
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[10px] text-[var(--accent)] hover:underline"
          >
            Show all ({feed.items.length})
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 -mx-1 px-1 min-h-0">
        {visibleItems.map((item, index) => {
          const isDuplicate = duplicateUrls.has(item.enclosureUrl)
          return (
            <label
              key={item.enclosureUrl}
              className={`flex items-start gap-2 py-1.5 px-1 rounded ${isDuplicate ? 'opacity-40 cursor-default' : 'hover:bg-white/[0.04] cursor-pointer'}`}
            >
              <input
                type="checkbox"
                checked={selected.has(index)}
                onChange={() => toggleItem(index)}
                disabled={isDuplicate}
                className="mt-0.5 rounded border-[var(--surface)] accent-[var(--accent)] disabled:opacity-50"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--text)] truncate">
                  {item.title}
                  {isDuplicate && <span className="ml-1 text-[10px] text-[var(--secondary)]">(imported)</span>}
                </p>
                <p className="text-[10px] text-[var(--secondary)]">
                  {item.pubDate ? formatDate(item.pubDate) : ''}
                  {item.duration ? ` · ${item.duration}` : ''}
                </p>
              </div>
            </label>
          )
        })}
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--surface)] shrink-0">
        <button
          onClick={onClose}
          className="flex-1 px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--surface)] text-[var(--text)] hover:bg-white/[0.08] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            const selectedItems = [...selected].map((i) => visibleItems[i])
            onImport(selectedItems)
          }}
          disabled={selected.size === 0}
          className="flex-1 px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import {selected.size > 0 ? `(${selected.size})` : ''}
        </button>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
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
