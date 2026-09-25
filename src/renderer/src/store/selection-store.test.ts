import { describe, it, expect, beforeEach } from 'vitest'
import { useSelectionStore } from './selection-store'

describe('selection-store', () => {
  beforeEach(() => {
    useSelectionStore.setState({
      selectedIds: new Set(),
      selectionContainer: null,
      lastToggledId: null,
    })
  })

  it('selectOnly replaces the selection and sets the range anchor', () => {
    useSelectionStore.getState().toggleSelection('item-1', 'inbox')
    useSelectionStore.getState().toggleSelection('item-2', 'inbox')

    useSelectionStore.getState().selectOnly('item-3', 'inbox')

    const state = useSelectionStore.getState()
    expect([...state.selectedIds]).toEqual(['item-3'])
    expect(state.selectionContainer).toBe('inbox')
    expect(state.lastToggledId).toBe('item-3')
  })

  it('toggleSelection adds an item to selection', () => {
    useSelectionStore.getState().toggleSelection('item-1', 'inbox')

    const state = useSelectionStore.getState()
    expect(state.selectedIds.has('item-1')).toBe(true)
    expect(state.selectionContainer).toBe('inbox')
  })

  it('toggleSelection removes an already-selected item', () => {
    useSelectionStore.getState().toggleSelection('item-1', 'inbox')
    useSelectionStore.getState().toggleSelection('item-1', 'inbox')

    const state = useSelectionStore.getState()
    expect(state.selectedIds.has('item-1')).toBe(false)
    expect(state.selectedIds.size).toBe(0)
  })

  it('toggleSelection in a different container clears previous selection', () => {
    useSelectionStore.getState().toggleSelection('item-1', 'inbox')
    useSelectionStore.getState().toggleSelection('item-2', 'folder-1')

    const state = useSelectionStore.getState()
    expect(state.selectedIds.has('item-1')).toBe(false)
    expect(state.selectedIds.has('item-2')).toBe(true)
    expect(state.selectionContainer).toBe('folder-1')
  })

  it('selectRange selects contiguous range from last toggled', () => {
    const visibleIds = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5']
    useSelectionStore.getState().toggleSelection('item-2', 'inbox')
    useSelectionStore.getState().selectRange('item-4', visibleIds, 'inbox')

    const state = useSelectionStore.getState()
    expect([...state.selectedIds].sort()).toEqual(['item-2', 'item-3', 'item-4'])
  })

  it('selectRange works in reverse direction', () => {
    const visibleIds = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5']
    useSelectionStore.getState().toggleSelection('item-4', 'inbox')
    useSelectionStore.getState().selectRange('item-2', visibleIds, 'inbox')

    const state = useSelectionStore.getState()
    expect([...state.selectedIds].sort()).toEqual(['item-2', 'item-3', 'item-4'])
  })

  it('selectRange with no prior toggle selects just the target', () => {
    const visibleIds = ['item-1', 'item-2', 'item-3']
    useSelectionStore.getState().selectRange('item-2', visibleIds, 'inbox')

    const state = useSelectionStore.getState()
    expect([...state.selectedIds]).toEqual(['item-2'])
  })

  it('selectAllInContainer selects all provided ids', () => {
    useSelectionStore.getState().selectAllInContainer(['item-1', 'item-2', 'item-3'], 'inbox')

    const state = useSelectionStore.getState()
    expect(state.selectedIds.size).toBe(3)
    expect(state.selectionContainer).toBe('inbox')
  })

  it('clearSelection empties everything', () => {
    useSelectionStore.getState().toggleSelection('item-1', 'inbox')
    useSelectionStore.getState().toggleSelection('item-2', 'inbox')
    useSelectionStore.getState().clearSelection()

    const state = useSelectionStore.getState()
    expect(state.selectedIds.size).toBe(0)
    expect(state.selectionContainer).toBeNull()
    expect(state.lastToggledId).toBeNull()
  })

  it('selectRange in different container clears previous and selects target', () => {
    useSelectionStore.getState().toggleSelection('item-1', 'inbox')
    const visibleIds = ['item-5', 'item-6', 'item-7']
    useSelectionStore.getState().selectRange('item-6', visibleIds, 'folder-1')

    const state = useSelectionStore.getState()
    expect(state.selectedIds.has('item-1')).toBe(false)
    expect(state.selectedIds.has('item-6')).toBe(true)
    expect(state.selectionContainer).toBe('folder-1')
  })

  it('toggle alias works the same as toggleSelection', () => {
    useSelectionStore.getState().toggle('item-1', 'inbox')
    expect(useSelectionStore.getState().selectedIds.has('item-1')).toBe(true)
    useSelectionStore.getState().toggle('item-1', 'inbox')
    expect(useSelectionStore.getState().selectedIds.has('item-1')).toBe(false)
  })
})
