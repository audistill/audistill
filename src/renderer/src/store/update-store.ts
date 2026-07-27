import { create } from 'zustand'
import type { UpdateStatus } from '../../../shared/update-types'

interface UpdateStore {
  status: UpdateStatus
  dismissedVersion: string | null
  hydrated: boolean
  hydrate: () => void
  check: () => Promise<void>
  install: () => void
  dismiss: () => void
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  status: { state: 'idle', currentVersion: '' },
  dismissedVersion: null,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return
    set({ hydrated: true })

    // Load initial status and dismissed version
    Promise.all([
      window.api.update.getStatus(),
      window.api.getSetting('update_dismissed_version'),
    ]).then(([status, dismissed]) => {
      set({ status, dismissedVersion: dismissed ?? null })
    })

    // Subscribe to status changes
    window.api.update.onStatusChanged((status) => {
      set({ status })
    })
  },

  check: async () => {
    const status = await window.api.update.check()
    set({ status })
  },

  install: () => {
    window.api.update.install()
  },

  dismiss: () => {
    const { status } = get()
    if (status.state === 'ready') {
      window.api.update.dismiss(status.version)
      set({ dismissedVersion: status.version })
    }
  },
}))
