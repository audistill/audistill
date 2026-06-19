import { create } from 'zustand'

export type ModelState = 'not-downloaded' | 'downloading' | 'ready' | 'error'

export interface ModelStatus {
  state: ModelState
  percent?: number
  sizeOnDisk?: number
  error?: string
}

interface ModelStatusStore {
  status: ModelStatus
  setStatus: (status: ModelStatus) => void
  hydrated: boolean
  hydrate: () => void
}

export const useModelStatusStore = create<ModelStatusStore>((set, get) => ({
  status: { state: 'not-downloaded' },
  hydrated: false,

  setStatus: (status) => set({ status }),

  hydrate: () => {
    if (get().hydrated) return
    set({ hydrated: true })

    // Fetch initial status
    window.api.modelGetStatus().then((status) => {
      set({ status: status as ModelStatus })
    })

    // Subscribe to status changes
    window.api.onModelStatusChanged((status) => {
      set({ status: status as ModelStatus })
    })

    // Subscribe to progress updates for finer-grained percent updates
    window.api.onModelDownloadProgress((percent) => {
      const current = get().status
      if (current.state === 'downloading') {
        set({ status: { ...current, percent } })
      }
    })
  },
}))
