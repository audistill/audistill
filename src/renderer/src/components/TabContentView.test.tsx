/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TabContentView } from './TabContentView'
import { ContentTab, useContentTabStore } from '../store/content-tab-store'

let mockEpisodes: { id: string; title: string | null }[] = []

vi.mock('../store/app-store', () => ({
  useAppStore: (selector: (state: { episodes: { id: string; title: string | null }[] }) => unknown) =>
    selector({ episodes: mockEpisodes }),
}))

vi.mock('./RichMarkdown', () => ({
  RichMarkdown: ({ content }: { content: string }) => <div>{content}</div>,
}))

const mockApi = {
  exportCopyTab: vi.fn().mockResolvedValue(undefined),
  exportTab: vi.fn().mockResolvedValue({ status: 'saved' }),
  tabsExecuteRecipe: vi.fn().mockResolvedValue(undefined),
  tabsUpdateContent: vi.fn().mockResolvedValue(undefined),
}

function makeTab(overrides: Partial<ContentTab> = {}): ContentTab {
  return {
    id: 'tab-1',
    episode_id: 'episode-1',
    recipe_id: 'recipe-1',
    tab_name: 'Brief',
    content: 'Generated body',
    is_pipeline: 0,
    position: 0,
    generated_at: '2026-07-01T12:00:00.000Z',
    generated_model: 'google/gemini-3.5-flash',
    created_at: '2026-07-01T12:00:00.000Z',
    updated_at: '2026-07-01T12:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // @ts-expect-error - partial Electron preload mock for component tests
  window.api = mockApi
  mockEpisodes = [{ id: 'episode-1', title: 'Episode title' }]
  useContentTabStore.setState({
    tabs: [makeTab()],
    activeTabId: 'tab-1',
    streamingTabId: null,
    snapshotContent: null,
    loading: false,
  })
})

afterEach(() => {
  cleanup()
})

describe('TabContentView provenance toolbar', () => {
  it('shows generation date and raw model id for a tab with provenance', () => {
    render(<TabContentView />)

    expect(screen.getByText('Generated Jul 1, 2026 · google/gemini-3.5-flash')).toBeInTheDocument()
  })

  it('truncates long model ids in the toolbar', () => {
    const longModel = 'provider/' + 'very-long-model-name-'.repeat(8)
    useContentTabStore.setState({
      tabs: [makeTab({ generated_model: longModel })],
      activeTabId: 'tab-1',
    })

    render(<TabContentView />)

    expect(screen.getByLabelText(`Generated Jul 1, 2026 · ${longModel}`)).toHaveClass('truncate')
  })

  it('does not show provenance for tabs without both provenance fields', () => {
    useContentTabStore.setState({
      tabs: [makeTab({ generated_at: null, generated_model: null })],
      activeTabId: 'tab-1',
    })

    render(<TabContentView />)

    expect(screen.queryByText(/Generated Jul 1, 2026/)).not.toBeInTheDocument()
  })

  it('does not guess provenance for older recipe tabs missing model or date', () => {
    useContentTabStore.setState({
      tabs: [makeTab({ recipe_id: 'recipe-1', generated_at: '2026-07-01T12:00:00.000Z', generated_model: null })],
      activeTabId: 'tab-1',
    })

    render(<TabContentView />)

    expect(screen.queryByText(/Generated Jul 1, 2026/)).not.toBeInTheDocument()
  })

  it('hides previous provenance while the active tab is streaming', () => {
    useContentTabStore.setState({ streamingTabId: 'tab-1' })

    render(<TabContentView />)

    expect(screen.queryByText(/Generated Jul 1, 2026/)).not.toBeInTheDocument()
  })
})

