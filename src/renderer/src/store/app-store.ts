import { create } from 'zustand'
import type { DbEpisode, DbFolder, DbOpenTab } from '../../../preload/index.d'

export interface Episode {
  id: string
  title: string | null
  file_path: string
  folder_id: string | null
  duration_sec: number | null
  transcript: string | null
  summary: string | null
  status: 'queued' | 'transcribing' | 'summarizing' | 'complete' | 'error'
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
}

export interface Tab {
  id: string
  episodeId: string
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
  hydrated: boolean

  hydrate: () => Promise<void>
  selectEpisode: (id: string) => void
  pinEpisode: (id: string) => void
  activateTab: (id: string) => void
  closeTab: (id: string) => void
  openSettings: () => void
  closeSettings: () => void
  toggleFolder: (id: string) => void
  setSearchQuery: (query: string) => void
  updateEpisode: (id: string, updates: Partial<Episode>) => void
  setEpisodes: (episodes: Episode[]) => void
  setFolders: (folders: Folder[]) => void
  persistTabs: () => void
}

function dbEpisodeToEpisode(row: DbEpisode): Episode {
  return {
    id: row.id,
    title: row.title,
    file_path: row.file_path,
    folder_id: row.folder_id,
    duration_sec: row.duration_sec,
    transcript: row.transcript,
    summary: row.summary,
    status: row.status as Episode['status'],
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function dbFolderToFolder(row: DbFolder): Folder {
  return {
    id: row.id,
    name: row.name,
    parent_id: row.parent_id,
    sort_order: row.sort_order,
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  episodes: [],
  folders: [],
  expandedFolders: new Set<string>(),
  tabs: [],
  activeTabId: null,
  settingsOpen: false,
  searchQuery: '',
  hydrated: false,

  hydrate: async () => {
    const [dbEpisodes, dbFolders, dbTabs] = await Promise.all([
      window.api.getEpisodes(),
      window.api.getFolders(),
      window.api.getOpenTabs(),
    ])

    const episodes = dbEpisodes.map(dbEpisodeToEpisode)
    const folders = dbFolders.map(dbFolderToFolder)
    const tabs: Tab[] = dbTabs.map((t: DbOpenTab) => ({
      id: t.episode_id,
      episodeId: t.episode_id,
      preview: t.is_preview === 1,
    }))

    const validTabs = tabs.filter((t) => episodes.some((ep) => ep.id === t.episodeId))
    const activeTabId = validTabs.length > 0 ? validTabs[0].id : null

    const expandedFolders = new Set(folders.map((f) => f.id))

    set({ episodes, folders, tabs: validTabs, activeTabId, expandedFolders, hydrated: true })
  },

  selectEpisode: (id) => {
    const { tabs } = get()
    const existingTab = tabs.find((t) => t.id === id)
    if (existingTab) {
      set({ activeTabId: id, settingsOpen: false })
    } else {
      const previewIdx = tabs.findIndex((t) => t.preview)
      const newTabs = [...tabs]
      if (previewIdx >= 0) {
        newTabs[previewIdx] = { id, episodeId: id, preview: true }
      } else {
        newTabs.push({ id, episodeId: id, preview: true })
      }
      set({ tabs: newTabs, activeTabId: id, settingsOpen: false })
      get().persistTabs()
    }
  },

  pinEpisode: (id) => {
    const { tabs } = get()
    const existingTab = tabs.find((t) => t.id === id)
    if (existingTab) {
      const newTabs = tabs.map((t) => (t.id === id ? { ...t, preview: false } : t))
      set({ tabs: newTabs, activeTabId: id, settingsOpen: false })
    } else {
      const newTabs = [...tabs, { id, episodeId: id, preview: false }]
      set({ tabs: newTabs, activeTabId: id, settingsOpen: false })
    }
    get().persistTabs()
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
    get().persistTabs()
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

  setEpisodes: (episodes) => set({ episodes }),

  setFolders: (folders) => set({ folders }),

  persistTabs: () => {
    const { tabs } = get()
    const toSave = tabs.map((t, i) => ({
      episode_id: t.episodeId,
      position: i,
      is_preview: t.preview,
    }))
    window.api.saveOpenTabs(toSave)
  },
}))
