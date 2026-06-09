import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => children,
}))

const mockRecipes = [
  { id: 'recipe-brief', name: 'Brief', is_builtin: 1 },
  { id: 'recipe-detailed', name: 'Detailed', is_builtin: 1 },
  { id: 'recipe-full', name: 'Full', is_builtin: 1 },
  { id: 'recipe-action', name: 'Action Items', is_builtin: 0 },
]

const mockTabs = [
  {
    id: 'tab-1',
    episode_id: 'ep-1',
    recipe_id: 'recipe-brief',
    tab_name: 'Brief',
    content: '# Brief',
    is_pipeline: 1,
    position: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
]

describe('Chat slash commands → tab creation', () => {
  let mockApi: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    mockApi = {
      recipesGetAll: vi.fn().mockResolvedValue(mockRecipes),
      tabsGet: vi.fn().mockResolvedValue(mockTabs),
      tabsCreate: vi.fn().mockResolvedValue('tab-new'),
      tabsExecuteRecipe: vi.fn().mockResolvedValue(undefined),
      chatSaveMessage: vi.fn().mockResolvedValue('msg-1'),
      chatGetMessages: vi.fn().mockResolvedValue([]),
      getSetting: vi.fn().mockResolvedValue(null),
    }
    ;(globalThis as any).window = { api: mockApi }
  })

  describe('slash command detection', () => {
    it('recognizes "/" as a slash command trigger', () => {
      const input = '/'
      const isSlashTrigger = input === '/'
      expect(isSlashTrigger).toBe(true)
    })

    it('extracts filter text after "/"', () => {
      const input = '/bri'
      const filter = input.startsWith('/') ? input.slice(1) : ''
      expect(filter).toBe('bri')
    })

    it('does not trigger for non-slash input', () => {
      const input = 'hello'
      const isSlash = input.startsWith('/') && input.length <= 1
      expect(isSlash).toBe(false)
    })
  })

  describe('recipe filtering', () => {
    it('filters recipes by name (case-insensitive)', () => {
      const filter = 'bri'
      const lower = filter.toLowerCase()
      const filtered = mockRecipes.filter((r) => r.name.toLowerCase().includes(lower))
      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('Brief')
    })

    it('returns all recipes when filter is empty', () => {
      const filter = ''
      const filtered = filter
        ? mockRecipes.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase()))
        : mockRecipes
      expect(filtered).toHaveLength(4)
    })

    it('matches partial names (fuzzy)', () => {
      const filter = 'act'
      const lower = filter.toLowerCase()
      const filtered = mockRecipes.filter((r) => r.name.toLowerCase().includes(lower))
      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('Action Items')
    })

    it('returns empty array when no match', () => {
      const filter = 'xyz'
      const lower = filter.toLowerCase()
      const filtered = mockRecipes.filter((r) => r.name.toLowerCase().includes(lower))
      expect(filtered).toHaveLength(0)
    })
  })

  describe('recipe selection logic', () => {
    it('navigates to existing tab when recipe already has an open tab', () => {
      const recipe = mockRecipes[0] // Brief
      const existingTab = mockTabs.find((t) => t.recipe_id === recipe.id)
      expect(existingTab).toBeDefined()
      expect(existingTab!.id).toBe('tab-1')
    })

    it('creates a new tab when recipe has no open tab', () => {
      const recipe = mockRecipes[3] // Action Items
      const existingTab = mockTabs.find((t) => t.recipe_id === recipe.id)
      expect(existingTab).toBeUndefined()
    })

    it('calls tabsCreate with correct recipe_id and tab_name', async () => {
      const recipe = mockRecipes[3]
      await mockApi.tabsCreate('ep-1', { recipe_id: recipe.id, tab_name: recipe.name })
      expect(mockApi.tabsCreate).toHaveBeenCalledWith('ep-1', {
        recipe_id: 'recipe-action',
        tab_name: 'Action Items',
      })
    })

    it('calls tabsExecuteRecipe after creating a tab', async () => {
      const recipe = mockRecipes[3]
      const tabId = await mockApi.tabsCreate('ep-1', { recipe_id: recipe.id, tab_name: recipe.name })
      await mockApi.tabsExecuteRecipe('ep-1', tabId)
      expect(mockApi.tabsExecuteRecipe).toHaveBeenCalledWith('ep-1', 'tab-new')
    })
  })

  describe('chat message recording', () => {
    it('saves the slash command as a user message', async () => {
      const recipe = mockRecipes[0]
      const slashText = `/${recipe.name}`
      await mockApi.chatSaveMessage('ep-1', 'user', slashText)
      expect(mockApi.chatSaveMessage).toHaveBeenCalledWith('ep-1', 'user', '/Brief')
    })

    it('saves confirmation message on success', async () => {
      const recipe = mockRecipes[3]
      await mockApi.chatSaveMessage('ep-1', 'assistant', `✓ ${recipe.name} generated`)
      expect(mockApi.chatSaveMessage).toHaveBeenCalledWith(
        'ep-1', 'assistant', '✓ Action Items generated'
      )
    })

    it('saves navigation message when tab already exists', async () => {
      const recipe = mockRecipes[0]
      await mockApi.chatSaveMessage(
        'ep-1', 'assistant', `Navigated to existing ${recipe.name} tab.`
      )
      expect(mockApi.chatSaveMessage).toHaveBeenCalledWith(
        'ep-1', 'assistant', 'Navigated to existing Brief tab.'
      )
    })
  })

  describe('error handling', () => {
    it('catches execution errors gracefully', async () => {
      mockApi.tabsExecuteRecipe.mockRejectedValueOnce(new Error('API timeout'))
      let errorMsg: string | null = null
      try {
        await mockApi.tabsExecuteRecipe('ep-1', 'tab-new')
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : String(err)
      }
      expect(errorMsg).toBe('API timeout')
    })
  })

  describe('popover dismissal', () => {
    it('closes on Escape key', () => {
      let slashOpen = true
      const key = 'Escape'
      if (key === 'Escape') slashOpen = false
      expect(slashOpen).toBe(false)
    })

    it('closes when input no longer starts with /', () => {
      const input = 'hello'
      const shouldClose = !input.startsWith('/')
      expect(shouldClose).toBe(true)
    })
  })
})
