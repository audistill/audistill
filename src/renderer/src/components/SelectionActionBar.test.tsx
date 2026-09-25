/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SelectionActionBar } from './SelectionActionBar'
import { useSelectionStore } from '../store/selection-store'

const { appState } = vi.hoisted(() => ({
  appState: {
    episodes: [],
  },
}))

vi.mock('../store/app-store', () => ({
  useAppStore: (selector: (state: typeof appState) => unknown) => selector(appState),
}))

vi.mock('./FolderTreePopover', () => ({
  FolderTreePopover: () => <div>folder-tree-popover</div>,
}))

vi.mock('./DeleteConfirmModal', () => ({
  DeleteConfirmModal: () => <div>delete-confirm-modal</div>,
}))

describe('SelectionActionBar', () => {
  beforeEach(() => {
    useSelectionStore.getState().clearSelection()
  })

  afterEach(() => {
    cleanup()
  })

  it('does not expose Episode actions or the delete shortcut for Feed Item selections', () => {
    useSelectionStore.setState({
      selectedIds: new Set(['feed-item-1']),
      selectionContainer: 'feed:feed-123',
      lastToggledId: 'feed-item-1',
    })

    render(<SelectionActionBar />)

    expect(screen.queryByText('Move to...')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    expect(screen.queryByText('Export')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(screen.queryByText('delete-confirm-modal')).not.toBeInTheDocument()
  })

  it('keeps Episode selection actions and the delete shortcut available', () => {
    useSelectionStore.setState({
      selectedIds: new Set(['episode-1']),
      selectionContainer: 'inbox',
      lastToggledId: 'episode-1',
    })

    render(<SelectionActionBar />)

    expect(screen.getByText('Move to...')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(screen.getByText('delete-confirm-modal')).toBeInTheDocument()
  })
})
