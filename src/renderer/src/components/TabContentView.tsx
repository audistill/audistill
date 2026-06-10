import { useState, useCallback, useRef } from 'react'
import Markdown from 'react-markdown'
import { useContentTabStore } from '../store/content-tab-store'

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
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-end px-4 py-1.5">
          <div className="inline-flex rounded-[8px] bg-[var(--surface)] p-0.5">
            <button className="px-3 py-1 rounded-[6px] text-xs font-medium bg-[var(--accent)] text-white">
              View
            </button>
            <button className="px-3 py-1 rounded-[6px] text-xs font-medium text-[var(--secondary)]">
              Edit
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--secondary)]">Generating&hellip;</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-end px-4 py-1.5">
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
