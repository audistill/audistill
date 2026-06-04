import { useState, useEffect, useRef, useCallback } from 'react'
import Markdown from 'react-markdown'
import { useAppStore } from '../store/app-store'
import type { DbChatMessage } from '../../../preload/index.d'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls: string | null
  createdAt: string
}

function dbMessageToMessage(row: DbChatMessage): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    toolCalls: row.tool_calls,
    createdAt: row.created_at,
  }
}

export function ChatSidebar(): React.JSX.Element {
  const activeTabId = useAppStore((s) => s.activeTabId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadMessages = useCallback(async (episodeId: string) => {
    setLoading(true)
    const rows = await window.api.chatGetMessages(episodeId)
    setMessages(rows.map(dbMessageToMessage))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (activeTabId) {
      loadMessages(activeTabId)
    } else {
      setMessages([])
    }
  }, [activeTabId, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (): Promise<void> => {
    const trimmed = input.trim()
    if (!trimmed || !activeTabId) return

    setInput('')

    const id = await window.api.chatSaveMessage(activeTabId, 'user', trimmed)
    const newMessage: ChatMessage = {
      id,
      role: 'user',
      content: trimmed,
      toolCalls: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMessage])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = async (): Promise<void> => {
    if (!activeTabId) return
    await window.api.chatClearMessages(activeTabId)
    setMessages([])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  if (!activeTabId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[var(--secondary)]">Select an episode to chat</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--surface)]">
        <span className="font-heading text-sm font-semibold text-[var(--text)]">Chat</span>
        <button
          onClick={handleClear}
          className="p-1.5 rounded-[8px] text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
          title="Clear chat"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-8">
            <p className="text-sm text-[var(--secondary)]">Loading...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--surface)] flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--secondary)]">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--secondary)]">No messages yet</p>
            <p className="text-xs text-[var(--secondary)] mt-1 opacity-60">Ask about this episode</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[var(--surface)]">
        <div className="flex items-end gap-2 rounded-[12px] bg-[var(--surface)] px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this episode..."
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm text-[var(--text)] placeholder-[var(--secondary)] max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0 p-1.5 rounded-[8px] text-[var(--accent)] disabled:opacity-30 hover:bg-white/[0.06] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }): React.JSX.Element {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[12px] bg-[var(--accent)] px-3 py-2">
          <p className="text-sm text-white whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-[12px] bg-[var(--surface)] px-3 py-2">
        <div className="text-sm text-[var(--text)] markdown-content break-words">
          <Markdown>{message.content}</Markdown>
        </div>
      </div>
    </div>
  )
}
