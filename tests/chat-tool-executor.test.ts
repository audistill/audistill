import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const broadcasts: { channel: string; args: unknown[] }[] = []

vi.mock('electron', () => ({
  app: { getPath: () => '/unused' },
  BrowserWindow: {
    getAllWindows: () => [
      {
        isDestroyed: () => false,
        webContents: {
          send: (channel: string, ...args: unknown[]) => {
            broadcasts.push({ channel, args })
          },
        },
      },
    ],
  },
}))

import { DatabaseService } from '../src/main/database-service'
import { ChatToolExecutor, ToolContext } from '../src/main/chat-tool-executor'

describe('ChatToolExecutor', () => {
  let db: DatabaseService
  let executor: ChatToolExecutor
  let context: ToolContext
  let episodeId: string

  beforeEach(() => {
    broadcasts.length = 0
    db = new DatabaseService(':memory:')
    executor = new ChatToolExecutor(db)

    episodeId = db.createEpisode({
      title: 'Test Episode',
      file_path: '/path/to/episode.mp3',
      folder_id: null,
      duration_sec: 3661,
      status: 'complete',
    })
    db.updateEpisode(episodeId, {
      transcript: JSON.stringify([
        { timestamp: '00:00:00', text: 'Welcome to the show everyone.' },
        { timestamp: '00:01:30', text: 'Today we discuss machine learning.' },
        { timestamp: '00:05:00', text: 'Neural networks are fascinating.' },
      ]),
    })

    context = { currentEpisodeId: episodeId }
  })

  afterEach(() => {
    db.close()
  })

  describe('executeTool dispatch', () => {
    it('returns error for unknown tool', async () => {
      const result = await executor.executeTool('nonexistent_tool', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Unknown tool')
    })
  })

  describe('read_transcript', () => {
    it('returns transcript for current episode', async () => {
      const result = await executor.executeTool('read_transcript', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.transcript).toContain('Welcome to the show')
    })

    it('returns transcript for specified episode', async () => {
      const result = await executor.executeTool(
        'read_transcript',
        { episode_id: episodeId },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.transcript).toContain('Welcome to the show')
    })

    it('returns error for non-existent episode', async () => {
      const result = await executor.executeTool(
        'read_transcript',
        { episode_id: 'nonexistent' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Episode not found')
    })

    it('returns error when episode has no transcript', async () => {
      const noTranscriptId = db.createEpisode({
        title: 'No Transcript',
        file_path: '/path/to/no-transcript.mp3',
        status: 'queued',
      })
      const result = await executor.executeTool(
        'read_transcript',
        { episode_id: noTranscriptId },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('No transcript available')
    })
  })

  describe('search_transcript', () => {
    it('finds matching segments with timestamps (JSON transcript)', async () => {
      const result = await executor.executeTool(
        'search_transcript',
        { query: 'machine learning' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.matches).toHaveLength(1)
      expect(parsed.matches[0].text).toContain('machine learning')
      expect(parsed.matches[0].timestamp).toBe('00:01:30')
    })

    it('search is case-insensitive', async () => {
      const result = await executor.executeTool(
        'search_transcript',
        { query: 'NEURAL NETWORKS' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.matches).toHaveLength(1)
      expect(parsed.matches[0].text).toContain('Neural networks')
    })

    it('returns empty matches when query not found', async () => {
      const result = await executor.executeTool(
        'search_transcript',
        { query: 'quantum computing' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.matches).toHaveLength(0)
    })

    it('returns error when query parameter is missing', async () => {
      const result = await executor.executeTool('search_transcript', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing required parameter: query')
    })

    it('handles plain text transcript (non-JSON)', async () => {
      const plainId = db.createEpisode({
        title: 'Plain Text',
        file_path: '/path/to/plain.mp3',
        status: 'complete',
      })
      db.updateEpisode(plainId, {
        transcript: 'Line one about cats\nLine two about dogs\nLine three about cats again',
      })

      const result = await executor.executeTool(
        'search_transcript',
        { query: 'cats' },
        { currentEpisodeId: plainId }
      )
      const parsed = JSON.parse(result)
      expect(parsed.matches).toHaveLength(2)
    })

    it('returns error for missing episode', async () => {
      const result = await executor.executeTool(
        'search_transcript',
        { query: 'test', episode_id: 'nonexistent' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Episode not found')
    })
  })

  describe('search_episodes', () => {
    it('returns matching episodes by title', async () => {
      const result = await executor.executeTool(
        'search_episodes',
        { query: 'Test Episode' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results.length).toBeGreaterThanOrEqual(1)
      expect(parsed.results[0].title).toBe('Test Episode')
      expect(parsed.results[0].id).toBe(episodeId)
    })

    it('returns matching episodes by summary content', async () => {
      db.createSummary(episodeId, 'brief', 'complete')
      db.updateSummary(episodeId, 'brief', { content: 'This is about artificial intelligence', status: 'complete' })

      const result = await executor.executeTool(
        'search_episodes',
        { query: 'artificial intelligence' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results.length).toBeGreaterThanOrEqual(1)
    })

    it('returns empty results for no matches', async () => {
      const result = await executor.executeTool(
        'search_episodes',
        { query: 'zzz_nonexistent_zzz' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results).toHaveLength(0)
    })

    it('returns error when query is missing', async () => {
      const result = await executor.executeTool('search_episodes', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing required parameter: query')
    })

    it('includes duration and date in results', async () => {
      const result = await executor.executeTool(
        'search_episodes',
        { query: 'Test' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results[0].duration).toBe('01:01:01')
      expect(parsed.results[0].date).toBeDefined()
    })
  })

  describe('list_episodes', () => {
    it('returns completed episodes', async () => {
      const result = await executor.executeTool('list_episodes', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.results.length).toBeGreaterThanOrEqual(1)
      expect(parsed.results[0].title).toBe('Test Episode')
      expect(parsed.results[0].status).toBe('complete')
    })

    it('excludes non-complete episodes', async () => {
      db.createEpisode({
        title: 'Queued Episode',
        file_path: '/path/to/queued.mp3',
        status: 'queued',
      })

      const result = await executor.executeTool('list_episodes', {}, context)
      const parsed = JSON.parse(result)
      const titles = parsed.results.map((r: { title: string }) => r.title)
      expect(titles).not.toContain('Queued Episode')
    })

    it('filters by folder', async () => {
      const folderId = db.createFolder('My Folder')
      const folderEpId = db.createEpisode({
        title: 'Folder Episode',
        file_path: '/path/to/folder-ep.mp3',
        folder_id: folderId,
        status: 'complete',
      })

      const result = await executor.executeTool(
        'list_episodes',
        { folder_id: folderId },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results).toHaveLength(1)
      expect(parsed.results[0].id).toBe(folderEpId)
    })
  })

  describe('read_summary', () => {
    beforeEach(() => {
      db.createSummary(episodeId, 'brief', 'complete')
      db.updateSummary(episodeId, 'brief', { content: 'Brief summary content', status: 'complete' })
      db.createSummary(episodeId, 'detailed', 'complete')
      db.updateSummary(episodeId, 'detailed', { content: 'Detailed summary content', status: 'complete' })
    })

    it('returns summary content for specified view type', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { view_type: 'brief' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.content).toBe('Brief summary content')
      expect(parsed.view_type).toBe('brief')
    })

    it('returns detailed summary', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { view_type: 'detailed' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.content).toBe('Detailed summary content')
    })

    it('returns error when summary not yet generated', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { view_type: 'full' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('No full summary available')
    })

    it('returns error for invalid view_type', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { view_type: 'invalid' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing or invalid parameter: view_type')
    })

    it('returns error when view_type is missing', async () => {
      const result = await executor.executeTool('read_summary', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing or invalid parameter: view_type')
    })

    it('returns error for non-existent episode', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { view_type: 'brief', episode_id: 'nonexistent' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Episode not found')
    })

    it('returns error when summary status is not complete', async () => {
      db.createSummary(episodeId, 'full', 'generating')

      const result = await executor.executeTool(
        'read_summary',
        { view_type: 'full' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('No full summary available')
    })
  })

  describe('read_episode_metadata', () => {
    it('returns structured metadata for current episode', async () => {
      const result = await executor.executeTool('read_episode_metadata', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.id).toBe(episodeId)
      expect(parsed.title).toBe('Test Episode')
      expect(parsed.filename).toBe('episode.mp3')
      expect(parsed.duration).toBe('01:01:01')
      expect(parsed.date).toBeDefined()
      expect(parsed.folder).toBeNull()
    })

    it('includes folder name when episode is in a folder', async () => {
      const folderId = db.createFolder('Podcasts')
      db.updateEpisode(episodeId, { folder_id: folderId })

      const result = await executor.executeTool('read_episode_metadata', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.folder).toBe('Podcasts')
    })

    it('uses filename as title when title is null', async () => {
      const noTitleId = db.createEpisode({
        file_path: '/some/path/recording.wav',
        status: 'complete',
      })

      const result = await executor.executeTool(
        'read_episode_metadata',
        { episode_id: noTitleId },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.title).toBe('recording.wav')
      expect(parsed.filename).toBe('recording.wav')
    })

    it('returns error for non-existent episode', async () => {
      const result = await executor.executeTool(
        'read_episode_metadata',
        { episode_id: 'nonexistent' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Episode not found')
    })

    it('shows unknown duration when null', async () => {
      const noDurId = db.createEpisode({
        title: 'No Duration',
        file_path: '/path/to/nodur.mp3',
        status: 'complete',
      })

      const result = await executor.executeTool(
        'read_episode_metadata',
        { episode_id: noDurId },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.duration).toBe('unknown')
    })
  })

  describe('write_canvas', () => {
    it('persists content to database and returns success', async () => {
      const result = await executor.executeTool(
        'write_canvas',
        { content: '# Show Notes\n\nGreat episode about ML.' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('written successfully')

      const saved = db.getCanvas(episodeId)
      expect(saved).toBe('# Show Notes\n\nGreat episode about ML.')
    })

    it('broadcasts canvas:stream-write event', async () => {
      await executor.executeTool(
        'write_canvas',
        { content: 'Hello canvas' },
        context
      )

      const writes = broadcasts.filter((b) => b.channel === 'canvas:stream-write')
      expect(writes).toHaveLength(1)
      expect(writes[0].args[0]).toEqual({ episodeId, content: 'Hello canvas' })
    })

    it('returns error when content parameter is missing', async () => {
      const result = await executor.executeTool('write_canvas', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing required parameter: content')
    })

    it('overwrites existing canvas content', async () => {
      db.saveCanvas(episodeId, 'old content')

      await executor.executeTool(
        'write_canvas',
        { content: 'new content' },
        context
      )

      const saved = db.getCanvas(episodeId)
      expect(saved).toBe('new content')
    })
  })

  describe('edit_canvas', () => {
    beforeEach(() => {
      db.saveCanvas(episodeId, '# Notes\n\n- First point\n- Second point\n- Third point')
    })

    it('applies find-and-replace correctly', async () => {
      const result = await executor.executeTool(
        'edit_canvas',
        { old_text: 'Second point', new_text: 'Updated second point' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)

      const saved = db.getCanvas(episodeId)
      expect(saved).toContain('Updated second point')
      expect(saved).not.toContain('Second point')
      expect(saved).toContain('First point')
      expect(saved).toContain('Third point')
    })

    it('broadcasts canvas:edit event with updated content', async () => {
      await executor.executeTool(
        'edit_canvas',
        { old_text: 'First point', new_text: 'Modified first' },
        context
      )

      const edits = broadcasts.filter((b) => b.channel === 'canvas:edit')
      expect(edits).toHaveLength(1)
      const payload = edits[0].args[0] as { episodeId: string; content: string; oldText: string; newText: string }
      expect(payload.episodeId).toBe(episodeId)
      expect(payload.oldText).toBe('First point')
      expect(payload.newText).toBe('Modified first')
      expect(payload.content).toContain('Modified first')
    })

    it('returns error when old_text is not found in canvas', async () => {
      const result = await executor.executeTool(
        'edit_canvas',
        { old_text: 'nonexistent text', new_text: 'replacement' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Could not find the specified text')
    })

    it('returns error when parameters are missing', async () => {
      const result = await executor.executeTool(
        'edit_canvas',
        { old_text: 'First point' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing required parameters')
    })

    it('works on empty canvas (old_text not found)', async () => {
      db.saveCanvas(episodeId, '')

      const result = await executor.executeTool(
        'edit_canvas',
        { old_text: 'anything', new_text: 'replacement' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Could not find the specified text')
    })
  })

  describe('navigate_view', () => {
    it('broadcasts canvas:navigate with episode view', async () => {
      const result = await executor.executeTool(
        'navigate_view',
        { view: 'episode' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('episode')

      const navs = broadcasts.filter((b) => b.channel === 'canvas:navigate')
      expect(navs).toHaveLength(1)
      expect(navs[0].args[0]).toEqual({ view: 'episode' })
    })

    it('broadcasts canvas:navigate with canvas view', async () => {
      const result = await executor.executeTool(
        'navigate_view',
        { view: 'canvas' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('canvas')

      const navs = broadcasts.filter((b) => b.channel === 'canvas:navigate')
      expect(navs).toHaveLength(1)
      expect(navs[0].args[0]).toEqual({ view: 'canvas' })
    })

    it('returns error for invalid view value', async () => {
      const result = await executor.executeTool(
        'navigate_view',
        { view: 'invalid' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Invalid parameter: view must be')
    })
  })
})
