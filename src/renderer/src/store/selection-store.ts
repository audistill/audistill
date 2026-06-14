import { create } from 'zustand'

interface SelectionState {
  selectedEpisodeIds: Set<string>
  selectionContainer: string | null
  lastToggledId: string | null

  toggleEpisodeSelection: (id: string, container: string) => void
  selectEpisodeRange: (toId: string, visibleIds: string[], container: string) => void
  selectAllInContainer: (ids: string[], container: string) => void
  clearSelection: () => void
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedEpisodeIds: new Set(),
  selectionContainer: null,
  lastToggledId: null,

  toggleEpisodeSelection: (id, container) => {
    const { selectedEpisodeIds, selectionContainer } = get()

    if (selectionContainer !== null && selectionContainer !== container) {
      set({
        selectedEpisodeIds: new Set([id]),
        selectionContainer: container,
        lastToggledId: id,
      })
      return
    }

    const next = new Set(selectedEpisodeIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    set({
      selectedEpisodeIds: next,
      selectionContainer: container,
      lastToggledId: id,
    })
  },

  selectEpisodeRange: (toId, visibleIds, container) => {
    const { lastToggledId, selectionContainer } = get()

    if (selectionContainer !== null && selectionContainer !== container) {
      set({
        selectedEpisodeIds: new Set([toId]),
        selectionContainer: container,
        lastToggledId: toId,
      })
      return
    }

    if (!lastToggledId) {
      set({
        selectedEpisodeIds: new Set([toId]),
        selectionContainer: container,
        lastToggledId: toId,
      })
      return
    }

    const fromIndex = visibleIds.indexOf(lastToggledId)
    const toIndex = visibleIds.indexOf(toId)

    if (fromIndex === -1 || toIndex === -1) {
      set({
        selectedEpisodeIds: new Set([toId]),
        selectionContainer: container,
        lastToggledId: toId,
      })
      return
    }

    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const rangeIds = visibleIds.slice(start, end + 1)

    set({
      selectedEpisodeIds: new Set(rangeIds),
      selectionContainer: container,
      lastToggledId: toId,
    })
  },

  selectAllInContainer: (ids, container) => {
    set({
      selectedEpisodeIds: new Set(ids),
      selectionContainer: container,
      lastToggledId: null,
    })
  },

  clearSelection: () => {
    set({
      selectedEpisodeIds: new Set(),
      selectionContainer: null,
      lastToggledId: null,
    })
  },
}))
