import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAppStore } from '../store/app-store'
import { parseTranscript, formatDuration } from '../lib/transcript-utils'

export function TranscriptPanel({ episodeId, transcript, duration }: { episodeId: string; transcript: string | null; duration: number | null }): React.JSX.Element {
  const transcriptPanelOpen = useAppStore((s) => s.transcriptPanelOpen)
  const transcriptPanelRatio = useAppStore((s) => s.transcriptPanelRatio)
  const setTranscriptPanelRatio = useAppStore((s) => s.setTranscriptPanelRatio)
  const toggleTranscriptPanel = useAppStore((s) => s.toggleTranscriptPanel)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)
  const [resizing, setResizing] = useState(false)

  const parentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const scrollPositionRef = useRef(0)

  const lines = useMemo(() => parseTranscript(transcript), [transcript])

  const matchingIndices = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return lines
      .map((line, i) => (line.text.toLowerCase().includes(q) ? i : -1))
      .filter((i) => i >= 0)
  }, [lines, searchQuery])

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  })

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    if (matchingIndices.length > 0 && activeMatchIndex < matchingIndices.length) {
      virtualizer.scrollToIndex(matchingIndices[activeMatchIndex], { align: 'center' })
    }
  }, [activeMatchIndex, matchingIndices, virtualizer])

  // Save scroll position when panel content changes
  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const handleScroll = (): void => {
      scrollPositionRef.current = el.scrollTop
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  // Restore scroll position when panel re-opens or tab switches
  useEffect(() => {
    if (transcriptPanelOpen && parentRef.current) {
      parentRef.current.scrollTop = scrollPositionRef.current
    }
  }, [transcriptPanelOpen])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setResizing(true)
      const startY = e.clientY
      const container = containerRef.current?.parentElement
      if (!container) return

      const containerHeight = container.getBoundingClientRect().height

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const delta = startY - moveEvent.clientY
        const newPanelHeight = transcriptPanelRatio * containerHeight + delta
        const newRatio = newPanelHeight / containerHeight
        setTranscriptPanelRatio(newRatio)
      }

      const handleMouseUp = (): void => {
        setResizing(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [transcriptPanelRatio, setTranscriptPanelRatio]
  )

  const navigateMatch = useCallback(
    (direction: 1 | -1) => {
      if (matchingIndices.length === 0) return
      setActiveMatchIndex((prev) => {
        const next = prev + direction
        if (next < 0) return matchingIndices.length - 1
        if (next >= matchingIndices.length) return 0
        return next
      })
    },
    [matchingIndices.length]
  )

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        navigateMatch(e.shiftKey ? -1 : 1)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
        setActiveMatchIndex(0)
      }
    },
    [navigateMatch]
  )

  if (!transcriptPanelOpen) return <></>

  const matchCountLabel = matchingIndices.length > 0
    ? `${activeMatchIndex + 1} of ${matchingIndices.length}`
    : searchQuery.trim() ? '0 results' : ''

  return (
    <div
      ref={containerRef}
      className="flex flex-col border-t border-[var(--surface)] bg-[var(--bg)]"
      style={{
        flex: `0 0 ${transcriptPanelRatio * 100}%`,
        minHeight: 120,
        transition: resizing ? 'none' : 'flex-basis 200ms ease-out',
      }}
    >
      {/* Resize handle */}
      <div
        className="h-[4px] shrink-0 cursor-row-resize group relative"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-[var(--surface)] group-hover:bg-[var(--accent)] group-active:bg-[var(--accent)] transition-[background-color] duration-150" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-1.5 shrink-0 border-b border-[var(--surface)]">
        <button
          onClick={toggleTranscriptPanel}
          className="p-0.5 rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
          aria-label="Collapse transcript panel"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <span className="text-xs font-medium text-[var(--text)]">Transcript</span>
        {duration && (
          <span className="text-xs text-[var(--secondary)]">{formatDuration(duration)}</span>
        )}

        <div className="flex-1" />

        {searchOpen && (
          <div className="flex items-center gap-1.5 bg-[var(--surface)] rounded px-2 py-0.5">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setActiveMatchIndex(0)
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search..."
              className="bg-transparent text-xs text-[var(--text)] outline-none w-32 placeholder:text-[var(--secondary)]"
            />
            {matchCountLabel && (
              <span className="text-xs text-[var(--secondary)] whitespace-nowrap">{matchCountLabel}</span>
            )}
            <button
              onClick={() => navigateMatch(-1)}
              className="p-0.5 text-[var(--secondary)] hover:text-[var(--text)]"
              aria-label="Previous match"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
            <button
              onClick={() => navigateMatch(1)}
              className="p-0.5 text-[var(--secondary)] hover:text-[var(--text)]"
              aria-label="Next match"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <button
              onClick={() => {
                setSearchOpen(false)
                setSearchQuery('')
                setActiveMatchIndex(0)
              }}
              className="p-0.5 text-[var(--secondary)] hover:text-[var(--text)]"
              aria-label="Close search"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className={`p-1 rounded transition-colors ${
            searchOpen ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
          }`}
          aria-label="Search transcript"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>

        <button
          onClick={() => window.api.exportCopyTranscript(episodeId, true)}
          className="p-1 rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
          aria-label="Copy transcript with timestamps"
          title="Copy with timestamps"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>

        <button
          onClick={() => window.api.exportCopyTranscript(episodeId, false)}
          className="p-1 rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
          aria-label="Copy transcript as plain text"
          title="Copy plain"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3" />
            <path d="M9 20h6" />
            <path d="M12 4v16" />
          </svg>
        </button>
      </div>

      {/* Virtualized transcript content */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto"
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const line = lines[virtualRow.index]
            const isMatch = matchingIndices.includes(virtualRow.index)
            const isActiveMatch = matchingIndices[activeMatchIndex] === virtualRow.index

            return (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex items-baseline gap-3 px-4 py-1 text-xs ${
                  isActiveMatch
                    ? 'bg-amber-500/20'
                    : isMatch
                      ? 'bg-amber-500/10'
                      : ''
                }`}
              >
                {line.timestamp && (
                  <span className="text-[var(--secondary)] font-mono shrink-0 w-14 text-right">
                    {line.timestamp}
                  </span>
                )}
                <span className="text-[var(--text)] leading-relaxed">
                  {isMatch ? (
                    <HighlightedText text={line.text} query={searchQuery} />
                  ) : (
                    line.text
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function HighlightedText({ text, query }: { text: string; query: string }): React.JSX.Element {
  if (!query.trim()) return <>{text}</>

  const parts: React.JSX.Element[] = []
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let lastIndex = 0

  let idx = lowerText.indexOf(lowerQuery)
  while (idx >= 0) {
    if (idx > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, idx)}</span>)
    }
    parts.push(
      <mark key={`m${idx}`} className="bg-amber-400/60 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
    )
    lastIndex = idx + query.length
    idx = lowerText.indexOf(lowerQuery, lastIndex)
  }
  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>)
  }
  return <>{parts}</>
}