describe('TabContentView export menu', () => {
  it('opens a format-neutral menu with Markdown and PDF descriptions', () => {
    render(<TabContentView />)

    const trigger = screen.getByRole('button', { name: 'Export Tab' })
    expect(trigger).toHaveAttribute('title', 'Export Tab')
    fireEvent.click(trigger)

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Markdown \(\.md\)/ })).toHaveTextContent('Editable source')
    const pdf = screen.getByRole('menuitem', { name: /PDF \(\.pdf\)/ })
    expect(pdf).toHaveTextContent('Formatted for sharing')
    expect(pdf).toBeEnabled()
  })

  it('sends current renderer content and context through the format-aware interface', async () => {
    mockApi.exportTab.mockImplementationOnce(async () => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      return { status: 'saved' }
    })
    render(<TabContentView />)

    fireEvent.click(screen.getByRole('button', { name: 'Export Tab' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Markdown \(\.md\)/ }))

    await waitFor(() => {
      expect(mockApi.exportTab).toHaveBeenCalledWith({
        format: 'markdown',
        content: 'Generated body',
        episodeTitle: 'Episode title',
        tabName: 'Brief',
      })
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('dismisses on an outside pointer action and restores trigger focus', async () => {
    render(<TabContentView />)

    const trigger = screen.getByRole('button', { name: 'Export Tab' })
    fireEvent.click(trigger)
    fireEvent.mouseDown(document.body)

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('supports Arrow keys, Enter, Escape, and predictable focus', async () => {
    render(<TabContentView />)

    const trigger = screen.getByRole('button', { name: 'Export Tab' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })

    const markdown = await screen.findByRole('menuitem', { name: /Markdown \(\.md\)/ })
    await waitFor(() => expect(markdown).toHaveFocus())
    fireEvent.keyDown(markdown, { key: 'ArrowDown' })
    fireEvent.keyDown(markdown, { key: 'ArrowUp' })
    fireEvent.keyDown(markdown, { key: 'Enter' })

    await waitFor(() => expect(mockApi.exportTab).toHaveBeenCalledTimes(1))
    expect(trigger).toHaveFocus()

    fireEvent.click(trigger)
    fireEvent.keyDown(await screen.findByRole('menu'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('is disabled for empty and actively streaming Tabs', () => {
    useContentTabStore.setState({ tabs: [makeTab({ content: '' })] })
    const { rerender } = render(<TabContentView />)
    expect(screen.getByRole('button', { name: 'Export Tab' })).toBeDisabled()

    useContentTabStore.setState({ tabs: [makeTab({ content: 'Partial' })], streamingTabId: 'tab-1' })
    rerender(<TabContentView />)
    expect(screen.getByRole('button', { name: 'Export Tab' })).toBeDisabled()
  })

  it('prevents competing exports while PDF generation is active and reports success', async () => {
    let finishExport!: (result: { status: 'saved' }) => void
    mockApi.exportTab.mockReturnValueOnce(new Promise((resolve) => { finishExport = resolve }))
    render(<TabContentView />)

    const trigger = screen.getByRole('button', { name: 'Export Tab' })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: /PDF \(\.pdf\)/ }))

    await waitFor(() => expect(trigger).toBeDisabled())
    expect(trigger).toHaveAccessibleName('Exporting Tab')
    fireEvent.click(trigger)
    expect(mockApi.exportTab).toHaveBeenCalledTimes(1)

    finishExport({ status: 'saved' })
    expect(await screen.findByRole('status')).toHaveTextContent('PDF exported')
    await waitFor(() => expect(trigger).toBeEnabled())
  })

  it('returns to idle silently after PDF cancellation', async () => {
    mockApi.exportTab.mockResolvedValueOnce({ status: 'cancelled' })
    render(<TabContentView />)

    const trigger = screen.getByRole('button', { name: 'Export Tab' })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: /PDF \(\.pdf\)/ }))

    await waitFor(() => expect(trigger).toBeEnabled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a clear error when PDF export fails', async () => {
    mockApi.exportTab.mockRejectedValueOnce(new Error('Print rendering timed out'))
    render(<TabContentView />)

    fireEvent.click(screen.getByRole('button', { name: 'Export Tab' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /PDF \(\.pdf\)/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't export PDF: Print rendering timed out"
    )
    expect(screen.getByRole('button', { name: 'Export Tab' })).toBeEnabled()
  })
})
