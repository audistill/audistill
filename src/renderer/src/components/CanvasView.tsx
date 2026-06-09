import { useState, useEffect, useRef, useCallback } from 'react'
import Markdown from 'react-markdown'
import { useAppStore } from '../store/app-store'

type CanvasMode = 'source' | 'preview'

export function CanvasView({ episodeId }: { episodeId: string }): React.JSX.Element {
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<CanvasMode>('preview')
  const [loading, setLoading] = useState(true)
  const setActiveContentView = useAppStore((s) => s.setActiveContentView)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentEpisodeRef = useRef(episodeId)

  useEffect(() => {
    currentEpisodeRef.current = episodeId
    setLoading(true)
    window.api.canvasGetContent(episodeId).then((saved) => {
      if (currentEpisodeRef.current === episodeId) {
        setContent(saved)
        setLoading(false)
      }
    })
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [episodeId])

  useEffect(() => {
    const unsubWrite = window.api.onCanvasStreamWrite((data) => {
      if (data.episodeId === currentEpisodeRef.current) {
        setContent(data.content)
      }
    })

    const unsubDelta = window.api.onCanvasStreamDelta((data) => {
      setContent(data.content)
    })

    const unsubEdit = window.api.onCanvasEdit((data) => {
      if (data.episodeId === currentEpisodeRef.current) {
        setContent(data.content)
      }
    })

    return () => {
      unsubWrite()
      unsubDelta()
      unsubEdit()
    }
  }, [])

  const handleChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        window.api.canvasSaveContent(episodeId, newContent)
      }, 500)
    },
    [episodeId]
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-12 py-8">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex rounded-[12px] bg-[var(--surface)] p-1">
          <button
            onClick={() => setMode('preview')}
            className={`px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
              mode === 'preview'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--secondary)] hover:text-[var(--text)]'
            }`}
          >
            View
          </button>
          <button
            onClick={() => setMode('source')}
            className={`px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
              mode === 'source'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--secondary)] hover:text-[var(--text)]'
            }`}
          >
            Edit
          </button>
        </div>
        <button
          onClick={() => setActiveContentView('episode')}
          className="p-1.5 rounded-[8px] text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
          aria-label="Back to Episode"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Editor / Preview */}
      {mode === 'source' ? (
        <div className="flex-1 relative">
          <textarea
            className="w-full h-full resize-none bg-transparent text-sm text-[var(--text)] font-mono leading-relaxed outline-none placeholder:text-[var(--secondary)] placeholder:opacity-50"
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Ask the AI to create something, or start typing…"
            aria-label="Canvas editor"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {content ? (
            <div className="markdown-content text-sm text-[var(--text)] leading-relaxed">
              <Markdown>{content}</Markdown>
            </div>
          ) : (
            <p className="text-sm text-[var(--secondary)] opacity-50 italic">
              Ask the AI to create something, or start typing&hellip;
            </p>
          )}
        </div>
      )}
    </div>
  )
}
