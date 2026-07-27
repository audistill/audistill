import { describe, it, expect, beforeEach } from 'vitest'
import { TabService } from './tab-service'
import { DatabaseService } from './database-service'
import { RecipeService } from './recipe-service'
import { join } from 'node:path'

const promptsDir = join(__dirname, 'prompts')

function createTestDb(): DatabaseService {
  const db = new DatabaseService(':memory:')
  return db
}

describe('TabService', () => {
  let db: DatabaseService
  let recipeService: RecipeService
  let tabService: TabService

  beforeEach(() => {
    db = createTestDb()
    recipeService = new RecipeService(db, promptsDir)
    tabService = new TabService(db)
    db.createEpisode({ file_path: '/test/audio.mp3', title: 'Test Episode' })
  })

  function getFirstEpisodeId(): string {
    const episodes = db.getEpisodes()
    return episodes[0].id
  }

  describe('createTab', () => {
    it('creates a tab from a recipe with correct name and recipe_id', () => {
      const episodeId = getFirstEpisodeId()
      const recipes = recipeService.getRecipes()
      const briefRecipe = recipes.find((r) => r.name === 'Brief')!

      const tabId = tabService.createTab(episodeId, {
        recipe_id: briefRecipe.id,
        tab_name: briefRecipe.name,
        is_pipeline: true,
      })

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(1)
      expect(tabs[0].id).toBe(tabId)
      expect(tabs[0].recipe_id).toBe(briefRecipe.id)
      expect(tabs[0].tab_name).toBe('Brief')
      expect(tabs[0].is_pipeline).toBe(1)
      expect(tabs[0].episode_id).toBe(episodeId)
      expect(tabs[0].generated_at).toBeNull()
      expect(tabs[0].generated_model).toBeNull()
    })

    it('creates a blank tab with null recipe_id and "Untitled" name', () => {
      const episodeId = getFirstEpisodeId()

      const tabId = tabService.createTab(episodeId, {})

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(1)
      expect(tabs[0].id).toBe(tabId)
      expect(tabs[0].recipe_id).toBeNull()
      expect(tabs[0].tab_name).toBe('Untitled')
      expect(tabs[0].is_pipeline).toBe(0)
      expect(tabs[0].generated_at).toBeNull()
      expect(tabs[0].generated_model).toBeNull()
    })

    it('creates and returns a tab with provenance fields when provided', () => {
      const episodeId = getFirstEpisodeId()
      const generatedAt = '2026-07-01T12:00:00.000Z'

      const tabId = tabService.createTab(episodeId, {
        tab_name: 'Brief',
        generated_at: generatedAt,
        generated_model: 'google/gemini-3.5-flash',
      })

      const tab = tabService.getTabs(episodeId)[0]
      expect(tab.id).toBe(tabId)
      expect(tab.generated_at).toBe(generatedAt)
      expect(tab.generated_model).toBe('google/gemini-3.5-flash')
    })

    it('auto-increments position on creation', () => {
      const episodeId = getFirstEpisodeId()

      tabService.createTab(episodeId, { tab_name: 'First' })
      tabService.createTab(episodeId, { tab_name: 'Second' })
      tabService.createTab(episodeId, { tab_name: 'Third' })

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(3)
      expect(tabs[0].position).toBe(0)
      expect(tabs[1].position).toBe(1)
      expect(tabs[2].position).toBe(2)
    })
  })

  describe('getTabs', () => {
    it('returns tabs ordered by position', () => {
      const episodeId = getFirstEpisodeId()

      tabService.createTab(episodeId, { tab_name: 'A' })
      tabService.createTab(episodeId, { tab_name: 'B' })
      tabService.createTab(episodeId, { tab_name: 'C' })

      const tabs = tabService.getTabs(episodeId)
      expect(tabs.map((t) => t.tab_name)).toEqual(['A', 'B', 'C'])
    })

    it('returns empty array for episode with no tabs', () => {
      const episodeId = getFirstEpisodeId()
      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toEqual([])
    })

    it('only returns tabs for the specified episode', () => {
      const episodeId = getFirstEpisodeId()
      const otherId = db.createEpisode({ file_path: '/other.mp3' })

      tabService.createTab(episodeId, { tab_name: 'Tab A' })
      tabService.createTab(otherId, { tab_name: 'Tab B' })

      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(1)
      expect(tabs[0].tab_name).toBe('Tab A')
    })
  })

  describe('updateTabContent', () => {
    it('updates the content of a tab', () => {
      const episodeId = getFirstEpisodeId()
      const tabId = tabService.createTab(episodeId, { tab_name: 'Notes' })

      tabService.updateTabContent(tabId, '# My Notes\n\nSome content')

      const tabs = tabService.getTabs(episodeId)
      expect(tabs[0].content).toBe('# My Notes\n\nSome content')
    })

    it('updates the updated_at timestamp', () => {
      const episodeId = getFirstEpisodeId()
      const tabId = tabService.createTab(episodeId, { tab_name: 'Notes' })

      const before = tabService.getTabs(episodeId)[0].updated_at

      tabService.updateTabContent(tabId, 'new content')

      const after = tabService.getTabs(episodeId)[0].updated_at
      expect(after).toBeDefined()
      expect(after >= before).toBe(true)
    })

    it('updates generated content and provenance together', () => {
      const episodeId = getFirstEpisodeId()
      const tabId = tabService.createTab(episodeId, { tab_name: 'Brief' })

      tabService.updateTabGeneratedContent(tabId, 'generated content', {
        generated_at: '2026-07-01T12:00:00.000Z',
        generated_model: 'anthropic/claude-sonnet-4',
      })

      const tab = tabService.getTab(tabId)!
      expect(tab.content).toBe('generated content')
      expect(tab.generated_at).toBe('2026-07-01T12:00:00.000Z')
      expect(tab.generated_model).toBe('anthropic/claude-sonnet-4')
    })

    it('manual content edits do not update existing provenance', () => {
      const episodeId = getFirstEpisodeId()
      const tabId = tabService.createTab(episodeId, {
        tab_name: 'Brief',
        content: 'old content',
        generated_at: '2026-07-01T12:00:00.000Z',
        generated_model: 'google/gemini-3.5-flash',
      })

      tabService.updateTabContent(tabId, 'manual edit')

      const tab = tabService.getTab(tabId)!
      expect(tab.content).toBe('manual edit')
      expect(tab.generated_at).toBe('2026-07-01T12:00:00.000Z')
      expect(tab.generated_model).toBe('google/gemini-3.5-flash')
    })
  })

  describe('deleteTab', () => {
    it('deletes a regular tab', () => {
      const episodeId = getFirstEpisodeId()
      tabService.createTab(episodeId, { tab_name: 'Deletable' })
      const tabs = tabService.getTabs(episodeId)
      expect(tabs).toHaveLength(1)

      tabService.deleteTab(tabs[0].id)

      expect(tabService.getTabs(episodeId)).toHaveLength(0)
    })

    it('deletes a Pipeline-created tab without deleting its Episode or Transcript', () => {
      const episodeId = getFirstEpisodeId()
      db.updateEpisode(episodeId, { transcript: 'Original transcript', status: 'complete' })
      const tabId = tabService.createTab(episodeId, {
        tab_name: 'Brief',
        is_pipeline: true,
        content: 'Generated content',
      })

      tabService.deleteTab(tabId)

      expect(tabService.getTabs(episodeId)).toHaveLength(0)
      const episode = db.getEpisode(episodeId)!
      expect(episode).toBeDefined()
      expect(episode.transcript).toBe('Original transcript')
      expect(episode.status).toBe('complete')
    })
  })

  describe('renameTab', () => {
    it('renames a tab', () => {
      const episodeId = getFirstEpisodeId()
      const tabId = tabService.createTab(episodeId, { tab_name: 'Old Name' })

      tabService.renameTab(tabId, 'New Name')

      const tabs = tabService.getTabs(episodeId)
      expect(tabs[0].tab_name).toBe('New Name')
    })
  })

  describe('reorderTabs', () => {
    it('reorders tabs according to provided id array', () => {
      const episodeId = getFirstEpisodeId()
      const id1 = tabService.createTab(episodeId, { tab_name: 'A' })
      const id2 = tabService.createTab(episodeId, { tab_name: 'B' })
      const id3 = tabService.createTab(episodeId, { tab_name: 'C' })

      tabService.reorderTabs(episodeId, [id3, id1, id2])

      const tabs = tabService.getTabs(episodeId)
      expect(tabs[0].tab_name).toBe('C')
      expect(tabs[1].tab_name).toBe('A')
      expect(tabs[2].tab_name).toBe('B')
    })
  })
})
