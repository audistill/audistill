import { describe, it, expect, beforeEach, vi } from 'vitest'
import { join } from 'node:path'
import { DatabaseService } from './database-service'
import { RecipeService } from './recipe-service'
import { TabService } from './tab-service'
import { IngestPipeline } from './ingest-pipeline'

const promptsDir = join(__dirname, 'prompts')

function createTestDb(): DatabaseService {
  const db = new DatabaseService(':memory:')
  return db
}

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
    fromWebContents: () => null,
    getFocusedWindow: () => null,
  },
  dialog: { showOpenDialog: vi.fn() },
  ipcMain: { handle: vi.fn() },
  net: { fetch: vi.fn() },
}))

describe('IngestPipeline - recipe execution on ingest', () => {
  let db: DatabaseService
  let recipeService: RecipeService
  let tabService: TabService
  let pipeline: IngestPipeline

  beforeEach(() => {
    db = createTestDb()
    recipeService = new RecipeService(db, promptsDir)
    tabService = new TabService(db)

    const modelManager = { ensureModel: vi.fn() } as any
    const ytdlpService = { detect: vi.fn(), download: vi.fn(), kill: vi.fn() } as any
    pipeline = new IngestPipeline(db, modelManager, recipeService, tabService, ytdlpService)
  })

  describe('summarizeEpisode (now recipe-based)', () => {
    it('fetches the pipeline recipe from settings', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'summarizing',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      const getPipelineSpy = vi.spyOn(recipeService, 'getPipelineRecipe')
      vi.spyOn(recipeService, 'executeRecipe').mockResolvedValue()

      await pipeline.runSummarization(episodeId)

      expect(getPipelineSpy).toHaveBeenCalled()
    })

    it('creates a pipeline tab for the episode before generation begins', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'summarizing',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      let tabCreatedBeforeExecution = false
      vi.spyOn(recipeService, 'executeRecipe').mockImplementation(async () => {
        const tabs = tabService.getTabs(episodeId)
        tabCreatedBeforeExecution = tabs.some((t) => t.is_pipeline === 1)
      })

      await pipeline.runSummarization(episodeId)

      expect(tabCreatedBeforeExecution).toBe(true)
    })

    it('streams tokens into the pipeline tab content', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'summarizing',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      vi.spyOn(recipeService, 'executeRecipe').mockImplementation(
        async (_recipeId, _transcript, onToken) => {
          onToken('Hello ')
          onToken('World')
        }
      )

      await pipeline.runSummarization(episodeId)

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(1)
      expect(tabs[0].content).toBe('Hello World')
      expect(tabs[0].is_pipeline).toBe(1)
    })

    it('extracts title and summary from TITLE:/--- plaintext format', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'test.mp3',
        status: 'summarizing',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      const plaintext = 'TITLE: My Great Episode\n---\n## Summary\n\nContent here'
      vi.spyOn(recipeService, 'executeRecipe').mockImplementation(
        async (_recipeId, _transcript, onToken) => {
          onToken(plaintext)
        }
      )

      await pipeline.runSummarization(episodeId)

      const episode = db.getEpisode(episodeId)
      expect(episode?.title).toBe('My Great Episode')
      const tabs = tabService.getTabs(episodeId)
      expect(tabs[0].content).toBe('## Summary\n\nContent here')
    })

    it('graceful degradation: no separator treats entire output as summary', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'test.mp3',
        status: 'summarizing',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      const noSeparator = '## Just a summary\n\nWith no title line'
      vi.spyOn(recipeService, 'executeRecipe').mockImplementation(
        async (_recipeId, _transcript, onToken) => {
          onToken(noSeparator)
        }
      )

      await pipeline.runSummarization(episodeId)

      const episode = db.getEpisode(episodeId)
      expect(episode?.title).toBe('test.mp3')
      const tabs = tabService.getTabs(episodeId)
      expect(tabs[0].content).toBe('## Just a summary\n\nWith no title line')
    })

    it('sets episode status to complete on success', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'summarizing',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      vi.spyOn(recipeService, 'executeRecipe').mockImplementation(
        async (_recipeId, _transcript, onToken) => {
          onToken('some content')
        }
      )

      await pipeline.runSummarization(episodeId)

      const episode = db.getEpisode(episodeId)
      expect(episode?.status).toBe('complete')
    })

    it('sets episode status to error on failure', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'summarizing',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      vi.spyOn(recipeService, 'executeRecipe').mockRejectedValue(new Error('API failed'))

      await pipeline.runSummarization(episodeId)

      const episode = db.getEpisode(episodeId)
      expect(episode?.status).toBe('error')
      expect(episode?.error_message).toBe('API failed')
    })

    it('sets error when no transcript available', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'summarizing',
      })

      await pipeline.runSummarization(episodeId)

      const episode = db.getEpisode(episodeId)
      expect(episode?.status).toBe('error')
      expect(episode?.error_message).toBe('No transcript available for summarization')
    })

    it('uses the pipeline recipe name as the tab name', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'summarizing',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      vi.spyOn(recipeService, 'executeRecipe').mockResolvedValue()

      await pipeline.runSummarization(episodeId)

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(1)
      const pipelineRecipe = recipeService.getPipelineRecipe()
      expect(tabs[0].tab_name).toBe(pipelineRecipe?.name)
    })

    it('links the tab to the pipeline recipe via recipe_id', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'summarizing',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      vi.spyOn(recipeService, 'executeRecipe').mockResolvedValue()

      await pipeline.runSummarization(episodeId)

      const tabs = tabService.getTabs(episodeId)
      const pipelineRecipe = recipeService.getPipelineRecipe()
      expect(tabs[0].recipe_id).toBe(pipelineRecipe?.id)
    })
  })

  describe('regeneration', () => {
    it('re-executes recipe on an existing pipeline tab', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'complete',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      const pipelineRecipe = recipeService.getPipelineRecipe()!
      const tabId = tabService.createTab(episodeId, {
        recipe_id: pipelineRecipe.id,
        tab_name: pipelineRecipe.name,
        is_pipeline: true,
        content: 'old content',
      })

      vi.spyOn(recipeService, 'executeRecipe').mockImplementation(
        async (_recipeId, _transcript, onToken) => {
          onToken('new content')
        }
      )

      await pipeline.regenerateTab(episodeId, tabId)

      const tabs = tabService.getTabs(episodeId)
      expect(tabs[0].content).toBe('new content')
    })

    it('throws when tab has no recipe_id', async () => {
      const episodeId = db.createEpisode({
        file_path: '/test.mp3',
        title: 'Test',
        status: 'complete',
      })
      db.updateEpisode(episodeId, { transcript: JSON.stringify([{ start: 0, end: 1, text: 'hello' }]) })

      const tabId = tabService.createTab(episodeId, { tab_name: 'Blank' })

      await expect(pipeline.regenerateTab(episodeId, tabId)).rejects.toThrow(
        'Tab has no associated recipe'
      )
    })
  })
})
