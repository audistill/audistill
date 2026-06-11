import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('zustand', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return actual
})

const mockApi = {
  tabsGet: vi.fn().mockResolvedValue([]),
  tabsCreate: vi.fn().mockResolvedValue('new-tab-id'),
  tabsUpdateContent: vi.fn().mockResolvedValue(undefined),
  tabsDelete: vi.fn(),
  tabsRename: vi.fn(),
  tabsExecuteRecipe: vi.fn().mockResolvedValue(undefined),
  exportCopyTab: vi.fn(),
  exportSaveTab: vi.fn(),
  onTabStreamStart: vi.fn().mockReturnValue(() => {}),
  onTabStreamToken: vi.fn().mockReturnValue(() => {}),
  onTabStreamEnd: vi.fn().mockReturnValue(() => {}),
  onTabStreamError: vi.fn().mockReturnValue(() => {}),
  onTabContentUpdated: vi.fn().mockReturnValue(() => {}),
}

;(globalThis as any).window = { api: mockApi }

import { useContentTabStore } from './content-tab-store'

function seedTab(overrides: Partial<{
  id: string
  episode_id: string
  recipe_id: string | null
  tab_name: string
  content: string
  is_pipeline: number
  position: number
  created_at: string
  updated_at: string
}> = {}) {
  return {
    id: 'tab-1',
    episode_id: 'ep-1',
    recipe_id: 'recipe-1',
    tab_name: 'Brief',
    content: 'Original content here',
    is_pipeline: 1,
    position: 0,
    created_at: '2026-06-10',
    updated_at: '2026-06-10',
    ...overrides,
  }
}

describe('content-tab-store — regenerate snapshot', () => {
  beforeEach(() => {
    useContentTabStore.setState({
      tabs: [seedTab()],
      activeTabId: 'tab-1',
      streamingTabId: null,
    })
    vi.clearAllMocks()
  })

  it('startStreaming snapshots current content before clearing', () => {
    useContentTabStore.getState().startStreaming('tab-1')

    const state = useContentTabStore.getState()
    expect(state.streamingTabId).toBe('tab-1')
    expect(state.tabs[0].content).toBe('')
    expect(state.snapshotContent).toBe('Original content here')
  })

  it('endStreaming discards snapshot on success', () => {
    useContentTabStore.getState().startStreaming('tab-1')
    useContentTabStore.getState().appendStreamToken('tab-1', 'New content')
    useContentTabStore.getState().endStreaming('tab-1')

    const state = useContentTabStore.getState()
    expect(state.streamingTabId).toBeNull()
    expect(state.snapshotContent).toBeNull()
    expect(state.tabs[0].content).toBe('New content')
  })

  it('restoreSnapshot reverts content and persists to DB', () => {
    useContentTabStore.getState().startStreaming('tab-1')
    useContentTabStore.getState().appendStreamToken('tab-1', 'Partial...')
    useContentTabStore.getState().restoreSnapshot('tab-1')

    const state = useContentTabStore.getState()
    expect(state.streamingTabId).toBeNull()
    expect(state.snapshotContent).toBeNull()
    expect(state.tabs[0].content).toBe('Original content here')
    expect(mockApi.tabsUpdateContent).toHaveBeenCalledWith('tab-1', 'Original content here')
  })

  it('restoreSnapshot is a no-op when no snapshot exists', () => {
    useContentTabStore.getState().restoreSnapshot('tab-1')

    const state = useContentTabStore.getState()
    expect(state.tabs[0].content).toBe('Original content here')
    expect(mockApi.tabsUpdateContent).not.toHaveBeenCalled()
  })
})
