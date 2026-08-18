import { create } from 'zustand'
import type { DbEpisode, DbFolder, DbOpenTab } from '../../../preload/index.d'
import type { InboxSortMode } from '../lib/sort-inbox'

export interface Episode {
  id: string
  title: string | null
  file_path: string | null
  folder_id: string | null
  duration_sec: number | null
  transcript: string | null
  source_url: string | null
  source_meta: string | null
  source_type: string | null
  status: 'queued' | 'transcribing' | 'summarizing' | 'complete' | 'error' | 'cancelled' | 'downloading' | 'recovery-pending'
  error_message: string | null
  error_details: string | null
  is_starred: boolean
  starred_at: string | null
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

export type HelpTarget =
  | { kind: 'help'; slug?: string }
  | { kind: 'release'; version?: string }
  | { kind: 'release-index' }

interface AppState {
  episodes: Episode[]
  folders: Folder[]
  expandedFolders: Set<string>
  tabs: Tab[]
  activeTabId: string | null
  recordingWorkspaceOpen: boolean
  recordingWorkspaceActive: boolean
  settingsOpen: boolean
  helpOpen: boolean
  helpTarget: HelpTarget | null
  searchQuery: string
  hydrated: boolean
  progress: Record<string, ProgressEntry>
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  leftSidebarWidth: number
  rightSidebarWidth: number
  activeContentView: 'episode' | 'canvas'
  transcriptPanelOpen: boolean
  transcriptPanelRatio: number
  inboxSort: InboxSortMode
  inboxCollapsed: boolean
  starredCollapsed: boolean
  licenseGateModal: { open: boolean; action: string }

