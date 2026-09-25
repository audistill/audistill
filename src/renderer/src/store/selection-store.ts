import { create } from 'zustand'

export interface SelectionState {
  selectedIds: Set<string>
  selectionContainer: string | null
  lastToggledId: string | null

  selectOnly: (id: string, container: string) => void
  toggleSelection: (id: string, container: string) => void
  toggle: (id: string, container: string) => void
  selectRange: (toId: string, visibleIds: string[], container: string) => void
  selectAllInContainer: (ids: string[], container: string) => void
  clearSelection: () => void
}

export const useSelectionStore = create<SelectionState>((set, get) => {
  const toggleSelection = (id: string, container: string): void => {
    const { selectedIds, selectionContainer } = get()

    if (selectionContainer !== null && selectionContainer !== container) {
      set({
        selectedIds: new Set([id]),
        selectionContainer: container,
        lastToggledId: id,
      })
      return
    }

    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    set({
      selectedIds: next,
      selectionContainer: container,
      lastToggledId: id,
    })
  }

  return {
    selectedIds: new Set(),
    selectionContainer: null,
    lastToggledId: null,

    selectOnly: (id, container) => {
      set({
        selectedIds: new Set([id]),
        selectionContainer: container,
        lastToggledId: id,
      })
    },

    toggleSelection,
    toggle: toggleSelection,

    selectRange: (toId, visibleIds, container) => {
      const { lastToggledId, selectionContainer } = get()

      if (selectionContainer !== null && selectionContainer !== container) {
        set({
          selectedIds: new Set([toId]),
          selectionContainer: container,
          lastToggledId: toId,
        })
        return
      }

      if (!lastToggledId) {
        set({
          selectedIds: new Set([toId]),
          selectionContainer: container,
          lastToggledId: toId,
        })
        return
      }

      const fromIndex = visibleIds.indexOf(lastToggledId)
      const toIndex = visibleIds.indexOf(toId)

      if (fromIndex === -1 || toIndex === -1) {
        set({
          selectedIds: new Set([toId]),
          selectionContainer: container,
          lastToggledId: toId,
        })
        return
      }

      const start = Math.min(fromIndex, toIndex)
      const end = Math.max(fromIndex, toIndex)
      const rangeIds = visibleIds.slice(start, end + 1)

      set({
        selectedIds: new Set(rangeIds),
        selectionContainer: container,
      })
    },

    selectAllInContainer: (ids, container) => {
      set({
        selectedIds: new Set(ids),
        selectionContainer: container,
        lastToggledId: null,
      })
    },

    clearSelection: () => {
      set({
        selectedIds: new Set(),
        selectionContainer: null,
        lastToggledId: null,
      })
    },
  }
})
