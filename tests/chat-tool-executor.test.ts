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
import { TabService } from '../src/main/tab-service'
import { RecipeService } from '../src/main/recipe-service'
import { join } from 'path'

const PROMPTS_DIR = join(__dirname, '..', 'src', 'main', 'prompts')

describe('ChatToolExecutor', () => {
  let db: DatabaseService
  let tabService: TabService
  let recipeService: RecipeService
  let executor: ChatToolExecutor
  let context: ToolContext
  let episodeId: string

  beforeEach(() => {
    broadcasts.length = 0
    db = new DatabaseService(':memory:')
    tabService = new TabService(db)
    recipeService = new RecipeService(db, PROMPTS_DIR)
    executor = new ChatToolExecutor({ db, tabs: tabService, recipes: recipeService })

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

    it('returns matching episodes by tab content', async () => {
      tabService.createTab(episodeId, { tab_name: 'Brief', content: 'This is about artificial intelligence' })

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

    it('finds episodes by transcript content', async () => {
      const result = await executor.executeTool(
        'search_episodes',
        { query: 'machine learning' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results.length).toBeGreaterThanOrEqual(1)
      expect(parsed.results[0].id).toBe(episodeId)
      expect(parsed.results[0].matched_in).toBe('transcript')
    })

    it('returns snippet with context around the match', async () => {
      const result = await executor.executeTool(
        'search_episodes',
        { query: 'machine learning' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results[0].snippet).toContain('machine learning')
      expect(parsed.results[0].snippet.length).toBeLessThanOrEqual(200)
    })

    it('returns matched_in as title when match is in title', async () => {
      const result = await executor.executeTool(
        'search_episodes',
        { query: 'Test Episode' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results[0].matched_in).toBe('title')
    })

    it('returns matched_in as tab name when match is in tab content', async () => {
      tabService.createTab(episodeId, { tab_name: 'Brief', content: 'Unique findable term xylophone' })

      const result = await executor.executeTool(
        'search_episodes',
        { query: 'xylophone' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results[0].matched_in).toBe('tab:Brief')
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
      tabService.createTab(episodeId, { tab_name: 'Brief', content: 'Brief summary content' })
      tabService.createTab(episodeId, { tab_name: 'Detailed Notes', content: 'Detailed summary content' })
    })

    it('returns tab content for specified view type', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { view_type: 'brief' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.content).toBe('Brief summary content')
      expect(parsed.view_type).toBe('brief')
    })

    it('returns detailed summary via view_type', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { view_type: 'detailed' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.content).toBe('Detailed summary content')
    })

    it('returns tab content by tab_name', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { tab_name: 'Brief' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.content).toBe('Brief summary content')
      expect(parsed.tab_name).toBe('Brief')
    })

    it('returns error when tab does not exist', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { view_type: 'full' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('No full summary available')
    })

    it('returns first tab with content when no params given', async () => {
      const result = await executor.executeTool('read_summary', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.content).toBe('Brief summary content')
    })

    it('returns error for non-existent episode', async () => {
      const result = await executor.executeTool(
        'read_summary',
        { tab_name: 'Brief', episode_id: 'nonexistent' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Episode not found')
    })

    it('returns error when no tabs have content', async () => {
      tabService.createTab(episodeId, { tab_name: 'Empty' })
      const noContentId = db.createEpisode({
        title: 'No Content',
        file_path: '/path/to/nocontent.mp3',
        status: 'complete',
      })

      const result = await executor.executeTool(
        'read_summary',
        {},
        { currentEpisodeId: noContentId }
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('No summary tabs available')
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

  describe('write_tab', () => {
    it('persists content to tab and returns success', async () => {
      const result = await executor.executeTool(
        'write_tab',
        { content: '# Show Notes\n\nGreat episode about ML.' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('written successfully')

      const tabs = tabService.getTabs(episodeId)
      const canvasTab = tabs.find((t) => t.tab_name === 'Canvas')
      expect(canvasTab?.content).toBe('# Show Notes\n\nGreat episode about ML.')
    })

    it('broadcasts tab:content-updated event', async () => {
      await executor.executeTool(
        'write_tab',
        { content: 'Hello tab' },
        context
      )

      const writes = broadcasts.filter((b) => b.channel === 'tab:content-updated')
      expect(writes).toHaveLength(1)
      const payload = writes[0].args[0] as { episodeId: string; content: string }
      expect(payload.episodeId).toBe(episodeId)
      expect(payload.content).toBe('Hello tab')
    })

    it('broadcasts tab:created when creating a new tab', async () => {
      await executor.executeTool(
        'write_tab',
        { content: 'Hello' },
        context
      )

      const created = broadcasts.filter((b) => b.channel === 'tab:created')
      expect(created).toHaveLength(1)
      const payload = created[0].args[0] as { episodeId: string; tabName: string }
      expect(payload.episodeId).toBe(episodeId)
      expect(payload.tabName).toBe('Canvas')
    })

    it('returns error when content parameter is missing', async () => {
      const result = await executor.executeTool('write_tab', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing required parameter: content')
    })

    it('overwrites existing tab content', async () => {
      tabService.createTab(episodeId, { tab_name: 'Canvas', content: 'old content' })

      await executor.executeTool(
        'write_tab',
        { content: 'new content' },
        context
      )

      const tabs = tabService.getTabs(episodeId)
      const canvasTab = tabs.find((t) => t.tab_name === 'Canvas')
      expect(canvasTab?.content).toBe('new content')
    })

    it('writes to a custom-named tab', async () => {
      const result = await executor.executeTool(
        'write_tab',
        { content: 'Blog draft', tab_name: 'Blog Post' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('Blog Post')

      const tabs = tabService.getTabs(episodeId)
      const blogTab = tabs.find((t) => t.tab_name === 'Blog Post')
      expect(blogTab?.content).toBe('Blog draft')
    })
  })

  describe('edit_tab', () => {
    beforeEach(() => {
      tabService.createTab(episodeId, { tab_name: 'Canvas', content: '# Notes\n\n- First point\n- Second point\n- Third point' })
    })

    it('applies find-and-replace correctly', async () => {
      const result = await executor.executeTool(
        'edit_tab',
        { old_text: 'Second point', new_text: 'Updated second point' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)

      const tabs = tabService.getTabs(episodeId)
      const canvasTab = tabs.find((t) => t.tab_name === 'Canvas')
      expect(canvasTab?.content).toContain('Updated second point')
      expect(canvasTab?.content).not.toContain('Second point')
      expect(canvasTab?.content).toContain('First point')
      expect(canvasTab?.content).toContain('Third point')
    })

    it('broadcasts tab:content-updated event with updated content', async () => {
      await executor.executeTool(
        'edit_tab',
        { old_text: 'First point', new_text: 'Modified first' },
        context
      )

      const updates = broadcasts.filter((b) => b.channel === 'tab:content-updated')
      expect(updates).toHaveLength(1)
      const payload = updates[0].args[0] as { episodeId: string; content: string }
      expect(payload.episodeId).toBe(episodeId)
      expect(payload.content).toContain('Modified first')
    })

    it('returns error when old_text is not found in tab', async () => {
      const result = await executor.executeTool(
        'edit_tab',
        { old_text: 'nonexistent text', new_text: 'replacement' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Could not find the specified text')
    })

    it('returns error when parameters are missing', async () => {
      const result = await executor.executeTool(
        'edit_tab',
        { old_text: 'First point' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing required parameters')
    })

    it('works on empty tab (old_text not found)', async () => {
      const tabs = tabService.getTabs(episodeId)
      const canvasTab = tabs.find((t) => t.tab_name === 'Canvas')!
      tabService.updateTabContent(canvasTab.id, '')

      const result = await executor.executeTool(
        'edit_tab',
        { old_text: 'anything', new_text: 'replacement' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Could not find the specified text')
    })
  })

  describe('navigate_tab', () => {
    it('broadcasts tab:navigate for existing tab', async () => {
      tabService.createTab(episodeId, { tab_name: 'Notes', content: 'some content' })

      const result = await executor.executeTool(
        'navigate_tab',
        { tab_name: 'Notes' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('Notes')

      const navs = broadcasts.filter((b) => b.channel === 'tab:navigate')
      expect(navs).toHaveLength(1)
    })

    it('returns error when tab_name is missing', async () => {
      const result = await executor.executeTool(
        'navigate_tab',
        {},
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing required parameter: tab_name')
    })

    it('returns error when tab does not exist', async () => {
      const result = await executor.executeTool(
        'navigate_tab',
        { tab_name: 'Nonexistent' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('not found')
    })
  })

  describe('grep_transcripts', () => {
    let ep2Id: string

    beforeEach(() => {
      ep2Id = db.createEpisode({
        title: 'Second Episode',
        file_path: '/path/to/ep2.mp3',
        status: 'complete',
      })
      db.updateEpisode(ep2Id, {
        transcript: JSON.stringify([
          { timestamp: '00:00:00', text: 'Introduction to deep learning.' },
          { timestamp: '00:02:00', text: 'Machine learning is a subset of AI.' },
          { timestamp: '00:04:00', text: 'Transformers changed NLP forever.' },
        ]),
      })
    })

    it('finds matches across multiple episodes', async () => {
      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: 'machine learning' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results.length).toBe(2)
      const epIds = parsed.results.map((r: { episode_id: string }) => r.episode_id)
      expect(epIds).toContain(episodeId)
      expect(epIds).toContain(ep2Id)
    })

    it('returns timestamp, matched_text, and context', async () => {
      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: 'deep learning' },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results).toHaveLength(1)
      expect(parsed.results[0].timestamp).toBe('00:00:00')
      expect(parsed.results[0].matched_text).toContain('deep learning')
      expect(parsed.results[0].episode_title).toBe('Second Episode')
    })

    it('supports regex search', async () => {
      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: 'LLM|NLP', is_regex: true },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results.length).toBeGreaterThanOrEqual(1)
      expect(parsed.results[0].matched_text).toContain('NLP')
    })

    it('returns error for invalid regex', async () => {
      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: '[invalid', is_regex: true },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Invalid regex')
    })

    it('limits results to episode_ids when specified', async () => {
      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: 'machine learning', episode_ids: [ep2Id] },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results).toHaveLength(1)
      expect(parsed.results[0].episode_id).toBe(ep2Id)
    })

    it('limits results to folder when specified', async () => {
      const folderId = db.createFolder('ML Folder')
      db.updateEpisode(ep2Id, { folder_id: folderId })

      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: 'machine learning', folder_id: folderId },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results).toHaveLength(1)
      expect(parsed.results[0].episode_id).toBe(ep2Id)
    })

    it('caps results at max_results', async () => {
      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: 'machine learning', max_results: 1 },
        context
      )
      const parsed = JSON.parse(result)
      expect(parsed.results).toHaveLength(1)
    })

    it('includes context_segments before and after match', async () => {
      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: 'Machine learning', context_segments: 1 },
        context
      )
      const parsed = JSON.parse(result)
      const ep2Result = parsed.results.find((r: { episode_id: string }) => r.episode_id === ep2Id)
      expect(ep2Result.context_before).toBeDefined()
      expect(ep2Result.context_after).toBeDefined()
    })

    it('skips episodes with no transcript', async () => {
      db.createEpisode({
        title: 'No Transcript Episode',
        file_path: '/path/to/empty.mp3',
        status: 'complete',
      })

      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: 'machine learning' },
        context
      )
      const parsed = JSON.parse(result)
      const epIds = parsed.results.map((r: { episode_id: string }) => r.episode_id)
      expect(epIds).not.toContain(expect.stringContaining('No Transcript'))
    })

    it('handles plain-text transcripts', async () => {
      const plainId = db.createEpisode({
        title: 'Plain Text Ep',
        file_path: '/path/to/plain.mp3',
        status: 'complete',
      })
      db.updateEpisode(plainId, {
        transcript: 'Line about cats\nLine about dogs\nLine about machine learning',
      })

      const result = await executor.executeTool(
        'grep_transcripts',
        { pattern: 'machine learning' },
        context
      )
      const parsed = JSON.parse(result)
      const plainResult = parsed.results.find((r: { episode_id: string }) => r.episode_id === plainId)
      expect(plainResult).toBeDefined()
      expect(plainResult.matched_text).toContain('machine learning')
    })

    it('returns error when pattern is missing', async () => {
      const result = await executor.executeTool('grep_transcripts', {}, context)
      const parsed = JSON.parse(result)
      expect(parsed.error).toContain('Missing required parameter: pattern')
    })
  })
})
