import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseService } from './database-service'
import { RecipeService } from './recipe-service'
import { TabService } from './tab-service'
import { MigrationService } from './migration-service'
import { join } from 'node:path'

const promptsDir = join(__dirname, 'prompts')

function createTestDb(): DatabaseService {
  const db = new DatabaseService(':memory:')
  return db
}

describe('MigrationService', () => {
  let db: DatabaseService
  let recipeService: RecipeService
  let tabService: TabService
  let migrationService: MigrationService

  beforeEach(() => {
    db = createTestDb()
    recipeService = new RecipeService(db, promptsDir)
    tabService = new TabService(db)
  })

  function createEpisodeWithSummary(
    viewType: 'brief' | 'detailed' | 'full',
    content: string,
    status: 'complete' | 'generating' | 'error' = 'complete'
  ): string {
    const episodeId = db.createEpisode({ file_path: '/test/audio.mp3', title: 'Test' })
    db.createSummary(episodeId, viewType, status)
    if (content) {
      db.updateSummary(episodeId, viewType, { content, status })
    }
    return episodeId
  }

  function createEpisodeWithCanvas(content: string): string {
    const episodeId = db.createEpisode({ file_path: '/test/audio.mp3', title: 'Test' })
    db.saveCanvas(episodeId, content)
    return episodeId
  }

  function tableExists(tableName: string): boolean {
    const row = db.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      tableName
    )
    return !!row
  }

  describe('migrate brief summaries', () => {
    it('migrates brief summary (status=complete) to pipeline tab with correct recipe_id', () => {
      const episodeId = createEpisodeWithSummary('brief', '# Brief summary content')
      const briefRecipe = recipeService.getRecipes().find((r) => r.name === 'Brief')!

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(1)
      expect(tabs[0].tab_name).toBe('Brief')
      expect(tabs[0].content).toBe('# Brief summary content')
      expect(tabs[0].is_pipeline).toBe(1)
      expect(tabs[0].position).toBe(0)
      expect(tabs[0].recipe_id).toBe(briefRecipe.id)
    })

    it('does not migrate brief summary with generating status', () => {
      const episodeId = createEpisodeWithSummary('brief', '', 'generating')

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(0)
    })

    it('does not migrate brief summary with error status', () => {
      const episodeId = createEpisodeWithSummary('brief', '', 'error')

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(0)
    })
  })

  describe('migrate detailed summaries', () => {
    it('migrates detailed summary (status=complete, non-empty) to separate tab', () => {
      const episodeId = db.createEpisode({ file_path: '/test/audio.mp3', title: 'Test' })
      db.createSummary(episodeId, 'brief', 'complete')
      db.updateSummary(episodeId, 'brief', { content: 'Brief content', status: 'complete' })
      db.createSummary(episodeId, 'detailed', 'complete')
      db.updateSummary(episodeId, 'detailed', { content: 'Detailed content', status: 'complete' })

      const detailedRecipe = recipeService.getRecipes().find((r) => r.name === 'Detailed')!

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(2)
      const detailedTab = tabs.find((t) => t.tab_name === 'Detailed Notes')!
      expect(detailedTab).toBeDefined()
      expect(detailedTab.content).toBe('Detailed content')
      expect(detailedTab.is_pipeline).toBe(0)
      expect(detailedTab.position).toBe(1)
      expect(detailedTab.recipe_id).toBe(detailedRecipe.id)
    })

    it('does not migrate detailed summary with empty content', () => {
      const episodeId = db.createEpisode({ file_path: '/test/audio.mp3', title: 'Test' })
      db.createSummary(episodeId, 'detailed', 'complete')

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(0)
    })
  })

  describe('migrate full summaries', () => {
    it('migrates full summary (status=complete, non-empty) to separate tab', () => {
      const episodeId = db.createEpisode({ file_path: '/test/audio.mp3', title: 'Test' })
      db.createSummary(episodeId, 'brief', 'complete')
      db.updateSummary(episodeId, 'brief', { content: 'Brief', status: 'complete' })
      db.createSummary(episodeId, 'full', 'complete')
      db.updateSummary(episodeId, 'full', { content: 'Full content here', status: 'complete' })

      const fullRecipe = recipeService.getRecipes().find((r) => r.name === 'Full')!

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      const fullTab = tabs.find((t) => t.tab_name === 'Full Notes')!
      expect(fullTab).toBeDefined()
      expect(fullTab.content).toBe('Full content here')
      expect(fullTab.is_pipeline).toBe(0)
      expect(fullTab.position).toBe(1)
      expect(fullTab.recipe_id).toBe(fullRecipe.id)
    })
  })

  describe('migrate canvas content', () => {
    it('migrates canvas content to a "Canvas" tab (no recipe_id)', () => {
      const episodeId = createEpisodeWithCanvas('My canvas notes')

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(1)
      expect(tabs[0].tab_name).toBe('Canvas')
      expect(tabs[0].content).toBe('My canvas notes')
      expect(tabs[0].recipe_id).toBeNull()
      expect(tabs[0].is_pipeline).toBe(0)
    })

    it('canvas tab comes after summary tabs', () => {
      const episodeId = db.createEpisode({ file_path: '/test/audio.mp3', title: 'Test' })
      db.createSummary(episodeId, 'brief', 'complete')
      db.updateSummary(episodeId, 'brief', { content: 'Brief', status: 'complete' })
      db.saveCanvas(episodeId, 'Canvas content')

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(2)
      expect(tabs[0].tab_name).toBe('Brief')
      expect(tabs[0].position).toBe(0)
      expect(tabs[1].tab_name).toBe('Canvas')
      expect(tabs[1].position).toBe(1)
    })

    it('does not migrate empty canvas', () => {
      const episodeId = createEpisodeWithCanvas('')

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(0)
    })
  })

  describe('tab positions', () => {
    it('assigns positions correctly: pipeline=0, detailed=1, full=2, canvas=3', () => {
      const episodeId = db.createEpisode({ file_path: '/test/audio.mp3', title: 'Test' })
      db.createSummary(episodeId, 'brief', 'complete')
      db.updateSummary(episodeId, 'brief', { content: 'Brief', status: 'complete' })
      db.createSummary(episodeId, 'detailed', 'complete')
      db.updateSummary(episodeId, 'detailed', { content: 'Detailed', status: 'complete' })
      db.createSummary(episodeId, 'full', 'complete')
      db.updateSummary(episodeId, 'full', { content: 'Full', status: 'complete' })
      db.saveCanvas(episodeId, 'Canvas')

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(4)
      expect(tabs[0].tab_name).toBe('Brief')
      expect(tabs[0].position).toBe(0)
      expect(tabs[1].tab_name).toBe('Detailed Notes')
      expect(tabs[1].position).toBe(1)
      expect(tabs[2].tab_name).toBe('Full Notes')
      expect(tabs[2].position).toBe(2)
      expect(tabs[3].tab_name).toBe('Canvas')
      expect(tabs[3].position).toBe(3)
    })
  })

  describe('old tables dropped', () => {
    it('drops episode_summaries table after migration', () => {
      createEpisodeWithSummary('brief', 'content')
      expect(tableExists('episode_summaries')).toBe(true)

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      expect(tableExists('episode_summaries')).toBe(false)
    })

    it('drops episode_canvas table after migration', () => {
      createEpisodeWithCanvas('content')
      expect(tableExists('episode_canvas')).toBe(true)

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      expect(tableExists('episode_canvas')).toBe(false)
    })
  })

  describe('idempotency', () => {
    it('skips episodes that already have tabs', () => {
      const episodeId = createEpisodeWithSummary('brief', 'Brief content')
      const briefRecipe = recipeService.getRecipes().find((r) => r.name === 'Brief')!

      tabService.createTab(episodeId, {
        recipe_id: briefRecipe.id,
        tab_name: 'Brief',
        is_pipeline: true,
        content: 'Existing content',
      })

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(1)
      expect(tabs[0].content).toBe('Existing content')
    })

    it('is safe to run when old tables already dropped', () => {
      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      expect(tableExists('episode_summaries')).toBe(false)
      expect(tableExists('episode_canvas')).toBe(false)

      expect(() => migrationService.run()).not.toThrow()
    })
  })

  describe('episodes with no complete summaries', () => {
    it('does not create tabs for episodes with only generating/error summaries', () => {
      const episodeId = db.createEpisode({ file_path: '/test/audio.mp3', title: 'Test' })
      db.createSummary(episodeId, 'brief', 'generating')
      db.createSummary(episodeId, 'detailed', 'error')

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(0)
    })
  })

  describe('settings migration', () => {
    it('migrates model_fast to Brief recipe model_override', () => {
      db.setSetting('model_fast', 'google/gemini-flash-lite')
      const briefRecipe = recipeService.getRecipes().find((r) => r.name === 'Brief')!
      expect(briefRecipe.model_override).toBeNull()

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const updatedRecipe = recipeService.getRecipe(briefRecipe.id)!
      expect(updatedRecipe.model_override).toBe('google/gemini-flash-lite')
    })

    it('migrates model_quality to default model setting', () => {
      db.setSetting('model_quality', 'anthropic/claude-sonnet')

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      expect(db.getSetting('default_model')).toBe('anthropic/claude-sonnet')
    })

    it('does not overwrite model_override if already set on Brief recipe', () => {
      db.setSetting('model_fast', 'google/gemini-flash-lite')
      const briefRecipe = recipeService.getRecipes().find((r) => r.name === 'Brief')!
      recipeService.updateRecipe(briefRecipe.id, { model_override: 'existing-model' })

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const updatedRecipe = recipeService.getRecipe(briefRecipe.id)!
      expect(updatedRecipe.model_override).toBe('existing-model')
    })

    it('does nothing when model_fast is not set', () => {
      const briefRecipe = recipeService.getRecipes().find((r) => r.name === 'Brief')!

      migrationService = new MigrationService(db, recipeService, tabService)
      migrationService.run()

      const updatedRecipe = recipeService.getRecipe(briefRecipe.id)!
      expect(updatedRecipe.model_override).toBeNull()
    })
  })
})
