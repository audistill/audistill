import { create } from 'zustand'
import { Episode, Folder, mockEpisodes, mockFolders } from './mock-data'

export interface Tab {
  id: string
  preview: boolean
}

interface AppState {
  episodes: Episode[]
  folders: Folder[]
  expandedFolders: Set<string>
  tabs: Tab[]
  activeTabId: string | null
  settingsOpen: boolean
  searchQuery: string

  selectEpisode: (id: string) => void
  pinEpisode: (id: string) => void
  activateTab: (id: string) => void
  closeTab: (id: string) => void
  openSettings: () => void
  closeSettings: () => void
  toggleFolder: (id: string) => void
  setSearchQuery: (query: string) => void
  updateEpisode: (id: string, updates: Partial<Episode>) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  episodes: mockEpisodes,
  folders: mockFolders,
  expandedFolders: new Set(['podcasts']),
  tabs: [
    { id: 'ep1', preview: false },
    { id: 'ep2', preview: true },
  ],
  activeTabId: 'ep1',
  settingsOpen: false,
  searchQuery: '',

  selectEpisode: (id) => {
    const { tabs } = get()
    const existingTab = tabs.find((t) => t.id === id)
    if (existingTab) {
      set({ activeTabId: id, settingsOpen: false })
    } else {
      const previewIdx = tabs.findIndex((t) => t.preview)
      const newTabs = [...tabs]
      if (previewIdx >= 0) {
        newTabs[previewIdx] = { id, preview: true }
      } else {
        newTabs.push({ id, preview: true })
      }
      set({ tabs: newTabs, activeTabId: id, settingsOpen: false })
    }
  },

  pinEpisode: (id) => {
    const { tabs } = get()
    const existingTab = tabs.find((t) => t.id === id)
    if (existingTab) {
      set({
        tabs: tabs.map((t) => (t.id === id ? { ...t, preview: false } : t)),
        activeTabId: id,
        settingsOpen: false,
      })
    } else {
      set({
        tabs: [...tabs, { id, preview: false }],
        activeTabId: id,
        settingsOpen: false,
      })
    }
  },

  activateTab: (id) => set({ activeTabId: id, settingsOpen: false }),

  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    const newTabs = tabs.filter((t) => t.id !== id)
    let newActive = activeTabId
    if (activeTabId === id) {
      newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
    }
    set({ tabs: newTabs, activeTabId: newActive })
  },

  openSettings: () => set({ settingsOpen: true }),

  closeSettings: () => {
    const { tabs } = get()
    const newActive = tabs.length > 0 ? tabs[tabs.length - 1].id : null
    set({ settingsOpen: false, activeTabId: newActive })
  },

  toggleFolder: (id) => {
    const { expandedFolders } = get()
    const next = new Set(expandedFolders)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    set({ expandedFolders: next })
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  updateEpisode: (id, updates) => {
    const { episodes } = get()
    set({ episodes: episodes.map((ep) => (ep.id === id ? { ...ep, ...updates } : ep)) })
  },
}))
