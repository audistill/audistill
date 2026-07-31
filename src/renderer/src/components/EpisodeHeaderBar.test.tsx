/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EpisodeHeaderBar } from './EpisodeHeaderBar'
import { ContentTab, useContentTabStore } from '../store/content-tab-store'
import type { Episode } from '../store/app-store'

const { appState } = vi.hoisted(() => ({
  appState: {
    transcriptPanelOpen: false,
    toggleTranscriptPanel: vi.fn(),
    renameEpisode: vi.fn(),
  },
}))

vi.mock('../store/app-store', () => ({
  useAppStore: (selector: (state: typeof appState) => unknown) => selector(appState),
}))

const mockRecipes = [
  { id: 'recipe-brief', name: 'Brief', is_builtin: 1 },
  { id: 'recipe-action', name: 'Action Items', is_builtin: 0 },
]

const mockApi = {
  openEpisodeSource: vi.fn().mockResolvedValue({ success: true }),
  recipesGetAll: vi.fn().mockResolvedValue(mockRecipes),
  tabsCreate: vi.fn().mockResolvedValue('tab-new'),
  tabsGet: vi.fn().mockResolvedValue([]),
  tabsExecuteRecipe: vi.fn().mockResolvedValue(undefined),
  tabsDelete: vi.fn().mockResolvedValue(undefined),
  tabsRename: vi.fn().mockResolvedValue(undefined),
}

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 'episode-1',
    title: 'Episode title',
    file_path: '/audio.mp3',
    folder_id: null,
    duration_sec: 120,
    transcript: 'Transcript',
    source_url: null,
    source_meta: null,
    source_type: 'local',
    status: 'complete',
    error_message: null,
    is_starred: false,
    starred_at: null,
    created_at: '2026-07-01T12:00:00.000Z',
    updated_at: '2026-07-01T12:00:00.000Z',
    ...overrides,
  }
}

function makeTab(overrides: Partial<ContentTab> = {}): ContentTab {
  return {
    id: 'tab-1',
    episode_id: 'episode-1',
    recipe_id: 'recipe-brief',
    tab_name: 'Brief',
    content: 'Generated content',
    is_pipeline: 1,
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

describe('EpisodeHeaderBar Source Locator', () => {
  it.each([
    ['youtube', 'https://www.youtube.com/watch?v=abc'],
    ['direct', 'https://media.example.com/episode.mp3'],
    ['rss', 'https://feeds.example.com/enclosures/episode.mp3'],
  ])('opens a %s Source Locator in the default browser', async (sourceType, sourceUrl) => {
    render(<EpisodeHeaderBar episode={makeEpisode({
      source_type: sourceType,
      source_url: sourceUrl,
      source_meta: sourceType === 'rss' ? JSON.stringify({ feedTitle: 'Example feed' }) : null,
      status: 'downloading',
    })} />)

    const openSource = screen.getByRole('button', { name: 'Open Source' })
    expect(openSource).toHaveAttribute('title', `Open source: ${sourceUrl}`)
    fireEvent.click(openSource)

    await waitFor(() => {
      expect(mockApi.openEpisodeSource).toHaveBeenCalledWith('episode-1')
    })
  })

  it('opens a Local Source Locator in the default app', async () => {
    render(<EpisodeHeaderBar episode={makeEpisode({ file_path: '/media/interview.mp3' })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Source' }))

    await waitFor(() => {
      expect(mockApi.openEpisodeSource).toHaveBeenCalledWith('episode-1')
    })
  })

  it.each(['recorded', 'local'])(
    'keeps a %s Source without a Source Locator non-clickable',
    (sourceType) => {
      render(<EpisodeHeaderBar episode={makeEpisode({
        source_type: sourceType,
        file_path: null,
        source_url: null,
      })} />)

      expect(screen.queryByRole('button', { name: 'Open Source' })).not.toBeInTheDocument()
    },
  )

  it('preserves Episode title rename behavior', () => {
    render(<EpisodeHeaderBar episode={makeEpisode()} />)

    fireEvent.doubleClick(screen.getByRole('heading', { name: 'Episode title' }))
    const input = screen.getByDisplayValue('Episode title')
    fireEvent.change(input, { target: { value: 'Renamed Episode' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(appState.renameEpisode).toHaveBeenCalledWith('episode-1', 'Renamed Episode')
  })

  it('shows a non-destructive error when a Local Source Locator cannot be opened', async () => {
    mockApi.openEpisodeSource.mockResolvedValueOnce({
      success: false,
      error: 'Original file could not be opened.',
    })
    render(<EpisodeHeaderBar episode={makeEpisode({ file_path: '/missing/interview.mp3' })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Source' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Original file could not be opened.')
  })
})

describe('EpisodeHeaderBar Tab lifecycle', () => {
  it('shows a close affordance for a completed Pipeline-created Tab', () => {
    render(<EpisodeHeaderBar episode={makeEpisode()} />)

    fireEvent.mouseEnter(screen.getByText('Brief').parentElement!)

    expect(screen.getByLabelText('Close Brief')).toBeInTheDocument()
  })

  it('does not show a close affordance for the currently streaming Tab', () => {
    useContentTabStore.setState({
      tabs: [makeTab({ is_pipeline: 0 })],
      activeTabId: 'tab-1',
      streamingTabId: 'tab-1',
    })

    render(<EpisodeHeaderBar episode={makeEpisode()} />)

    fireEvent.mouseEnter(screen.getByText('Brief').parentElement!)

    expect(screen.queryByLabelText('Close Brief')).not.toBeInTheDocument()
  })

  it('navigates to an existing Pipeline-created Tab when its Recipe is selected', async () => {
    render(<EpisodeHeaderBar episode={makeEpisode()} />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(await screen.findByRole('button', { name: 'Brief' }))

    await waitFor(() => {
      expect(useContentTabStore.getState().activeTabId).toBe('tab-1')
    })
    expect(mockApi.tabsCreate).not.toHaveBeenCalled()
    expect(mockApi.tabsExecuteRecipe).not.toHaveBeenCalled()
  })

  it('creates a normal Recipe-generated Tab when no Tab for that Recipe exists', async () => {
    const newTabs = [makeTab(), makeTab({
      id: 'tab-new',
      recipe_id: 'recipe-action',
      tab_name: 'Action Items',
      is_pipeline: 0,
      position: 1,
    })]
    mockApi.tabsGet.mockResolvedValueOnce(newTabs)

    render(<EpisodeHeaderBar episode={makeEpisode()} />)

    fireEvent.click(screen.getByLabelText('New tab'))
    fireEvent.click(await screen.findByRole('button', { name: 'Action Items' }))

    await waitFor(() => {
      expect(mockApi.tabsCreate).toHaveBeenCalledWith('episode-1', {
        recipe_id: 'recipe-action',
        tab_name: 'Action Items',
      })
    })
    expect(mockApi.tabsExecuteRecipe).toHaveBeenCalledWith('episode-1', 'tab-new')
  })
})
