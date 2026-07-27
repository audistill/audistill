/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
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
  exportSaveTab: vi.fn().mockResolvedValue(undefined),
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
