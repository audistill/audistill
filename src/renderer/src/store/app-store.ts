import { create } from 'zustand'
import type { DbEpisode, DbFolder, DbOpenTab } from '../../../preload/index.d'

export interface Episode {
  id: string
  title: string | null
  file_path: string
  folder_id: string | null
  duration_sec: number | null
  transcript: string | null
  status: 'queued' | 'transcribing' | 'summarizing' | 'complete' | 'error' | 'cancelled'
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

export interface ProgressEntry {
  percent: number
  startedAt: number
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
  progress: Record<string, ProgressEntry>
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  leftSidebarWidth: number
  rightSidebarWidth: number
  activeContentView: 'episode' | 'canvas'

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
  renameEpisode: (id: string, title: string) => Promise<void>
  moveEpisode: (id: string, folderId: string | null) => Promise<void>
  deleteEpisode: (id: string) => Promise<void>
  createFolder: (name: string, parentId?: string | null) => Promise<string>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  setProgress: (episodeId: string, percent: number) => void
  clearProgress: (episodeId: string) => void
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setLeftSidebarWidth: (width: number) => void
  setRightSidebarWidth: (width: number) => void
  setActiveContentView: (view: 'episode' | 'canvas') => void
}

function dbEpisodeToEpisode(row: DbEpisode): Episode {
  return {
    id: row.id,
    title: row.title,
    file_path: row.file_path,
    folder_id: row.folder_id,
    duration_sec: row.duration_sec,
    transcript: row.transcript,
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
  progress: {},
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  leftSidebarWidth: 280,
  rightSidebarWidth: 360,
  activeContentView: 'episode',

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
    const exists = episodes.some((ep) => ep.id === id)
    if (exists) {
      set({ episodes: episodes.map((ep) => (ep.id === id ? { ...ep, ...updates } : ep)) })
    } else {
      const newEpisode: Episode = {
        id,
        title: null,
        file_path: '',
        folder_id: null,
        duration_sec: null,
        transcript: null,
        status: 'queued',
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updates,
      }
      set({ episodes: [newEpisode, ...episodes] })
    }
    if (updates.status === 'complete' || updates.status === 'error' || updates.status === 'cancelled') {
      get().clearProgress(id)
    }
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

  renameEpisode: async (id, title) => {
    await window.api.renameEpisode(id, title)
    const { episodes } = get()
    set({ episodes: episodes.map((ep) => (ep.id === id ? { ...ep, title } : ep)) })
  },

  moveEpisode: async (id, folderId) => {
    await window.api.moveEpisode(id, folderId)
    const { episodes } = get()
    set({ episodes: episodes.map((ep) => (ep.id === id ? { ...ep, folder_id: folderId } : ep)) })
  },

  deleteEpisode: async (id) => {
    await window.api.deleteEpisode(id)
    const { episodes, tabs, activeTabId } = get()
    const newEpisodes = episodes.filter((ep) => ep.id !== id)
    const newTabs = tabs.filter((t) => t.episodeId !== id)
    let newActive = activeTabId
    if (activeTabId === id) {
      newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
    }
    set({ episodes: newEpisodes, tabs: newTabs, activeTabId: newActive })
    get().persistTabs()
  },

  createFolder: async (name, parentId) => {
    const id = await window.api.createFolder(name, parentId ?? null)
    const { folders, expandedFolders } = get()
    const newFolder: Folder = {
      id,
      name,
      parent_id: parentId ?? null,
      sort_order: folders.length,
    }
    const next = new Set(expandedFolders)
    if (parentId) next.add(parentId)
    set({ folders: [...folders, newFolder], expandedFolders: next })
    return id
  },

  renameFolder: async (id, name) => {
    await window.api.renameFolder(id, name)
    const { folders } = get()
    set({ folders: folders.map((f) => (f.id === id ? { ...f, name } : f)) })
  },

  deleteFolder: async (id) => {
    await window.api.deleteFolder(id)
    const { folders, episodes, tabs, activeTabId } = get()
    const removedIds = new Set<string>()
    const collectChildren = (parentId: string): void => {
      removedIds.add(parentId)
      folders.filter((f) => f.parent_id === parentId).forEach((f) => collectChildren(f.id))
    }
    collectChildren(id)
    const updatedEpisodes = episodes.map((ep) =>
      ep.folder_id && removedIds.has(ep.folder_id) ? { ...ep, folder_id: null } : ep
    )
    const closedEpisodeIds = new Set(
      updatedEpisodes.filter((ep) => ep.folder_id === null && episodes.find((e) => e.id === ep.id)?.folder_id !== null).map((ep) => ep.id)
    )
    const newTabs = tabs
    let newActive = activeTabId
    if (newActive && closedEpisodeIds.has(newActive)) {
      newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
    }
    set({
      folders: folders.filter((f) => !removedIds.has(f.id)),
      episodes: updatedEpisodes,
      tabs: newTabs,
      activeTabId: newActive,
    })
  },

  setProgress: (episodeId, percent) => {
    const { progress } = get()
    const existing = progress[episodeId]
    set({
      progress: {
        ...progress,
        [episodeId]: {
          percent,
          startedAt: existing ? existing.startedAt : Date.now(),
        },
      },
    })
  },

  clearProgress: (episodeId) => {
    const { progress } = get()
    if (!(episodeId in progress)) return
    const { [episodeId]: _, ...rest } = progress
    set({ progress: rest })
  },

  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  setLeftSidebarWidth: (width) => set({ leftSidebarWidth: width }),
  setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),
  setActiveContentView: (view) => set({ activeContentView: view }),
}))
