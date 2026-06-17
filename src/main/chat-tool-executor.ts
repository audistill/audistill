import { basename } from 'path'
import { BrowserWindow } from 'electron'
import { DatabaseService, Episode } from './database-service'
import { TabService } from './tab-service'
import { RecipeService } from './recipe-service'
import { searchDDG } from './web-search-service'

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
      case 'grep_transcripts':
        return this.grepTranscripts(args)
      case 'read_transcript_range':
        return this.readTranscriptRange(args, context)
      case 'filter_episodes':
        return this.filterEpisodes(args)
      case 'list_folders':
        return this.listFolders()
      case 'create_folder':
        return this.createFolder(args)
      case 'move_episode':
        return this.moveEpisode(args, context)
      case 'rename_episode':
        return this.renameEpisode(args, context)
      case 'list_recipes':
        return this.listRecipes()
      case 'create_recipe':
        return this.createRecipe(args)
      case 'update_recipe':
        return this.updateRecipe(args)
      case 'web_search':
        return this.webSearch(args)
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
    const results = episodes.map((ep) => {
      const matchedIn = ep.matched_in === 'tab' && ep.matched_tab_name
        ? `tab:${ep.matched_tab_name}`
        : ep.matched_in
      return {
        id: ep.id,
        title: ep.title || (ep.file_path ? basename(ep.file_path) : 'Untitled'),
        duration: formatDuration(ep.duration_sec),
        date: ep.created_at,
        matched_in: matchedIn,
        snippet: this.extractSnippet(ep, query),
      }
    })
    return JSON.stringify({ results, query })
  }

  private extractSnippet(ep: Episode, query: string): string {
    const lowerQuery = query.toLowerCase()
    const source = ep.transcript || ep.title || ''
    const lowerSource = source.toLowerCase()

    let text = source
    if (ep.transcript) {
      try {
        const parsed = JSON.parse(ep.transcript)
        if (Array.isArray(parsed)) {
          const segment = parsed.find((s: { text?: string }) =>
            (s.text || '').toLowerCase().includes(lowerQuery)
          )
          if (segment) text = segment.text
        }
      } catch {
        const lines = source.split('\n')
        const line = lines.find((l) => l.toLowerCase().includes(lowerQuery))
        if (line) text = line
      }
    }

    const idx = text.toLowerCase().indexOf(lowerQuery)
    if (idx === -1) return text.slice(0, 150)
    const start = Math.max(0, idx - 60)
    const end = Math.min(text.length, idx + query.length + 60)
    let snippet = text.slice(start, end).trim()
    if (start > 0) snippet = '...' + snippet
    if (end < text.length) snippet = snippet + '...'
    return snippet
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

  private filterEpisodes(args: Record<string, unknown>): string {
    const filters: {
      folder_id?: string | null
      date_from?: string
      date_to?: string
      duration_min?: number
      duration_max?: number
      source_type?: string
      has_transcript?: boolean
    } = {}

    if ('folder_id' in args) filters.folder_id = args.folder_id as string | null
    if (args.date_from) filters.date_from = args.date_from as string
    if (args.date_to) filters.date_to = args.date_to as string
    if (args.duration_min !== undefined) filters.duration_min = args.duration_min as number
    if (args.duration_max !== undefined) filters.duration_max = args.duration_max as number
    if (args.source_type) filters.source_type = args.source_type as string
    if (args.has_transcript !== undefined) filters.has_transcript = args.has_transcript as boolean

    const episodes = this.db.filterEpisodes(filters)
    const results = episodes.map((ep) => ({
      id: ep.id,
      title: ep.title || (ep.file_path ? basename(ep.file_path) : 'Untitled'),
      duration: formatDuration(ep.duration_sec),
      date: ep.created_at,
      folder_id: ep.folder_id,
      source_type: ep.source_type,
    }))
    return JSON.stringify({ results })
  }

  private listFolders(): string {
    const folders = this.db.getFolders()
    return JSON.stringify({
      folders: folders.map((f) => ({ id: f.id, name: f.name, parent_id: f.parent_id })),
    })
  }

  private createFolder(args: Record<string, unknown>): string {
    const name = args.name as string
    if (!name) {
      return JSON.stringify({ error: 'Missing required parameter: name' })
    }
    const parentId = args.parent_id as string | undefined
    const id = this.db.createFolder(name, parentId)
    return JSON.stringify({ id, name })
  }

  private moveEpisode(args: Record<string, unknown>, context: ToolContext): string {
    const episodeId = resolveEpisodeId(args, context)
    const episode = this.db.getEpisode(episodeId)
    if (!episode) {
      return JSON.stringify({ error: `Episode not found: ${episodeId}` })
    }
    const folderId = ('folder_id' in args) ? args.folder_id as string | null : undefined
    this.db.updateEpisode(episodeId, { folder_id: folderId ?? null })
    return JSON.stringify({ success: true, message: `Episode moved successfully` })
  }

  private renameEpisode(args: Record<string, unknown>, context: ToolContext): string {
    const title = args.title as string
    if (!title) {
      return JSON.stringify({ error: 'Missing required parameter: title' })
    }
    const episodeId = resolveEpisodeId(args, context)
    const episode = this.db.getEpisode(episodeId)
    if (!episode) {
      return JSON.stringify({ error: `Episode not found: ${episodeId}` })
    }
    this.db.updateEpisode(episodeId, { title })
    return JSON.stringify({ success: true, message: `Episode renamed to "${title}"` })
  }

  private listRecipes(): string {
    const recipes = this.recipeService.getRecipes()
    return JSON.stringify({
      recipes: recipes.map((r) => ({ id: r.id, name: r.name, is_builtin: r.is_builtin })),
    })
  }

  private createRecipe(args: Record<string, unknown>): string {
    const name = args.name as string
    if (!name) {
      return JSON.stringify({ error: 'Missing required parameter: name' })
    }
    const prompt = args.prompt as string
    if (!prompt) {
      return JSON.stringify({ error: 'Missing required parameter: prompt' })
    }
    const modelOverride = args.model_override as string | undefined
    const id = this.recipeService.createRecipe({ name, prompt, model_override: modelOverride })
    return JSON.stringify({ id, name })
  }

  private updateRecipe(args: Record<string, unknown>): string {
    const recipeId = args.recipe_id as string
    if (!recipeId) {
      return JSON.stringify({ error: 'Missing required parameter: recipe_id' })
    }
    const recipe = this.recipeService.getRecipe(recipeId)
    if (!recipe) {
      return JSON.stringify({ error: `Recipe not found: ${recipeId}` })
    }
    if (recipe.is_builtin) {
      return JSON.stringify({ error: 'Cannot update a built-in recipe' })
    }
    const fields: { name?: string; prompt?: string; model_override?: string } = {}
    if (args.name) fields.name = args.name as string
    if (args.prompt) fields.prompt = args.prompt as string
    if (args.model_override !== undefined) fields.model_override = args.model_override as string
    this.recipeService.updateRecipe(recipeId, fields)
    return JSON.stringify({ success: true, message: `Recipe "${recipe.name}" updated` })
  }

  private async webSearch(args: Record<string, unknown>): Promise<string> {
    const query = args.query as string
    if (!query) {
      return JSON.stringify({ error: 'Missing required parameter: query' })
    }
    const maxResults = (args.max_results as number) || 10
    try {
      const results = await searchDDG(query, maxResults)
      return JSON.stringify({ results, query })
    } catch (err) {
      return JSON.stringify({
        error: `Web search failed: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  private grepTranscripts(args: Record<string, unknown>): string {
    const pattern = args.pattern as string
    if (!pattern) {
      return JSON.stringify({ error: 'Missing required parameter: pattern' })
    }

    const isRegex = (args.is_regex as boolean) || false
    const contextSegments = (args.context_segments as number) ?? 2
    const episodeIds = args.episode_ids as string[] | undefined
    const folderId = args.folder_id as string | undefined
    const maxResults = (args.max_results as number) || 20

    let regex: RegExp
    if (isRegex) {
      try {
        regex = new RegExp(pattern, 'i')
      } catch (e) {
        return JSON.stringify({ error: `Invalid regex: ${(e as Error).message}` })
      }
    } else {
      regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    }

    let episodes: Episode[]
    if (episodeIds) {
      episodes = episodeIds
        .map((id) => this.db.getEpisode(id))
        .filter((ep): ep is Episode => !!ep)
    } else if (folderId) {
      episodes = this.db.getEpisodes(folderId)
    } else {
      episodes = this.db.getEpisodes()
    }

    const results: {
      episode_id: string
      episode_title: string
      timestamp: string | null
      matched_text: string
      context_before: string
      context_after: string
    }[] = []

    for (const ep of episodes) {
      if (!ep.transcript || results.length >= maxResults) break

      let segments: { timestamp?: string; text: string }[]
      try {
        const parsed = JSON.parse(ep.transcript)
        if (Array.isArray(parsed)) {
          segments = parsed.map((s) => ({
            timestamp: s.timestamp || null,
            text: typeof s === 'string' ? s : s.text || '',
          }))
        } else {
          continue
        }
      } catch {
        segments = ep.transcript.split('\n').map((line) => ({ text: line }))
      }

      for (let i = 0; i < segments.length && results.length < maxResults; i++) {
        if (regex.test(segments[i].text)) {
          const before = segments
            .slice(Math.max(0, i - contextSegments), i)
            .map((s) => s.text)
            .join(' ')
          const after = segments
            .slice(i + 1, i + 1 + contextSegments)
            .map((s) => s.text)
            .join(' ')
          results.push({
            episode_id: ep.id,
            episode_title: ep.title || 'Untitled',
            timestamp: segments[i].timestamp || null,
            matched_text: segments[i].text,
            context_before: before,
            context_after: after,
          })
        }
      }
    }

    return JSON.stringify({ results, pattern, total: results.length })
  }

  private readTranscriptRange(args: Record<string, unknown>, context: ToolContext): string {
    const start = args.start as string
    if (start === undefined || start === null) {
      return JSON.stringify({ error: 'Missing required parameter: start' })
    }

    const episodeId = resolveEpisodeId(args, context)
    const episode = this.db.getEpisode(episodeId)
    if (!episode) {
      return JSON.stringify({ error: `Episode not found: ${episodeId}` })
    }
    if (!episode.transcript) {
      return JSON.stringify({ error: `No transcript available for episode: ${episode.title || episodeId}` })
    }

    const limit = (args.limit as number) || 50
    const end = args.end as string | undefined

    let segments: { timestamp?: string; text: string }[]
    try {
      const parsed = JSON.parse(episode.transcript)
      if (Array.isArray(parsed)) {
        segments = parsed.map((s) => ({
          timestamp: s.timestamp || undefined,
          text: typeof s === 'string' ? s : s.text || '',
        }))
      } else {
        segments = episode.transcript.split('\n').map((line) => ({ text: line }))
      }
    } catch {
      segments = episode.transcript.split('\n').map((line) => ({ text: line }))
    }

    const totalSegments = segments.length
    const isTimestamp = (v: string) => /^\d{2}:\d{2}:\d{2}$/.test(v)

    let startIdx: number
    let endIdx: number

    if (isTimestamp(start)) {
      startIdx = segments.findIndex((s) => s.timestamp && s.timestamp >= start)
      if (startIdx === -1) startIdx = totalSegments
      if (end && isTimestamp(end)) {
        endIdx = segments.findIndex((s, i) => i > startIdx && s.timestamp && s.timestamp > end)
        if (endIdx === -1) endIdx = totalSegments
      } else {
        endIdx = Math.min(startIdx + limit, totalSegments)
      }
    } else {
      startIdx = parseInt(start, 10) || 0
      if (end !== undefined) {
        endIdx = (parseInt(end, 10) || 0) + 1
      } else {
        endIdx = Math.min(startIdx + limit, totalSegments)
      }
    }

    const sliced = segments.slice(startIdx, endIdx).map((s, i) => ({
      index: startIdx + i,
      timestamp: s.timestamp || null,
      text: s.text,
    }))

    return JSON.stringify({ segments: sliced, total_segments: totalSegments })
  }

  private broadcast(channel: string, ...args: unknown[]): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    }
  }
}
