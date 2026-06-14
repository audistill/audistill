import { basename } from 'path'
import { BrowserWindow } from 'electron'
import { DatabaseService, Episode } from './database-service'
import { TabService } from './tab-service'
import { RecipeService } from './recipe-service'

export interface ToolServices {
  db: DatabaseService
  tabs: TabService
  recipes: RecipeService
}

export interface ToolContext {
  currentEpisodeId: string
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'unknown'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function resolveEpisodeId(args: Record<string, unknown>, context: ToolContext): string {
  return (args.episode_id as string) || context.currentEpisodeId
}

export class ChatToolExecutor {
  private db: DatabaseService
  private tabService: TabService
  private recipeService: RecipeService

  constructor(services: ToolServices) {
    this.db = services.db
    this.tabService = services.tabs
    this.recipeService = services.recipes
  }

  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<string> {
    switch (toolName) {
      case 'read_transcript':
        return this.readTranscript(args, context)
      case 'search_transcript':
        return this.searchTranscript(args, context)
      case 'search_episodes':
        return this.searchEpisodes(args)
      case 'list_episodes':
        return this.listEpisodes(args)
      case 'read_summary':
        return this.readSummary(args, context)
      case 'read_episode_metadata':
        return this.readEpisodeMetadata(args, context)
      case 'write_canvas':
      case 'write_tab':
        return this.writeTab(args, context)
      case 'edit_canvas':
      case 'edit_tab':
        return this.editTab(args, context)
      case 'navigate_tab':
        return this.navigateTab(args, context)
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` })
    }
  }

  private readTranscript(args: Record<string, unknown>, context: ToolContext): string {
    const episodeId = resolveEpisodeId(args, context)
    const episode = this.db.getEpisode(episodeId)
    if (!episode) {
      return JSON.stringify({ error: `Episode not found: ${episodeId}` })
    }
    if (!episode.transcript) {
      return JSON.stringify({ error: `No transcript available for episode: ${episode.title || episodeId}` })
    }
    return JSON.stringify({ transcript: episode.transcript })
  }

  private searchTranscript(args: Record<string, unknown>, context: ToolContext): string {
    const episodeId = resolveEpisodeId(args, context)
    const query = args.query as string
    if (!query) {
      return JSON.stringify({ error: 'Missing required parameter: query' })
    }

    const episode = this.db.getEpisode(episodeId)
    if (!episode) {
      return JSON.stringify({ error: `Episode not found: ${episodeId}` })
    }
    if (!episode.transcript) {
      return JSON.stringify({ error: `No transcript available for episode: ${episode.title || episodeId}` })
    }

    const matches = this.findTranscriptMatches(episode.transcript, query)
    return JSON.stringify({ matches, query, episode_id: episodeId })
  }

  private findTranscriptMatches(
    transcript: string,
    query: string
  ): { text: string; timestamp?: string }[] {
    const lowerQuery = query.toLowerCase()
    const matches: { text: string; timestamp?: string }[] = []

    let parsed: { timestamp?: string; text: string }[]
    try {
      parsed = JSON.parse(transcript)
    } catch {
      const lines = transcript.split('\n')
      for (const line of lines) {
        if (line.toLowerCase().includes(lowerQuery)) {
          matches.push({ text: line.trim() })
        }
      }
      return matches
    }

    if (Array.isArray(parsed)) {
      for (const segment of parsed) {
        const text = typeof segment === 'string' ? segment : segment.text || ''
        if (text.toLowerCase().includes(lowerQuery)) {
          matches.push({
            text,
            timestamp: segment.timestamp || undefined,
          })
        }
      }
    }

    return matches
  }

  private searchEpisodes(args: Record<string, unknown>): string {
    const query = args.query as string
    if (!query) {
      return JSON.stringify({ error: 'Missing required parameter: query' })
    }

    const episodes = this.db.searchEpisodes(query)
    const results = episodes.map((ep: Episode) => ({
      id: ep.id,
      title: ep.title || (ep.file_path ? basename(ep.file_path) : 'Untitled'),
      duration: formatDuration(ep.duration_sec),
      date: ep.created_at,
    }))
    return JSON.stringify({ results, query })
  }

  private listEpisodes(args: Record<string, unknown>): string {
    const folderId = args.folder_id as string | undefined
    const episodes = this.db.getEpisodes(folderId)
    const results = episodes
      .filter((ep: Episode) => ep.status === 'complete')
      .map((ep: Episode) => ({
        id: ep.id,
        title: ep.title || (ep.file_path ? basename(ep.file_path) : 'Untitled'),
        duration: formatDuration(ep.duration_sec),
        date: ep.created_at,
        status: ep.status,
      }))
    return JSON.stringify({ results })
  }

  private readSummary(args: Record<string, unknown>, context: ToolContext): string {
    const episodeId = resolveEpisodeId(args, context)
    const tabName = args.tab_name as string | undefined
    const viewType = args.view_type as string | undefined

    const episode = this.db.getEpisode(episodeId)
    if (!episode) {
      return JSON.stringify({ error: `Episode not found: ${episodeId}` })
    }

    const tabs = this.tabService.getTabs(episodeId)

    if (tabName) {
      const tab = tabs.find((t) => t.tab_name.toLowerCase() === tabName.toLowerCase())
      if (!tab || !tab.content) {
        return JSON.stringify({ error: `No tab "${tabName}" found for episode: ${episode.title || episodeId}` })
      }
      return JSON.stringify({ content: tab.content, tab_name: tab.tab_name, episode_id: episodeId })
    }

    if (viewType && ['brief', 'detailed', 'full'].includes(viewType)) {
      const nameMap: Record<string, string[]> = {
        brief: ['Brief'],
        detailed: ['Detailed Notes', 'Detailed'],
        full: ['Full Notes', 'Full'],
      }
      const candidates = nameMap[viewType] || []
      const tab = tabs.find((t) => candidates.some((c) => t.tab_name.toLowerCase() === c.toLowerCase()))
      if (!tab || !tab.content) {
        return JSON.stringify({ error: `No ${viewType} summary available for episode: ${episode.title || episodeId}` })
      }
      return JSON.stringify({ content: tab.content, view_type: viewType, episode_id: episodeId })
    }

    const firstWithContent = tabs.find((t) => t.content)
    if (!firstWithContent) {
      return JSON.stringify({ error: `No summary tabs available for episode: ${episode.title || episodeId}` })
    }
    return JSON.stringify({ content: firstWithContent.content, tab_name: firstWithContent.tab_name, episode_id: episodeId })
  }

  private readEpisodeMetadata(args: Record<string, unknown>, context: ToolContext): string {
    const episodeId = resolveEpisodeId(args, context)
    const episode = this.db.getEpisode(episodeId)
    if (!episode) {
      return JSON.stringify({ error: `Episode not found: ${episodeId}` })
    }

    const folders = this.db.getFolders()
    const folder = episode.folder_id ? folders.find((f) => f.id === episode.folder_id) : null

    return JSON.stringify({
      id: episode.id,
      title: episode.title || (episode.file_path ? basename(episode.file_path) : 'Untitled'),
      filename: episode.file_path ? basename(episode.file_path) : null,
      duration: formatDuration(episode.duration_sec),
      date: episode.created_at,
      folder: folder?.name || null,
    })
  }

  private writeTab(args: Record<string, unknown>, context: ToolContext): string {
    const content = args.content as string
    if (typeof content !== 'string') {
      return JSON.stringify({ error: 'Missing required parameter: content' })
    }

    const tabName = (args.tab_name as string) || 'Canvas'
    const episodeId = context.currentEpisodeId
    const tab = this.getOrCreateTab(episodeId, tabName)
    this.tabService.updateTabContent(tab.id, content)
    this.broadcast('tab:content-updated', { episodeId, tabId: tab.id, content })
    return JSON.stringify({ success: true, message: `Tab "${tabName}" content written successfully` })
  }

  private editTab(args: Record<string, unknown>, context: ToolContext): string {
    const oldText = args.old_text as string
    const newText = args.new_text as string
    if (typeof oldText !== 'string' || typeof newText !== 'string') {
      return JSON.stringify({ error: 'Missing required parameters: old_text and new_text' })
    }

    const tabName = (args.tab_name as string) || 'Canvas'
    const episodeId = context.currentEpisodeId
    const tab = this.getOrCreateTab(episodeId, tabName)
    const current = tab.content
    if (!current.includes(oldText)) {
      return JSON.stringify({ error: `Could not find the specified text in tab "${tabName}". Make sure old_text matches exactly.` })
    }

    const updated = current.replace(oldText, newText)
    this.tabService.updateTabContent(tab.id, updated)
    this.broadcast('tab:content-updated', { episodeId, tabId: tab.id, content: updated })
    return JSON.stringify({ success: true, message: `Tab "${tabName}" content edited successfully` })
  }

  private getOrCreateTab(episodeId: string, tabName: string): { id: string; content: string } {
    const tabs = this.tabService.getTabs(episodeId)
    const existing = tabs.find((t) => t.tab_name === tabName && !t.recipe_id)
    if (existing) return existing
    const id = this.tabService.createTab(episodeId, { tab_name: tabName })
    this.broadcast('tab:created', { episodeId, tabId: id, tabName })
    return { id, content: '' }
  }

  private navigateTab(args: Record<string, unknown>, context: ToolContext): string {
    const tabName = args.tab_name as string
    if (!tabName) {
      return JSON.stringify({ error: 'Missing required parameter: tab_name' })
    }

    const episodeId = context.currentEpisodeId
    const tabs = this.tabService.getTabs(episodeId)
    const tab = tabs.find((t) => t.tab_name === tabName)
    if (!tab) {
      return JSON.stringify({ error: `Tab "${tabName}" not found` })
    }

    this.broadcast('tab:navigate', { episodeId, tabId: tab.id })
    return JSON.stringify({ success: true, message: `Navigated to tab "${tabName}"` })
  }

  private broadcast(channel: string, ...args: unknown[]): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    }
  }
}
