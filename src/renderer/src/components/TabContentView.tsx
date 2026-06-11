import { useState, useCallback, useRef } from 'react'
import Markdown from 'react-markdown'
import { useContentTabStore } from '../store/content-tab-store'

type CopyState = 'idle' | 'copied'

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
        <div className="flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center">
            <CopyButton content="" disabled={true} />
          </div>
          <div className="inline-flex rounded-[8px] bg-[var(--surface)] p-0.5">
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
              <Markdown>{streamContent}</Markdown>
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
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center">
          <CopyButton content={activeTab.content} disabled={false} />
        </div>
        <div className="inline-flex rounded-[8px] bg-[var(--surface)] p-0.5">
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
  const localRef = useRef(content)
  localRef.current = content

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(tabId, e.target.value)
    },
    [tabId, onUpdate]
  )

  return (
    <div className="flex-1 overflow-y-auto px-12 py-4">
      <textarea
        className="w-full h-full min-h-[300px] resize-none bg-transparent text-sm text-[var(--text)] font-mono leading-relaxed outline-none placeholder:text-[var(--secondary)] placeholder:opacity-50"
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
        <Markdown>{content}</Markdown>
      </div>
    </div>
  )
}
