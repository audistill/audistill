import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { RichMarkdown } from './RichMarkdown'
import { useAppStore } from '../store/app-store'
import { useContentTabStore } from '../store/content-tab-store'
import { useOpenRouterModels, type ModelOption } from '../lib/use-openrouter-models'
import { isLicenseError } from './LicenseBlockedPrompt'
import { FORMATTING_INSTRUCTIONS } from '../../../shared/formatting-instructions'
import type { DbChatMessage } from '../../../preload/index.d'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls: string | null
  createdAt: string
}

interface SlashRecipe {
  id: string
  name: string
  is_builtin: number
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
      description: 'Search across all episodes by title, transcript, and tab content. Returns matched_in field and snippet.',
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
      description: 'Read the content of a tab (summary or other generated content) for an episode. Can look up by tab name or legacy view type.',
      parameters: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', description: 'Episode ID (defaults to current episode)' },
          tab_name: { type: 'string', description: 'Name of the tab to read (e.g. "Brief", "Detailed Notes")' },
          view_type: { type: 'string', enum: ['brief', 'detailed', 'full'], description: 'Legacy summary view type (maps to tab names)' },
        },
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
  {
    type: 'function' as const,
    function: {
      name: 'write_tab',
      description: 'Write content to a tab. Creates the tab if it does not exist, then switches to it. Use this when the user asks you to write, draft, or create something (show notes, blog posts, summaries, etc.)',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Full markdown content to write to the tab' },
          tab_name: { type: 'string', description: 'Name of the tab to write to (defaults to "Canvas")' },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_tab',
      description: 'Make a targeted edit to a tab\'s content by finding and replacing specific text. Use this when the user asks to change, update, or modify a specific part of a tab.',
      parameters: {
        type: 'object',
        properties: {
          old_text: { type: 'string', description: 'The exact text to find in the tab' },
          new_text: { type: 'string', description: 'The replacement text' },
          tab_name: { type: 'string', description: 'Name of the tab to edit (defaults to "Canvas")' },
        },
        required: ['old_text', 'new_text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'navigate_tab',
      description: 'Switch the active tab to a specific tab by name',
      parameters: {
        type: 'object',
        properties: {
          tab_name: { type: 'string', description: 'The name of the tab to switch to' },
        },
        required: ['tab_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'grep_transcripts',
      description: 'Search across all episodes\' transcripts for a term or regex pattern. Returns matches with surrounding context segments.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Search term or regex pattern' },
          is_regex: { type: 'boolean', description: 'Treat pattern as a regex (default: false)' },
          context_segments: { type: 'number', description: 'Number of segments before/after match to include (default: 2)' },
          episode_ids: { type: 'array', items: { type: 'string' }, description: 'Limit search to specific episode IDs' },
          folder_id: { type: 'string', description: 'Limit search to a specific folder' },
          max_results: { type: 'number', description: 'Maximum results to return (default: 20)' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_transcript_range',
      description: 'Read a slice of the transcript by segment index or timestamp range. Use this instead of read_transcript for long episodes.',
      parameters: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', description: 'Episode ID (defaults to current episode)' },
          start: { type: 'string', description: 'Segment index (e.g. "10") or timestamp (e.g. "00:15:00")' },
          end: { type: 'string', description: 'End segment index or timestamp (optional, uses limit if omitted)' },
          limit: { type: 'number', description: 'Max segments to return (default: 50)' },
        },
        required: ['start'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'filter_episodes',
      description: 'Filter episodes by structured metadata: folder, date range, duration, source type, or transcript presence. All filters combine as AND.',
      parameters: {
        type: 'object',
        properties: {
          folder_id: { type: 'string', description: 'Filter to folder ID; null for Inbox only' },
          date_from: { type: 'string', description: 'ISO date, episodes on or after' },
          date_to: { type: 'string', description: 'ISO date, episodes on or before' },
          duration_min: { type: 'number', description: 'Minimum duration in seconds' },
          duration_max: { type: 'number', description: 'Maximum duration in seconds' },
          source_type: { type: 'string', description: 'One of: local, youtube, rss, direct' },
          has_transcript: { type: 'boolean', description: 'Filter to episodes with/without transcripts' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_folders',
      description: 'List all folders in the library with their IDs, names, and parent folder IDs',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_folder',
      description: 'Create a new folder in the library',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Folder name' },
          parent_id: { type: 'string', description: 'Parent folder ID for nesting (optional)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_episode',
      description: 'Move an episode to a folder, or back to Inbox with null folder_id',
      parameters: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', description: 'Episode ID (defaults to current episode)' },
          folder_id: { type: 'string', description: 'Target folder ID, or null for Inbox' },
        },
        required: ['folder_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'rename_episode',
      description: 'Rename an episode',
      parameters: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', description: 'Episode ID (defaults to current episode)' },
          title: { type: 'string', description: 'New title for the episode' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_recipes',
      description: 'List all available recipes with their IDs, names, and whether they are built-in',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_recipe',
      description: 'Create a new custom recipe template',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Recipe name' },
          prompt: { type: 'string', description: 'The prompt template for the recipe' },
          model_override: { type: 'string', description: 'Optional model override for this recipe' },
        },
        required: ['name', 'prompt'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_recipe',
      description: 'Update an existing custom recipe. Cannot update built-in recipes.',
      parameters: {
        type: 'object',
        properties: {
          recipe_id: { type: 'string', description: 'The recipe ID to update' },
          name: { type: 'string', description: 'New name (optional)' },
          prompt: { type: 'string', description: 'New prompt template (optional)' },
          model_override: { type: 'string', description: 'New model override (optional)' },
        },
        required: ['recipe_id'],
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
  tabsContext: string | null
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

  if (context.tabsContext) {
    prompt += `
## Other Tabs
${context.tabsContext}
`
  }

  prompt += `
## Available Tools
You have access to tools for reading transcripts, searching content, accessing episode data, and writing to tabs.

When answering questions about the episode content, prefer using the search_transcript tool to find relevant segments rather than relying only on the summary.

To read the full content of a non-active tab listed above, use the read_summary tool with the tab_name parameter.

When the user asks you to write, draft, or create something (show notes, blog posts, key takeaways, etc.), use the write_tab tool to put the content in a tab. When they ask for a targeted edit ("change X to Y", "update the third bullet"), use edit_tab for surgical replacement. Use navigate_tab to switch between tabs.

Be concise and helpful. Format responses with markdown when appropriate.

${FORMATTING_INSTRUCTIONS}`

  return prompt
}


export function ChatSidebar(): React.JSX.Element {
  const activeTabId = useAppStore((s) => s.activeTabId)
  const episodes = useAppStore((s) => s.episodes)
  const contentTabs = useContentTabStore((s) => s.tabs)
  const activeContentTabId = useContentTabStore((s) => s.activeTabId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamingState, setStreamingState] = useState<StreamingState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamingStateRef = useRef<StreamingState | null>(null)
  const streamingEpisodeRef = useRef<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const models = useOpenRouterModels()
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const [modelFilter, setModelFilter] = useState('')
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashRecipes, setSlashRecipes] = useState<SlashRecipe[]>([])
  const [slashFilter, setSlashFilter] = useState('')
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0)
  const [generatingRecipe, setGeneratingRecipe] = useState<string | null>(null)
  const slashPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.getSetting('model_quality').then((m) => {
      if (m && !selectedModel) setSelectedModel(m)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false)
        setModelFilter('')
      }
      if (slashPopoverRef.current && !slashPopoverRef.current.contains(e.target as Node)) {
        setSlashOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    if (activeTabId !== streamingEpisodeRef.current) {
      setStreamingState(null)
      setStreaming(false)
    } else if (streamingStateRef.current) {
      setStreamingState(streamingStateRef.current)
      setStreaming(true)
    }
  }, [activeTabId, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingState])

  useEffect(() => {
    const unsubToken = window.api.onChatStreamToken((token) => {
      const prev = streamingStateRef.current
      const next = prev
        ? { ...prev, content: prev.content + token }
        : { content: token, toolCalls: [] }
      streamingStateRef.current = next
      if (useAppStore.getState().activeTabId === streamingEpisodeRef.current) {
        setStreamingState(next)
      }
    })

    const unsubToolStart = window.api.onChatToolCallStart((data) => {
      const prev = streamingStateRef.current
      const next = prev
        ? { ...prev, toolCalls: [...prev.toolCalls, { id: data.id, name: data.name }] }
        : { content: '', toolCalls: [{ id: data.id, name: data.name }] }
      streamingStateRef.current = next
      if (useAppStore.getState().activeTabId === streamingEpisodeRef.current) {
        setStreamingState(next)
      }
    })

    const unsubToolResult = window.api.onChatToolCallResult((data) => {
      const prev = streamingStateRef.current
      if (!prev) return
      const next = {
        ...prev,
        toolCalls: prev.toolCalls.map((tc) =>
          tc.id === data.id ? { ...tc, result: data.result } : tc
        ),
      }
      streamingStateRef.current = next
      if (useAppStore.getState().activeTabId === streamingEpisodeRef.current) {
        setStreamingState(next)
      }
    })

    const unsubEnd = window.api.onChatStreamEnd((data) => {
      const prev = streamingStateRef.current
      setStreaming(false)
      setStreamingState(null)
      streamingStateRef.current = null

      if (!prev) return
      const finalContent = data.content || prev.content
      const toolCallsJson = prev.toolCalls.length > 0 ? JSON.stringify(prev.toolCalls) : null

      const episodeId = streamingEpisodeRef.current
      if (episodeId && finalContent) {
        window.api.chatSaveMessage(episodeId, 'assistant', finalContent, toolCallsJson).then((id) => {
          if (useAppStore.getState().activeTabId !== episodeId) return
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
      if (isLicenseError(message)) {
        useAppStore.getState().openLicenseGateModal('Sending messages')
      } else {
        setError(message)
      }
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
    streamingEpisodeRef.current = activeTabId

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

    const fileName = episode.file_path?.split('/').pop() || episode.file_path || 'Untitled'
    const activeTab = contentTabs.find((t) => t.id === activeContentTabId)
    const activeSummary = activeTab?.content || null

    const model = selectedModel || (await window.api.getSetting('model_quality')) || 'google/gemini-3.5-flash'

    const allTabs = await window.api.tabsGet(activeTabId)
    const tabsContext = allTabs
      .filter((t: { tab_name: string; content: string; id: string }) => t.id !== activeContentTabId)
      .map((t: { tab_name: string; content: string }) =>
        t.content ? `- ${t.tab_name} (${t.content.length.toLocaleString()} chars)` : `- ${t.tab_name} (empty)`
      )
      .join('\n')

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
      tabsContext: tabsContext || null,
    })

    setStreaming(true)
    setStreamingState({ content: '', toolCalls: [] })

    window.api.chatSendMessage({
      model,
      systemPrompt,
      messages: chatMessages,
      tools: TOOL_DEFINITIONS,
      episodeId: activeTabId,
    }).catch((err: unknown) => {
      setStreaming(false)
      setStreamingState(null)
      const msg = err instanceof Error ? err.message : String(err)
      if (isLicenseError(msg)) {
        useAppStore.getState().openLicenseGateModal('Sending messages')
      } else {
        setError(msg)
      }
    })
  }

  const handleStop = (): void => {
    window.api.chatAbort()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashSelectedIndex((i) => Math.min(i + 1, filteredSlashRecipes.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const recipe = filteredSlashRecipes[slashSelectedIndex]
        if (recipe) handleSlashSelect(recipe)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlashOpen(false)
        return
      }
    }
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
    const value = e.target.value
    setInput(value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'

    if (value === '/') {
      window.api.recipesGetAll().then((recipes) => {
        setSlashRecipes(recipes)
        setSlashOpen(true)
        setSlashFilter('')
        setSlashSelectedIndex(0)
      })
    } else if (value.startsWith('/') && slashOpen) {
      setSlashFilter(value.slice(1))
      setSlashSelectedIndex(0)
    } else {
      setSlashOpen(false)
    }
  }

  const filteredSlashRecipes = useMemo(() => {
    if (!slashFilter) return slashRecipes
    const lower = slashFilter.toLowerCase()
    return slashRecipes.filter((r) => r.name.toLowerCase().includes(lower))
  }, [slashRecipes, slashFilter])

  const handleSlashSelect = async (recipe: SlashRecipe): Promise<void> => {
    if (!activeTabId) return
    setSlashOpen(false)
    setInput('')

    const slashText = `/${recipe.name}`
    const msgId = await window.api.chatSaveMessage(activeTabId, 'user', slashText)
    const newMessage: ChatMessage = {
      id: msgId,
      role: 'user',
      content: slashText,
      toolCalls: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMessage])

    const tabs = useContentTabStore.getState().tabs
    const existingTab = tabs.find((t) => t.recipe_id === recipe.id)
    if (existingTab) {
      useContentTabStore.getState().setActiveTab(existingTab.id)
      const confirmId = await window.api.chatSaveMessage(
        activeTabId, 'assistant', `Navigated to existing ${recipe.name} tab.`
      )
      setMessages((prev) => [...prev, {
        id: confirmId,
        role: 'assistant',
        content: `Navigated to existing ${recipe.name} tab.`,
        toolCalls: null,
        createdAt: new Date().toISOString(),
      }])
      return
    }

    setGeneratingRecipe(recipe.name)

    try {
      const tabId = await useContentTabStore.getState().createTab(activeTabId, {
        recipe_id: recipe.id,
        tab_name: recipe.name,
      })
      await window.api.tabsExecuteRecipe(activeTabId, tabId)

      const confirmId = await window.api.chatSaveMessage(
        activeTabId, 'assistant', `✓ ${recipe.name} generated`
      )
      setMessages((prev) => [...prev, {
        id: confirmId,
        role: 'assistant',
        content: `✓ ${recipe.name} generated`,
        toolCalls: null,
        createdAt: new Date().toISOString(),
      }])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (isLicenseError(errorMsg)) {
        useAppStore.getState().openLicenseGateModal('Running recipes')
      } else {
        setError(`Failed to generate ${recipe.name}: ${errorMsg}`)
      }
    } finally {
      setGeneratingRecipe(null)
    }
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
        <div className="relative flex-1 min-w-0 mr-2" ref={modelDropdownRef}>
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 max-w-full px-2 py-1 rounded-[8px] hover:bg-[var(--surface)] transition-colors"
          >
            <span className="text-xs text-[var(--text)] truncate">
              {selectedModel ? getModelDisplayName(selectedModel, models) : 'Model'}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--secondary)]">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {modelDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-72 max-h-64 overflow-hidden rounded-lg bg-[var(--surface)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-50 flex flex-col">
              <div className="px-2 pt-2 pb-1">
                <input
                  type="text"
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  placeholder="Search models..."
                  autoFocus
                  className="w-full px-2 py-1.5 text-[13px] bg-[var(--bg)] rounded-md outline-none text-[var(--text)] placeholder-[var(--secondary)]"
                />
              </div>
              <div className="overflow-y-auto flex-1 py-1">
                {getFilteredModels(models, selectedModel, modelFilter).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id)
                      setModelDropdownOpen(false)
                      setModelFilter('')
                    }}
                    className={`w-full text-left px-2 py-1 text-[13px] truncate hover:bg-white/[0.08] rounded-md mx-1.5 transition-[background-color] duration-150 ${
                      m.id === selectedModel ? 'text-[var(--accent)]' : 'text-[var(--text)]'
                    }`}
                    style={{ width: 'calc(100% - 12px)' }}
                  >
                    {m.name || m.id}
                  </button>
                ))}
                {getFilteredModels(models, selectedModel, modelFilter).length === 0 && (
                  <p className="px-3 py-2 text-[13px] text-[var(--secondary)]">No models found</p>
                )}
              </div>
            </div>
          )}
        </div>
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

        {generatingRecipe && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-[12px] bg-[var(--surface)] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-sm text-[var(--secondary)]">Generating {generatingRecipe}...</span>
              </div>
            </div>
          </div>
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
      <div className="px-4 pb-4 pt-2 border-t border-[var(--surface)] relative">
        {slashOpen && filteredSlashRecipes.length > 0 && (
          <div
            ref={slashPopoverRef}
            className="absolute bottom-full left-4 right-4 mb-1 z-50 py-1.5 rounded-lg bg-[var(--surface)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] max-h-[200px] overflow-y-auto"
          >
            {filteredSlashRecipes.map((recipe, i) => (
              <button
                key={recipe.id}
                onClick={() => handleSlashSelect(recipe)}
                className={`w-full text-left mx-1.5 px-2 py-1 text-[13px] rounded-md transition-[background-color] duration-150 text-[var(--text)] ${
                  i === slashSelectedIndex
                    ? 'bg-white/[0.08]'
                    : 'hover:bg-white/[0.08]'
                }`}
                style={{ width: 'calc(100% - 12px)' }}
              >
                {recipe.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-[12px] bg-[var(--surface)] px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this episode..."
            rows={1}
            disabled={streaming || !!generatingRecipe}
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
            <RichMarkdown content={state.content} streaming />
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
            <RichMarkdown content={message.content} />
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
      } else if (parsed.success && parsed.message) {
        resultSummary = parsed.message
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

function getModelDisplayName(modelId: string, models: ModelOption[]): string {
  const found = models.find((m) => m.id === modelId)
  if (found?.name) return found.name
  const parts = modelId.split('/')
  return parts.length > 1 ? parts[1] : modelId
}

function getFilteredModels(models: ModelOption[], selectedModel: string | null, filter: string): ModelOption[] {
  const defaultModel = selectedModel || 'google/gemini-3.5-flash'
  if (models.length === 0) {
    return [{ id: defaultModel, name: getModelDisplayName(defaultModel, []) }]
  }
  if (!filter) return models
  const lower = filter.toLowerCase()
  return models.filter((m) => m.id.toLowerCase().includes(lower) || (m.name && m.name.toLowerCase().includes(lower)))
}
