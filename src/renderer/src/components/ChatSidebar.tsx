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

interface ToolCallBlock {
  id: string
  name: string
  result?: string
}

interface StreamingState {
  content: string
  toolCalls: ToolCallBlock[]
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

const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'read_transcript',
      description: 'Read the full transcript text for an episode',
      parameters: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', description: 'Episode ID (defaults to current episode)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_transcript',
      description: 'Search the transcript for matching segments with timestamps',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          episode_id: { type: 'string', description: 'Episode ID (defaults to current episode)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_episodes',
      description: 'Search across all episodes by title and summary content',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_episodes',
      description: 'List all episodes with metadata, optionally filtered by folder',
      parameters: {
        type: 'object',
        properties: {
          folder_id: { type: 'string', description: 'Filter by folder ID' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_summary',
      description: 'Read a specific summary (brief, detailed, or full) for an episode',
      parameters: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', description: 'Episode ID (defaults to current episode)' },
          view_type: { type: 'string', enum: ['brief', 'detailed', 'full'], description: 'Summary view type' },
        },
        required: ['view_type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_episode_metadata',
      description: 'Read metadata (title, filename, duration, date, folder) for an episode',
      parameters: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', description: 'Episode ID (defaults to current episode)' },
        },
      },
    },
  },
]

function buildSystemPrompt(context: {
  episodeTitle: string
  fileName: string
  duration: string | null
  date: string
  activeSummary: string | null
  canvasContent: string | null
}): string {
  let prompt = `You are a helpful AI assistant for the Audistill podcast app. You help users understand, explore, and create content from their podcast episodes.

## Current Episode
- Title: ${context.episodeTitle}
- File: ${context.fileName}
${context.duration ? `- Duration: ${context.duration}` : ''}
- Date: ${context.date}
`

  if (context.activeSummary) {
    prompt += `
## Active Summary
${context.activeSummary}
`
  }

  if (context.canvasContent) {
    prompt += `
## Canvas Content
${context.canvasContent}
`
  }

  prompt += `
## Available Tools
You have access to tools for reading transcripts, searching content, and accessing episode data. Use them when the user asks questions about episode content, wants to find specific information, or needs data from other episodes.

When answering questions about the episode content, prefer using the search_transcript tool to find relevant segments rather than relying only on the summary.

Be concise and helpful. Format responses with markdown when appropriate.`

  return prompt
}