  starredEpisodes: () => Episode[]
  hydrate: () => Promise<void>
  selectEpisode: (id: string) => void
  pinEpisode: (id: string) => void
  activateTab: (id: string) => void
  closeTab: (id: string) => void
  openRecordingWorkspace: () => void
  restoreRecordingWorkspace: () => void
  activateRecordingWorkspace: () => void
  closeRecordingWorkspace: () => void
  replaceRecordingWorkspace: (episode: Episode) => void
  openSettings: () => void
  closeSettings: () => void
  openHelp: (target?: HelpTarget) => void
  closeHelp: () => void
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
  toggleTranscriptPanel: () => void
  setTranscriptPanelRatio: (ratio: number) => void
  cycleInboxSort: () => void
  toggleInboxCollapsed: () => void
  toggleStarredCollapsed: () => void
  starEpisode: (id: string) => Promise<void>
  unstarEpisode: (id: string) => Promise<void>
  openLicenseGateModal: (action: string) => void
  closeLicenseGateModal: () => void
}

function dbEpisodeToEpisode(row: DbEpisode): Episode {
  return {
    id: row.id,
    title: row.title,
    file_path: row.file_path,
    folder_id: row.folder_id,
    duration_sec: row.duration_sec,
    transcript: row.transcript,
    source_url: row.source_url,
    source_meta: row.source_meta,
    source_type: row.source_type,
    status: row.status as Episode['status'],
    error_message: row.error_message,
    error_details: row.error_details,
    is_starred: row.is_starred === 1,
    starred_at: row.starred_at,
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

function getLocalStorageItem(key: string): string | null {
  try {
    return typeof localStorage?.getItem === 'function' ? localStorage.getItem(key) : null
  } catch {
    return null
  }
}

function setLocalStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage?.setItem === 'function') {
      localStorage.setItem(key, value)
    }
  } catch {
    // Ignore unavailable storage in test or restricted browser contexts.
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  episodes: [],
  folders: [],
  expandedFolders: new Set<string>(),
  tabs: [],
  activeTabId: null,
  recordingWorkspaceOpen: false,
  recordingWorkspaceActive: false,
  settingsOpen: false,
  helpOpen: false,
  helpTarget: null,
  searchQuery: '',
  hydrated: false,
  progress: {},
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  leftSidebarWidth: 280,
  rightSidebarWidth: 360,
  activeContentView: 'episode',
  transcriptPanelOpen: false,
  transcriptPanelRatio: 0.4,
  inboxSort: (getLocalStorageItem('inboxSort') as InboxSortMode) || 'newest',
  inboxCollapsed: getLocalStorageItem('inboxCollapsed') === 'true',
  starredCollapsed: getLocalStorageItem('starredCollapsed') === 'true',
  licenseGateModal: { open: false, action: '' },

  starredEpisodes: () => {
    const { episodes } = get()
    return episodes
      .filter((ep) => ep.is_starred)
      .sort((a, b) => {
        if (!a.starred_at || !b.starred_at) return 0
        return b.starred_at.localeCompare(a.starred_at)
      })
  },

  hydrate: async () => {
    const [dbEpisodes, dbFolders, dbTabs, savedRatio] = await Promise.all([
      window.api.getEpisodes(),
      window.api.getFolders(),
      window.api.getOpenTabs(),
      window.api.getSetting('transcript_panel_ratio'),
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
    const transcriptPanelRatio = savedRatio ? parseFloat(savedRatio) : 0.4

    set({ episodes, folders, tabs: validTabs, activeTabId, expandedFolders, hydrated: true, transcriptPanelRatio })
  },

  selectEpisode: (id) => {
    const { tabs } = get()
    const existingTab = tabs.find((t) => t.id === id)
    if (existingTab) {
      set({ activeTabId: id, recordingWorkspaceActive: false, settingsOpen: false, helpOpen: false })
    } else {
      const previewIdx = tabs.findIndex((t) => t.preview)
      const newTabs = [...tabs]
      if (previewIdx >= 0) {
        newTabs[previewIdx] = { id, episodeId: id, preview: true }
      } else {
        newTabs.push({ id, episodeId: id, preview: true })
      }
      set({ tabs: newTabs, activeTabId: id, recordingWorkspaceActive: false, settingsOpen: false, helpOpen: false })
      get().persistTabs()
    }
  },

  pinEpisode: (id) => {
    const { tabs } = get()
    const existingTab = tabs.find((t) => t.id === id)
    if (existingTab) {
      const newTabs = tabs.map((t) => (t.id === id ? { ...t, preview: false } : t))
      set({ tabs: newTabs, activeTabId: id, recordingWorkspaceActive: false, settingsOpen: false, helpOpen: false })
    } else {
      const newTabs = [...tabs, { id, episodeId: id, preview: false }]
      set({ tabs: newTabs, activeTabId: id, recordingWorkspaceActive: false, settingsOpen: false, helpOpen: false })
    }
    get().persistTabs()
  },

  activateTab: (id) => set({ activeTabId: id, recordingWorkspaceActive: false, settingsOpen: false, helpOpen: false }),

  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    const newTabs = tabs.filter((t) => t.id !== id)
    let newActive = activeTabId
    if (activeTabId === id) {
      newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
    }
    set({
      tabs: newTabs,
      activeTabId: newActive,
      recordingWorkspaceActive: newActive === null && get().recordingWorkspaceOpen,
    })
    get().persistTabs()
  },

  openRecordingWorkspace: () => set({
    recordingWorkspaceOpen: true,
    recordingWorkspaceActive: true,
    activeTabId: null,
    settingsOpen: false,
    helpOpen: false,
  }),

  restoreRecordingWorkspace: () => set({
    recordingWorkspaceOpen: true,
    recordingWorkspaceActive: true,
    activeTabId: null,
    settingsOpen: false,
    helpOpen: false,
  }),

  activateRecordingWorkspace: () => set({
    recordingWorkspaceActive: true,
    activeTabId: null,
    settingsOpen: false,
    helpOpen: false,
  }),

  closeRecordingWorkspace: () => set((state) => {
    const nextActiveTabId = state.tabs.length > 0 ? state.tabs[state.tabs.length - 1].id : null
    return {
      recordingWorkspaceOpen: false,
      recordingWorkspaceActive: false,
      activeTabId: nextActiveTabId,
    }
  }),

  replaceRecordingWorkspace: (episode) => {
    const { episodes, tabs } = get()
    const nextEpisodes = episodes.some((item) => item.id === episode.id)
      ? episodes.map((item) => item.id === episode.id ? episode : item)
      : [episode, ...episodes]
    const nextTabs = tabs.some((tab) => tab.id === episode.id)
      ? tabs.map((tab) => tab.id === episode.id ? { ...tab, preview: false } : tab)
      : [...tabs, { id: episode.id, episodeId: episode.id, preview: false }]
    set({
      episodes: nextEpisodes,
      tabs: nextTabs,
      activeTabId: episode.id,
      recordingWorkspaceOpen: false,
      recordingWorkspaceActive: false,
      settingsOpen: false,
      helpOpen: false,
    })
    get().persistTabs()
  },

  openSettings: () => set({ settingsOpen: true, helpOpen: false, recordingWorkspaceActive: false }),

  closeSettings: () => {
    const { tabs } = get()
    const newActive = tabs.length > 0 ? tabs[tabs.length - 1].id : null
    set({
      settingsOpen: false,
      activeTabId: newActive,
      recordingWorkspaceActive: newActive === null && get().recordingWorkspaceOpen,
    })
  },

  openHelp: (target) => set((state) => ({
    helpOpen: true,
    helpTarget: target ?? state.helpTarget ?? { kind: 'help' },
    settingsOpen: false,
    recordingWorkspaceActive: false,
  })),

  closeHelp: () => set((state) => ({
    helpOpen: false,
    helpTarget: null,
    recordingWorkspaceActive: state.activeTabId === null && state.recordingWorkspaceOpen,
  })),

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
        file_path: null,
        folder_id: null,
        duration_sec: null,
        transcript: null,
        source_url: null,
        source_meta: null,
        source_type: null,
        status: 'queued',
        error_message: null,
        is_starred: false,
        starred_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updates,
        error_details: updates.error_details ?? null,
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

  toggleTranscriptPanel: () => set((s) => ({ transcriptPanelOpen: !s.transcriptPanelOpen })),
  setTranscriptPanelRatio: (ratio) => {
    const clamped = Math.max(0.25, Math.min(0.65, ratio))
    set({ transcriptPanelRatio: clamped })
    window.api.setSetting('transcript_panel_ratio', String(clamped))
  },

  cycleInboxSort: () => {
    const cycle: Record<InboxSortMode, InboxSortMode> = { newest: 'oldest', oldest: 'longest', longest: 'newest' }
    const next = cycle[get().inboxSort]
    setLocalStorageItem('inboxSort', next)
    set({ inboxSort: next })
  },

  toggleInboxCollapsed: () => {
    const next = !get().inboxCollapsed
    setLocalStorageItem('inboxCollapsed', String(next))
    set({ inboxCollapsed: next })
  },

  toggleStarredCollapsed: () => {
    const next = !get().starredCollapsed
    setLocalStorageItem('starredCollapsed', String(next))
    set({ starredCollapsed: next })
  },

  starEpisode: async (id) => {
    await window.api.starEpisode(id)
    const { episodes } = get()
    set({
      episodes: episodes.map((ep) =>
        ep.id === id ? { ...ep, is_starred: true, starred_at: new Date().toISOString() } : ep
      ),
    })
  },

  unstarEpisode: async (id) => {
    await window.api.unstarEpisode(id)
    const { episodes } = get()
    set({
      episodes: episodes.map((ep) =>
        ep.id === id ? { ...ep, is_starred: false, starred_at: null } : ep
      ),
    })
  },

  openLicenseGateModal: (action) => set({ licenseGateModal: { open: true, action } }),
  closeLicenseGateModal: () => set({ licenseGateModal: { open: false, action: '' } }),
}))
