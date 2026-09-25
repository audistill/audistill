import { useState, useCallback, useRef, useEffect } from 'react'
import { RichMarkdown } from './RichMarkdown'
import { useContentTabStore } from '../store/content-tab-store'
import { useAppStore } from '../store/app-store'
import type { TabExportFormat } from '../../../shared/tab-export'

type CopyState = 'idle' | 'copied'
type ExportState = 'idle' | 'exporting' | 'saved' | 'error'

function CopyButton({ content, disabled }: { content: string; disabled: boolean }): React.JSX.Element {
  const [state, setState] = useState<CopyState>('idle')

  const handleCopy = async () => {
    if (disabled || !content) return
    await window.api.exportCopyTab(content)
    setState('copied')
    setTimeout(() => setState('idle'), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      disabled={disabled || !content}
      className={`p-1.5 rounded-md transition-colors ${
        disabled || !content
          ? 'text-[var(--secondary)] opacity-40 cursor-not-allowed'
          : state === 'copied'
            ? 'text-emerald-400'
            : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
      }`}
      aria-label="Copy to clipboard"
      title="Copy to clipboard"
    >
      {state === 'copied' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}

function ExportButton({
  content,
  episodeTitle,
  tabName,
  disabled,
}: {
  content: string
  episodeTitle: string
  tabName: string
  disabled: boolean
}): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const [state, setState] = useState<ExportState>('idle')
  const [feedback, setFeedback] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const markdownRef = useRef<HTMLButtonElement>(null)
  const pdfRef = useRef<HTMLButtonElement>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
  }, [])

  const dismissMenu = useCallback(() => {
    setMenuOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    markdownRef.current?.focus()

    const handleOutsidePointer = (event: MouseEvent): void => {
      if (!wrapperRef.current?.contains(event.target as Node)) dismissMenu()
    }
    document.addEventListener('mousedown', handleOutsidePointer)
    return () => document.removeEventListener('mousedown', handleOutsidePointer)
  }, [dismissMenu, menuOpen])

  const openMenu = (): void => {
    if (disabled || !content || state === 'exporting') return
    setFeedback('')
    setState('idle')
    setMenuOpen(true)
  }

  const showFeedback = (nextState: 'saved' | 'error', message: string): void => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    setState(nextState)
    setFeedback(message)
    feedbackTimerRef.current = setTimeout(() => {
      setState('idle')
      setFeedback('')
    }, nextState === 'saved' ? 1800 : 4000)
  }

  const exportFormat = (format: TabExportFormat): void => {
    dismissMenu()
    setState('exporting')
    setFeedback('')
    queueMicrotask(() => {
      void window.api.exportTab({
        format,
        content,
        episodeTitle,
        tabName,
      })
        .then((result) => {
          if (result.status === 'cancelled') {
            setState('idle')
            return
          }
          showFeedback('saved', format === 'pdf' ? 'PDF exported' : 'Markdown exported')
        })
        .catch((error: unknown) => {
          const formatName = format === 'pdf' ? 'PDF' : 'Markdown'
          const detail = error instanceof Error ? error.message.trim() : ''
          showFeedback(
            'error',
            detail ? `Couldn't export ${formatName}: ${detail}` : `Couldn't export ${formatName}. Try again.`
          )
        })
    })
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    openMenu()
  }

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      dismissMenu()
      return
    }
    if (event.key === 'Enter' && event.target === markdownRef.current) {
      event.preventDefault()
      exportFormat('markdown')
      return
    }
    if (event.key === 'Enter' && event.target === pdfRef.current) {
      event.preventDefault()
      exportFormat('pdf')
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const items = [markdownRef.current, pdfRef.current].filter(
        (item): item is HTMLButtonElement => item !== null
      )
      const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex = (currentIndex + direction + items.length) % items.length
      items[nextIndex]?.focus()
    }
  }

  const isUnavailable = disabled || !content || state === 'exporting'

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        onClick={() => (menuOpen ? dismissMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        disabled={isUnavailable}
        className={`p-1.5 rounded-md transition-colors ${
          isUnavailable
            ? 'text-[var(--secondary)] opacity-40 cursor-not-allowed'
            : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
        }`}
        aria-label={state === 'exporting' ? 'Exporting Tab' : 'Export Tab'}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={state === 'exporting' ? 'Exporting Tab' : 'Export Tab'}
      >
        {state === 'exporting' ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-5.2-8.2" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
      </button>
      {menuOpen && (
        <div
          role="menu"
          aria-label="Export format"
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        >
          <button
            ref={markdownRef}
            role="menuitem"
            onClick={() => exportFormat('markdown')}
            className="flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left hover:bg-white/[0.08] focus:bg-white/[0.08] focus:outline-none"
          >
            <span className="text-xs font-medium text-[var(--text)]">Markdown (.md)</span>
            <span className="text-[11px] text-[var(--secondary)]">Editable source</span>
          </button>
          <button
            ref={pdfRef}
            role="menuitem"
            onClick={() => exportFormat('pdf')}
            className="flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left hover:bg-white/[0.08] focus:bg-white/[0.08] focus:outline-none"
          >
            <span className="text-xs font-medium text-[var(--text)]">PDF (.pdf)</span>
            <span className="text-[11px] text-[var(--secondary)]">Formatted for sharing</span>
          </button>
        </div>
      )}
      {state === 'saved' && feedback && (
        <div role="status" className="absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-emerald-500 shadow-lg">
          {feedback}
        </div>
      )}
      {state === 'error' && feedback && (
        <div role="alert" className="absolute left-0 top-full z-50 mt-1 w-52 rounded-md border border-red-500/30 bg-[var(--surface)] px-2.5 py-1.5 text-xs text-red-400 shadow-lg">
          {feedback}
        </div>
      )}
    </div>
  )
}

function RegenerateButton({
  episodeId,
  tabId,
  disabled,
}: {
  episodeId: string
  tabId: string
  disabled: boolean
}): React.JSX.Element {
  const regenerateTab = useContentTabStore((s) => s.regenerateTab)

  const handleRegenerate = async () => {
    if (disabled) return
    await regenerateTab(episodeId, tabId)
  }

  return (
    <button
      onClick={handleRegenerate}
      disabled={disabled}
      className={`p-1.5 rounded-md transition-colors ${
        disabled
          ? 'text-[var(--secondary)] opacity-40 cursor-not-allowed'
          : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
      }`}
      aria-label="Regenerate"
      title="Regenerate with current recipe"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </button>
  )
}

function formatGeneratedDate(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function TabProvenance({
  generatedAt,
  generatedModel,
}: {
  generatedAt: string | null
  generatedModel: string | null
}): React.JSX.Element | null {
  const model = generatedModel?.trim()
  if (!generatedAt || !model) return null

  const date = formatGeneratedDate(generatedAt)
  if (!date) return null

  const label = `Generated ${date} · ${model}`
  return (
    <span
      className="ml-2 min-w-0 max-w-[42vw] truncate text-xs text-[var(--secondary)]"
      title={label}
      aria-label={label}
    >
      {label}
    </span>
  )
}

function getStreamableContent(raw: string): string | null {
  const separatorIdx = raw.indexOf('\n---\n')
  if (separatorIdx === -1) return null
  return raw.slice(separatorIdx + 5)
}

export function TabContentView(): React.JSX.Element {
  const tabs = useContentTabStore((s) => s.tabs)
  const activeTabId = useContentTabStore((s) => s.activeTabId)
  const streamingTabId = useContentTabStore((s) => s.streamingTabId)
  const updateContent = useContentTabStore((s) => s.updateContent)
  const [editMode, setEditMode] = useState(false)

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isStreaming = streamingTabId === activeTabId
  const episodeTitle = useAppStore(
    (s) => s.episodes.find((e) => e.id === activeTab?.episode_id)?.title ?? 'untitled'
  )

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--secondary)] text-sm">
        No tab selected
      </div>
    )
  }

  if (isStreaming) {
    const streamContent = getStreamableContent(activeTab.content)
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-1.5">
          <div className="flex min-w-0 items-center">
            <CopyButton content="" disabled={true} />
            <ExportButton content="" episodeTitle={episodeTitle} tabName={activeTab.tab_name} disabled={true} />
            {activeTab.recipe_id && (
              <RegenerateButton episodeId={activeTab.episode_id} tabId={activeTab.id} disabled={true} />
            )}
          </div>
          <div className="inline-flex shrink-0 rounded-[8px] bg-[var(--surface)] p-0.5">
            <button className="px-3 py-1 rounded-[6px] text-xs font-medium bg-[var(--accent)] text-white">
              View
            </button>
            <button className="px-3 py-1 rounded-[6px] text-xs font-medium text-[var(--secondary)]">
              Edit
            </button>
          </div>
        </div>
        {streamContent ? (
          <div className="flex-1 overflow-y-auto px-12 py-4">
            <div className="markdown-content text-sm text-[var(--text)] leading-relaxed">
              <RichMarkdown content={streamContent} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--secondary)]">Generating&hellip;</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-1.5">
        <div className="flex min-w-0 items-center">
          <CopyButton content={activeTab.content} disabled={false} />
          <ExportButton content={activeTab.content} episodeTitle={episodeTitle} tabName={activeTab.tab_name} disabled={false} />
          {activeTab.recipe_id && (
            <RegenerateButton episodeId={activeTab.episode_id} tabId={activeTab.id} disabled={false} />
          )}
          <TabProvenance
            generatedAt={activeTab.generated_at}
            generatedModel={activeTab.generated_model}
          />
        </div>
        <div className="inline-flex shrink-0 rounded-[8px] bg-[var(--surface)] p-0.5">
          <button
            onClick={() => setEditMode(false)}
            className={`px-3 py-1 rounded-[6px] text-xs font-medium transition-colors ${
              !editMode
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--secondary)] hover:text-[var(--text)]'
            }`}
          >
            View
          </button>
          <button
            onClick={() => setEditMode(true)}
            className={`px-3 py-1 rounded-[6px] text-xs font-medium transition-colors ${
              editMode
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--secondary)] hover:text-[var(--text)]'
            }`}
          >
            Edit
          </button>
        </div>
      </div>

      {editMode ? (
        <TabEditor
          tabId={activeTab.id}
          content={activeTab.content}
          onUpdate={updateContent}
        />
      ) : (
        <TabPreview content={activeTab.content} />
      )}
    </div>
  )
}

function TabEditor({
  tabId,
  content,
  onUpdate,
}: {
  tabId: string
  content: string
  onUpdate: (tabId: string, content: string) => void
}): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(tabId, e.target.value)
    },
    [tabId, onUpdate]
  )

  // Auto-resize textarea to fit content so the outer div owns scrolling
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [content])

  return (
    <div className="flex-1 overflow-y-auto px-12 py-4">
      <textarea
        ref={textareaRef}
        className="w-full resize-none overflow-hidden bg-transparent text-sm text-[var(--text)] font-mono leading-relaxed outline-none placeholder:text-[var(--secondary)] placeholder:opacity-50"
        value={content}
        onChange={handleChange}
        placeholder="Start typing, or ask the AI to generate something..."
        spellCheck={false}
      />
    </div>
  )
}

function TabPreview({ content }: { content: string }): React.JSX.Element {
  if (!content) {
    return (
      <div className="flex-1 flex items-center justify-center px-12">
        <p className="text-sm text-[var(--secondary)] opacity-50 italic">
          Start typing, or ask the AI to generate something&hellip;
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-12 py-4">
      <div className="markdown-content text-sm text-[var(--text)] leading-relaxed">
        <RichMarkdown content={content} />
      </div>
    </div>
  )
}
