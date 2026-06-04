import { basename } from 'path'
import { DatabaseService, Episode } from './database-service'

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

  constructor(db: DatabaseService) {
    this.db = db
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
      title: ep.title || basename(ep.file_path),
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
        title: ep.title || basename(ep.file_path),
        duration: formatDuration(ep.duration_sec),
        date: ep.created_at,
        status: ep.status,
      }))
    return JSON.stringify({ results })
  }

  private readSummary(args: Record<string, unknown>, context: ToolContext): string {
    const episodeId = resolveEpisodeId(args, context)
    const viewType = args.view_type as 'brief' | 'detailed' | 'full'
    if (!viewType || !['brief', 'detailed', 'full'].includes(viewType)) {
      return JSON.stringify({ error: 'Missing or invalid parameter: view_type (must be brief, detailed, or full)' })
    }

    const episode = this.db.getEpisode(episodeId)
    if (!episode) {
      return JSON.stringify({ error: `Episode not found: ${episodeId}` })
    }

    const summary = this.db.getSummary(episodeId, viewType)
    if (!summary || summary.status !== 'complete') {
      return JSON.stringify({
        error: `No ${viewType} summary available for episode: ${episode.title || episodeId}`,
      })
    }

    return JSON.stringify({ content: summary.content, view_type: viewType, episode_id: episodeId })
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
      title: episode.title || basename(episode.file_path),
      filename: basename(episode.file_path),
      duration: formatDuration(episode.duration_sec),
      date: episode.created_at,
      folder: folder?.name || null,
    })
  }
}
