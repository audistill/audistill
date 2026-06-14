import { describe, it, expect, beforeEach } from 'vitest'
import { useSelectionStore } from './selection-store'

describe('selection-store', () => {
  beforeEach(() => {
    useSelectionStore.setState({
      selectedEpisodeIds: new Set(),
      selectionContainer: null,
      lastToggledId: null,
    })
  })

  it('toggleEpisodeSelection adds an episode to selection', () => {
    useSelectionStore.getState().toggleEpisodeSelection('ep-1', 'inbox')

    const state = useSelectionStore.getState()
    expect(state.selectedEpisodeIds.has('ep-1')).toBe(true)
    expect(state.selectionContainer).toBe('inbox')
  })

  it('toggleEpisodeSelection removes an already-selected episode', () => {
    useSelectionStore.getState().toggleEpisodeSelection('ep-1', 'inbox')
    useSelectionStore.getState().toggleEpisodeSelection('ep-1', 'inbox')

    const state = useSelectionStore.getState()
    expect(state.selectedEpisodeIds.has('ep-1')).toBe(false)
    expect(state.selectedEpisodeIds.size).toBe(0)
  })

  it('toggleEpisodeSelection in a different container clears previous selection', () => {
    useSelectionStore.getState().toggleEpisodeSelection('ep-1', 'inbox')
    useSelectionStore.getState().toggleEpisodeSelection('ep-2', 'folder-1')

    const state = useSelectionStore.getState()
    expect(state.selectedEpisodeIds.has('ep-1')).toBe(false)
    expect(state.selectedEpisodeIds.has('ep-2')).toBe(true)
    expect(state.selectionContainer).toBe('folder-1')
  })

  it('selectEpisodeRange selects contiguous range from last toggled', () => {
    const visibleIds = ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5']
    useSelectionStore.getState().toggleEpisodeSelection('ep-2', 'inbox')
    useSelectionStore.getState().selectEpisodeRange('ep-4', visibleIds, 'inbox')

    const state = useSelectionStore.getState()
    expect([...state.selectedEpisodeIds].sort()).toEqual(['ep-2', 'ep-3', 'ep-4'])
  })

  it('selectEpisodeRange works in reverse direction', () => {
    const visibleIds = ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5']
    useSelectionStore.getState().toggleEpisodeSelection('ep-4', 'inbox')
    useSelectionStore.getState().selectEpisodeRange('ep-2', visibleIds, 'inbox')

    const state = useSelectionStore.getState()
    expect([...state.selectedEpisodeIds].sort()).toEqual(['ep-2', 'ep-3', 'ep-4'])
  })

  it('selectEpisodeRange with no prior toggle selects just the target', () => {
    const visibleIds = ['ep-1', 'ep-2', 'ep-3']
    useSelectionStore.getState().selectEpisodeRange('ep-2', visibleIds, 'inbox')

    const state = useSelectionStore.getState()
    expect([...state.selectedEpisodeIds]).toEqual(['ep-2'])
  })

  it('selectAllInContainer selects all provided ids', () => {
    useSelectionStore.getState().selectAllInContainer(['ep-1', 'ep-2', 'ep-3'], 'inbox')

    const state = useSelectionStore.getState()
    expect(state.selectedEpisodeIds.size).toBe(3)
    expect(state.selectionContainer).toBe('inbox')
  })

  it('clearSelection empties everything', () => {
    useSelectionStore.getState().toggleEpisodeSelection('ep-1', 'inbox')
    useSelectionStore.getState().toggleEpisodeSelection('ep-2', 'inbox')
    useSelectionStore.getState().clearSelection()

    const state = useSelectionStore.getState()
    expect(state.selectedEpisodeIds.size).toBe(0)
    expect(state.selectionContainer).toBeNull()
    expect(state.lastToggledId).toBeNull()
  })

  it('selectEpisodeRange in different container clears previous and selects target', () => {
    useSelectionStore.getState().toggleEpisodeSelection('ep-1', 'inbox')
    const visibleIds = ['ep-5', 'ep-6', 'ep-7']
    useSelectionStore.getState().selectEpisodeRange('ep-6', visibleIds, 'folder-1')

    const state = useSelectionStore.getState()
    expect(state.selectedEpisodeIds.has('ep-1')).toBe(false)
    expect(state.selectedEpisodeIds.has('ep-6')).toBe(true)
    expect(state.selectionContainer).toBe('folder-1')
  })
})