export function ChatSidebar(): React.JSX.Element {
  const activeTabId = useAppStore((s) => s.activeTabId)
  const episodes = useAppStore((s) => s.episodes)
  const summaries = useAppStore((s) => s.summaries)
  const activeContentView = useAppStore((s) => s.activeContentView)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamingState, setStreamingState] = useState<StreamingState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamingStateRef = useRef<StreamingState | null>(null)

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
  }, [messages, streamingState])

  useEffect(() => {
    const unsubToken = window.api.onChatStreamToken((token) => {
      setStreamingState((prev) => {
        const next = prev
          ? { ...prev, content: prev.content + token }
          : { content: token, toolCalls: [] }
        streamingStateRef.current = next
        return next
      })
    })

    const unsubToolStart = window.api.onChatToolCallStart((data) => {
      setStreamingState((prev) => {
        const next = prev
          ? { ...prev, toolCalls: [...prev.toolCalls, { id: data.id, name: data.name }] }
          : { content: '', toolCalls: [{ id: data.id, name: data.name }] }
        streamingStateRef.current = next
        return next
      })
    })

    const unsubToolResult = window.api.onChatToolCallResult((data) => {
      setStreamingState((prev) => {
        if (!prev) return prev
        const next = {
          ...prev,
          toolCalls: prev.toolCalls.map((tc) =>
            tc.id === data.id ? { ...tc, result: data.result } : tc
          ),
        }
        streamingStateRef.current = next
        return next
      })
    })

    const unsubEnd = window.api.onChatStreamEnd((data) => {
      const prev = streamingStateRef.current
      setStreaming(false)
      setStreamingState(null)
      streamingStateRef.current = null

      if (!prev) return
      const finalContent = data.content || prev.content
      const toolCallsJson = prev.toolCalls.length > 0 ? JSON.stringify(prev.toolCalls) : null

      const episodeId = useAppStore.getState().activeTabId
      if (episodeId && finalContent) {
        window.api.chatSaveMessage(episodeId, 'assistant', finalContent, toolCallsJson).then((id) => {
          const msg: ChatMessage = {
            id,
            role: 'assistant',
            content: finalContent,
            toolCalls: toolCallsJson,
            createdAt: new Date().toISOString(),
          }
          setMessages((msgs) => [...msgs, msg])
        })
      }
    })

    const unsubError = window.api.onChatError((message) => {
      setStreaming(false)
      setStreamingState(null)
      setError(message)
    })

    return () => {
      unsubToken()
      unsubToolStart()
      unsubToolResult()
      unsubEnd()
      unsubError()
    }
  }, [])

  const handleSend = async (): Promise<void> => {
    const trimmed = input.trim()
    if (!trimmed || !activeTabId || streaming) return

    setInput('')
    setError(null)

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

    const episode = episodes.find((e) => e.id === activeTabId)
    if (!episode) return

    const fileName = episode.file_path.split('/').pop() || episode.file_path
    const episodeSummaries = summaries[activeTabId]
    let activeSummary: string | null = null
    if (activeContentView === 'episode' && episodeSummaries) {
      for (const viewType of ['brief', 'detailed', 'full'] as const) {
        const entry = episodeSummaries[viewType]
        if (entry?.status === 'complete' && entry.content) {
          activeSummary = entry.content
          break
        }
      }
    }

    const model = (await window.api.getSetting('summarization_model')) || 'google/gemini-3.5-flash'

    const allMessages = [...messages, newMessage]
    const chatMessages = allMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    const systemPrompt = buildSystemPrompt({
      episodeTitle: episode.title || fileName,
      fileName,
      duration: episode.duration_sec ? formatDuration(episode.duration_sec) : null,
      date: episode.created_at,
      activeSummary,
      canvasContent: null,
    })

    setStreaming(true)
    setStreamingState({ content: '', toolCalls: [] })

    window.api.chatSendMessage({
      model,
      systemPrompt,
      messages: chatMessages,
      tools: TOOL_DEFINITIONS,
      episodeId: activeTabId,
    })
  }

  const handleStop = (): void => {
    window.api.chatAbort()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = async (): Promise<void> => {
    if (!activeTabId || streaming) return
    await window.api.chatClearMessages(activeTabId)
    setMessages([])
    setError(null)
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
          disabled={streaming}
          className="p-1.5 rounded-[8px] text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors disabled:opacity-30"
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

        {!loading && messages.length === 0 && !streaming && (
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

        {streamingState && (
          <StreamingBubble state={streamingState} />
        )}

        {error && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-[12px] bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

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
            disabled={streaming}
            className="flex-1 bg-transparent outline-none resize-none text-sm text-[var(--text)] placeholder-[var(--secondary)] max-h-[120px] disabled:opacity-50"
          />
          {streaming ? (
            <button
              onClick={handleStop}
              className="shrink-0 p-1.5 rounded-[8px] text-red-400 hover:bg-white/[0.06] transition-colors"
              title="Stop generation"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 p-1.5 rounded-[8px] text-[var(--accent)] disabled:opacity-30 hover:bg-white/[0.06] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StreamingBubble({ state }: { state: StreamingState }): React.JSX.Element {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-[12px] bg-[var(--surface)] px-3 py-2 space-y-2">
        {state.toolCalls.map((tc) => (
          <ToolCallDisplay key={tc.id} toolCall={tc} />
        ))}
        {state.content ? (
          <div className="text-sm text-[var(--text)] markdown-content break-words">
            <Markdown>{state.content}</Markdown>
          </div>
        ) : state.toolCalls.length === 0 ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse [animation-delay:300ms]" />
          </div>
        ) : null}
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

  const toolCalls: ToolCallBlock[] = message.toolCalls ? JSON.parse(message.toolCalls) : []

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-[12px] bg-[var(--surface)] px-3 py-2 space-y-2">
        {toolCalls.map((tc) => (
          <ToolCallDisplay key={tc.id} toolCall={tc} />
        ))}
        {message.content && (
          <div className="text-sm text-[var(--text)] markdown-content break-words">
            <Markdown>{message.content}</Markdown>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolCallDisplay({ toolCall }: { toolCall: ToolCallBlock }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  const toolLabel = toolCall.name.replace(/_/g, ' ')
  let resultSummary = ''
  if (toolCall.result) {
    try {
      const parsed = JSON.parse(toolCall.result)
      if (parsed.error) {
        resultSummary = `Error: ${parsed.error}`
      } else if (parsed.matches) {
        resultSummary = `${parsed.matches.length} match${parsed.matches.length !== 1 ? 'es' : ''} found`
      } else if (parsed.results) {
        resultSummary = `${parsed.results.length} result${parsed.results.length !== 1 ? 's' : ''}`
      } else if (parsed.transcript) {
        resultSummary = `${parsed.transcript.length} characters`
      } else if (parsed.content) {
        resultSummary = `${parsed.content.length} characters`
      } else {
        resultSummary = 'Done'
      }
    } catch {
      resultSummary = 'Done'
    }
  }

  return (
    <div className="rounded-[8px] bg-white/[0.04] border border-white/[0.06]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-[var(--secondary)] transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="text-xs text-[var(--secondary)] font-medium">{toolLabel}</span>
        {toolCall.result ? (
          <span className="text-xs text-[var(--secondary)] opacity-60 ml-auto">{resultSummary}</span>
        ) : (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
        )}
      </button>
      {expanded && toolCall.result && (
        <div className="px-2.5 pb-2 border-t border-white/[0.04]">
          <pre className="text-xs text-[var(--secondary)] whitespace-pre-wrap break-all mt-1.5 max-h-[200px] overflow-y-auto">
            {toolCall.result}
          </pre>
        </div>
      )}
    </div>
  )
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
