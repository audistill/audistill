import { create } from 'zustand'

export interface ContentTab {
  id: string
  episode_id: string
  recipe_id: string | null
  tab_name: string
  content: string
  is_pipeline: number
  position: number
  created_at: string
  updated_at: string
}

interface ContentTabState {
  tabs: ContentTab[]
  activeTabId: string | null
  loading: boolean
  streamingTabId: string | null
  snapshotContent: string | null

  loadTabs: (episodeId: string) => Promise<void>
  setActiveTab: (tabId: string) => void
  createTab: (episodeId: string, options?: { recipe_id?: string | null; tab_name?: string; is_pipeline?: boolean; content?: string }) => Promise<string>
  updateContent: (tabId: string, content: string) => void
  setContentFromMain: (tabId: string, content: string) => void
  deleteTab: (tabId: string) => void
  renameTab: (tabId: string, name: string) => void
  clearTabs: () => void
  appendStreamToken: (tabId: string, token: string) => void
  startStreaming: (tabId: string) => void
  endStreaming: (tabId: string) => void
  restoreSnapshot: (tabId: string) => void
  regenerateTab: (episodeId: string, tabId: string) => Promise<void>
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export const useContentTabStore = create<ContentTabState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  loading: false,
  streamingTabId: null,
  snapshotContent: null,

  loadTabs: async (episodeId: string) => {
    set({ loading: true })
    const tabs = await window.api.tabsGet(episodeId)
    const activeTabId = tabs.length > 0 ? tabs[0].id : null
    set({ tabs, activeTabId, loading: false })
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId })
  },

  createTab: async (episodeId, options = {}) => {
    const tabId = await window.api.tabsCreate(episodeId, options)
    const tabs = await window.api.tabsGet(episodeId)
    set({ tabs, activeTabId: tabId })
    return tabId
  },

  updateContent: (tabId: string, content: string) => {
    const { tabs } = get()
    set({
      tabs: tabs.map((t) => (t.id === tabId ? { ...t, content } : t)),
    })

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      window.api.tabsUpdateContent(tabId, content)
    }, 500)
  },

  setContentFromMain: (tabId: string, content: string) => {
    const { tabs } = get()
    set({
      tabs: tabs.map((t) => (t.id === tabId ? { ...t, content } : t)),
    })
  },

  deleteTab: (tabId: string) => {
    window.api.tabsDelete(tabId)
    const { tabs, activeTabId } = get()
    const newTabs = tabs.filter((t) => t.id !== tabId)
    let newActive = activeTabId
    if (activeTabId === tabId) {
      newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
    }
    set({ tabs: newTabs, activeTabId: newActive })
  },

  renameTab: (tabId: string, name: string) => {
    window.api.tabsRename(tabId, name)
    const { tabs } = get()
    set({
      tabs: tabs.map((t) => (t.id === tabId ? { ...t, tab_name: name } : t)),
    })
  },

  clearTabs: () => {
    set({ tabs: [], activeTabId: null, streamingTabId: null })
  },

  appendStreamToken: (tabId: string, token: string) => {
    const { tabs } = get()
    set({
      tabs: tabs.map((t) =>
        t.id === tabId ? { ...t, content: t.content + token } : t
      ),
    })
  },

  startStreaming: (tabId: string) => {
    const { tabs } = get()
    const currentTab = tabs.find((t) => t.id === tabId)
    set({
      streamingTabId: tabId,
      snapshotContent: currentTab?.content ?? null,
      tabs: tabs.map((t) => (t.id === tabId ? { ...t, content: '' } : t)),
      activeTabId: tabId,
    })
  },

  endStreaming: (_tabId: string) => {
    set({ streamingTabId: null, snapshotContent: null })
  },

  restoreSnapshot: (tabId: string) => {
    const { snapshotContent, tabs } = get()
    if (snapshotContent === null) return
    set({
      streamingTabId: null,
      snapshotContent: null,
      tabs: tabs.map((t) => (t.id === tabId ? { ...t, content: snapshotContent } : t)),
    })
    window.api.tabsUpdateContent(tabId, snapshotContent)
  },

  regenerateTab: async (episodeId: string, tabId: string) => {
    await window.api.tabsExecuteRecipe(episodeId, tabId)
  },
}))
