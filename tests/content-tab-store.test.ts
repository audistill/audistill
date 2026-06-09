import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useContentTabStore, ContentTab } from '../src/renderer/src/store/content-tab-store'

const mockTabs: ContentTab[] = [
  {
    id: 'tab-1',
    episode_id: 'ep-1',
    recipe_id: 'recipe-brief',
    tab_name: 'Brief',
    content: '# Brief summary',
    is_pipeline: 1,
    position: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 'tab-2',
    episode_id: 'ep-1',
    recipe_id: null,
    tab_name: 'Notes',
    content: 'Some notes',
    is_pipeline: 0,
    position: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
]

const mockApi = {
  tabsGet: vi.fn().mockResolvedValue(mockTabs),
  tabsCreate: vi.fn().mockResolvedValue('tab-3'),
  tabsUpdateContent: vi.fn().mockResolvedValue(undefined),
  tabsDelete: vi.fn().mockResolvedValue(undefined),
  tabsRename: vi.fn().mockResolvedValue(undefined),
}

;(globalThis as any).window = { api: mockApi }

describe('ContentTabStore', () => {
  beforeEach(() => {
    useContentTabStore.setState({ tabs: [], activeTabId: null, loading: false })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadTabs', () => {
    it('loads tabs from API and sets first as active', async () => {
      await useContentTabStore.getState().loadTabs('ep-1')

      const state = useContentTabStore.getState()
      expect(state.tabs).toEqual(mockTabs)
      expect(state.activeTabId).toBe('tab-1')
      expect(state.loading).toBe(false)
      expect(mockApi.tabsGet).toHaveBeenCalledWith('ep-1')
    })

    it('sets activeTabId to null when no tabs returned', async () => {
      mockApi.tabsGet.mockResolvedValueOnce([])

      await useContentTabStore.getState().loadTabs('ep-empty')

      const state = useContentTabStore.getState()
      expect(state.tabs).toEqual([])
      expect(state.activeTabId).toBeNull()
    })
  })

  describe('setActiveTab', () => {
    it('updates activeTabId', () => {
      useContentTabStore.setState({ tabs: mockTabs, activeTabId: 'tab-1' })

      useContentTabStore.getState().setActiveTab('tab-2')

      expect(useContentTabStore.getState().activeTabId).toBe('tab-2')
    })
  })

  describe('createTab', () => {
    it('creates a tab and sets it as active', async () => {
      const newTabs = [...mockTabs, {
        id: 'tab-3',
        episode_id: 'ep-1',
        recipe_id: null,
        tab_name: 'Untitled',
        content: '',
        is_pipeline: 0,
        position: 2,
        created_at: '2026-01-02',
        updated_at: '2026-01-02',
      }]
      mockApi.tabsGet.mockResolvedValueOnce(newTabs)

      const tabId = await useContentTabStore.getState().createTab('ep-1', { tab_name: 'Untitled' })

      expect(tabId).toBe('tab-3')
      expect(useContentTabStore.getState().activeTabId).toBe('tab-3')
      expect(mockApi.tabsCreate).toHaveBeenCalledWith('ep-1', { tab_name: 'Untitled' })
    })
  })

  describe('updateContent', () => {
    it('updates content in state immediately', () => {
      useContentTabStore.setState({ tabs: mockTabs, activeTabId: 'tab-1' })

      useContentTabStore.getState().updateContent('tab-1', 'Updated content')

      const tab = useContentTabStore.getState().tabs.find((t) => t.id === 'tab-1')
      expect(tab?.content).toBe('Updated content')
    })

    it('debounces the IPC call', async () => {
      vi.useFakeTimers()
      useContentTabStore.setState({ tabs: mockTabs, activeTabId: 'tab-1' })

      useContentTabStore.getState().updateContent('tab-1', 'First update')
      useContentTabStore.getState().updateContent('tab-1', 'Second update')

      expect(mockApi.tabsUpdateContent).not.toHaveBeenCalled()

      vi.advanceTimersByTime(500)

      expect(mockApi.tabsUpdateContent).toHaveBeenCalledTimes(1)
      expect(mockApi.tabsUpdateContent).toHaveBeenCalledWith('tab-1', 'Second update')
      vi.useRealTimers()
    })
  })

  describe('deleteTab', () => {
    it('removes the tab from state', () => {
      useContentTabStore.setState({ tabs: mockTabs, activeTabId: 'tab-2' })

      useContentTabStore.getState().deleteTab('tab-2')

      const state = useContentTabStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].id).toBe('tab-1')
      expect(mockApi.tabsDelete).toHaveBeenCalledWith('tab-2')
    })

    it('selects last remaining tab when active tab is deleted', () => {
      useContentTabStore.setState({ tabs: mockTabs, activeTabId: 'tab-2' })

      useContentTabStore.getState().deleteTab('tab-2')

      expect(useContentTabStore.getState().activeTabId).toBe('tab-1')
    })

    it('does not change activeTabId when non-active tab is deleted', () => {
      useContentTabStore.setState({ tabs: mockTabs, activeTabId: 'tab-1' })

      useContentTabStore.getState().deleteTab('tab-2')

      expect(useContentTabStore.getState().activeTabId).toBe('tab-1')
    })

    it('sets activeTabId to null when last tab is deleted', () => {
      const singleTab = [mockTabs[1]]
      useContentTabStore.setState({ tabs: singleTab, activeTabId: 'tab-2' })

      useContentTabStore.getState().deleteTab('tab-2')

      expect(useContentTabStore.getState().activeTabId).toBeNull()
    })
  })

  describe('renameTab', () => {
    it('renames the tab in state and calls IPC', () => {
      useContentTabStore.setState({ tabs: mockTabs, activeTabId: 'tab-2' })

      useContentTabStore.getState().renameTab('tab-2', 'Renamed')

      const tab = useContentTabStore.getState().tabs.find((t) => t.id === 'tab-2')
      expect(tab?.tab_name).toBe('Renamed')
      expect(mockApi.tabsRename).toHaveBeenCalledWith('tab-2', 'Renamed')
    })
  })

  describe('clearTabs', () => {
    it('clears all tabs and activeTabId', () => {
      useContentTabStore.setState({ tabs: mockTabs, activeTabId: 'tab-1' })

      useContentTabStore.getState().clearTabs()

      const state = useContentTabStore.getState()
      expect(state.tabs).toEqual([])
      expect(state.activeTabId).toBeNull()
    })
  })
})
