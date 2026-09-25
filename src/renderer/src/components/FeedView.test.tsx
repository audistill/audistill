/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Feed, FeedItem, FeedItemPage } from '../../../shared/feed-subscription'
import { useSelectionStore } from '../store/selection-store'
import { FeedView } from './FeedView'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({
      index,
      key: index,
      start: index * 72,
      size: 72,
    })),
    getTotalSize: () => count * 72,
    measureElement: () => undefined,
  }),
}))

const { appState, sampleFeed } = vi.hoisted(() => {
  const sampleFeed: Feed = {
    id: 'feed-123',
    url: 'https://example.com/rss.xml',
    kind: 'rss',
    title: 'Tech Talk Daily',
    image: 'https://example.com/image.jpg',
    site_url: 'https://example.com',
    etag: null,
    last_modified: null,
    last_fetched_at: '2026-09-03T10:00:00Z',
    last_error: null,
    auto_ingest: 0,
    auto_ingest_folder_id: null,
    min_duration_sec: null,
    max_duration_sec: null,
    skip_live: 1,
    sort_order: 0,
    created_at: '2026-09-01T00:00:00Z',
  }
  return {
    sampleFeed,
    appState: {
      feeds: [sampleFeed],
      selectEpisode: vi.fn(),
      openLicenseGateModal: vi.fn(),
      refreshFeed: vi.fn(),
      loadFeedNewCounts: vi.fn(),
      newFeedItemCounts: { 'feed-123': 1 } as Record<string, number>,
      refreshingFeedIds: [] as string[],
    },
  }
})

vi.mock('../store/app-store', () => {
  const useAppStore = Object.assign(
    (selector: (state: typeof appState) => unknown) => selector(appState),
    { getState: () => appState }
  )
  return { useAppStore }
})

const mockFeedGetItems = vi.fn()
const mockFeedAcknowledgeItems = vi.fn()
const mockFeedRestoreNewItems = vi.fn()
const mockFeedClearNewItems = vi.fn()
const mockFeedIngestItems = vi.fn()
const mockOnFeedsRefreshed = vi.fn().mockReturnValue(() => undefined)

;(window as any).api = {
  feedGetItems: mockFeedGetItems,
  feedAcknowledgeItems: mockFeedAcknowledgeItems,
  feedRestoreNewItems: mockFeedRestoreNewItems,
  feedClearNewItems: mockFeedClearNewItems,
  feedIngestItems: mockFeedIngestItems,
  onFeedsRefreshed: mockOnFeedsRefreshed,
  openExternal: vi.fn().mockResolvedValue(undefined),
}

function feedItem(id: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    feed_id: 'feed-123',
    guid: `guid-${id}`,
    title: `Feed Item ${id}`,
    media_url: `https://example.com/${id}.mp3`,
    page_url: null,
    pub_date: '2026-09-03T08:00:00Z',
    duration_sec: 1800,
    description: null,
    state: 'seen',
    episode_id: null,
    first_seen_at: '2026-09-03T08:00:00Z',
    ...overrides,
  }
}

function page(items: FeedItem[], nextCursor: string | null = null, total = items.length): FeedItemPage {
  return { items, nextCursor, total }
}

describe('FeedView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appState.feeds = [sampleFeed]
    appState.newFeedItemCounts = { 'feed-123': 1 }
    appState.refreshingFeedIds = []
    appState.selectEpisode = vi.fn()
    appState.refreshFeed = vi.fn().mockResolvedValue({ feedId: 'feed-123', newItemCount: 0 })
    appState.loadFeedNewCounts = vi.fn().mockResolvedValue(undefined)
    appState.openLicenseGateModal = vi.fn()
    mockFeedAcknowledgeItems.mockResolvedValue({ itemIds: ['fresh'] })
    mockFeedRestoreNewItems.mockResolvedValue(undefined)
    mockFeedClearNewItems.mockResolvedValue({ itemIds: [] })
    mockFeedIngestItems.mockResolvedValue([])
    useSelectionStore.getState().clearSelection()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('acknowledges a New row without entering bulk selection', async () => {
    mockFeedGetItems.mockResolvedValue(page([feedItem('fresh', { state: 'new' })]))

    render(<FeedView feedId="feed-123" />)
    fireEvent.click(await screen.findByText('Feed Item fresh'))

    await waitFor(() => {
      expect(mockFeedAcknowledgeItems).toHaveBeenCalledWith('feed-123', ['fresh'])
    })
    expect(useSelectionStore.getState().selectedIds.size).toBe(0)
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('New')).not.toBeInTheDocument()
    expect(appState.loadFeedNewCounts).toHaveBeenCalled()
  })

  it('shows local refresh progress and completion feedback', async () => {
    mockFeedGetItems.mockResolvedValue(page([]))
    let finishRefresh!: (value: { feedId: string; newItemCount: number }) => void
    appState.refreshFeed = vi.fn().mockReturnValue(new Promise((resolve) => { finishRefresh = resolve }))

    render(<FeedView feedId="feed-123" />)
    const refresh = await screen.findByRole('button', { name: 'Check for new episodes' })
    fireEvent.click(refresh)

    expect(refresh).toBeDisabled()
    finishRefresh({ feedId: 'feed-123', newItemCount: 0 })
    expect(await screen.findByText('Up to date')).toBeInTheDocument()
  })

  it('shows local pending and result state while adding one Feed Item', async () => {
    const item = feedItem('add-me', { title: 'Add this episode' })
    let finishAdd: (result: Array<{ itemId: string; episodeId: string }>) => void = () => undefined
    mockFeedGetItems.mockResolvedValue(page([item]))
    mockFeedIngestItems.mockReturnValue(new Promise((resolve) => { finishAdd = resolve }))

    render(<FeedView feedId="feed-123" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add Add this episode' }))

    expect(screen.getByRole('button', { name: 'Adding Add this episode' })).toBeDisabled()
    finishAdd([{ itemId: 'add-me', episodeId: 'episode-add-me' }])

    await waitFor(() => expect(screen.getByText(/In Library/)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Add Add this episode' })).not.toBeInTheDocument()
  })

  it('keeps acknowledgement failures local and leaves the Item New', async () => {
    const fresh = feedItem('fresh', { state: 'new' })
    mockFeedGetItems.mockResolvedValue(page([fresh]))
    mockFeedAcknowledgeItems.mockRejectedValue(new Error('Could not mark seen'))

    render(<FeedView feedId="feed-123" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Feed Item fresh' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not mark seen')
    expect(screen.getByLabelText('New')).toBeInTheDocument()
  })

  it('animates an acknowledged row out of New and restores it with Undo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fresh = feedItem('fresh', { state: 'new' })
    mockFeedGetItems
      .mockResolvedValueOnce(page([fresh]))
      .mockResolvedValueOnce(page([fresh]))

    render(<FeedView feedId="feed-123" />)
    fireEvent.click(await screen.findByRole('radio', { name: /New/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Feed Item fresh' }))

    await waitFor(() => expect(mockFeedAcknowledgeItems).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Feed Item fresh' })).toHaveClass('opacity-0')
    vi.advanceTimersByTime(200)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Feed Item fresh' })).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Undo mark seen' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Feed Item fresh' })).toBeInTheDocument())
    vi.useRealTimers()
  })

  it('clears the complete New snapshot and offers inline Undo', async () => {
    const items = [feedItem('loaded-a', { state: 'new' }), feedItem('loaded-b', { state: 'new' })]
    mockFeedGetItems.mockResolvedValue(page(items))
    mockFeedClearNewItems.mockResolvedValue({ itemIds: ['loaded-a', 'loaded-b', 'unloaded'] })

    render(<FeedView feedId="feed-123" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Clear new' }))

    await waitFor(() => expect(mockFeedClearNewItems).toHaveBeenCalledWith('feed-123'))
    expect(screen.queryByLabelText('New')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo mark seen' }))

    await waitFor(() => {
      expect(mockFeedRestoreNewItems).toHaveBeenCalledWith('feed-123', ['loaded-a', 'loaded-b', 'unloaded'])
    })
    expect(screen.getAllByLabelText('New')).toHaveLength(2)
  })

  it('loads the complete catalogue incrementally through opaque cursors', async () => {
    mockFeedGetItems
      .mockResolvedValueOnce(page([feedItem('first')], 'cursor-2', 2))
      .mockResolvedValueOnce(page([feedItem('second')], null, 2))

    render(<FeedView feedId="feed-123" />)

    await waitFor(() => expect(screen.getByText('Feed Item second')).toBeInTheDocument())
    expect(mockFeedGetItems).toHaveBeenNthCalledWith(1, 'feed-123', { filter: 'all', cursor: null, limit: 60 })
    expect(mockFeedGetItems).toHaveBeenNthCalledWith(2, 'feed-123', { filter: 'all', cursor: 'cursor-2', limit: 60 })
  })

  it('inserts background arrivals into All and exposes a new-above affordance away from the top', async () => {
    const oldItem = feedItem('old')
    const freshItem = feedItem('dwarkesh', { title: 'Dwarkesh: New interview', state: 'new' })
    mockFeedGetItems
      .mockResolvedValueOnce(page([oldItem]))
      .mockResolvedValueOnce(page([freshItem, oldItem]))

    render(<FeedView feedId="feed-123" />)
    await screen.findByText('Feed Item old')
    const scroller = screen.getByTestId('feed-scroll')
    Object.defineProperty(scroller, 'scrollTop', { value: 300, writable: true })
    Object.defineProperty(scroller, 'scrollHeight', {
      get: () => document.body.textContent?.includes('Dwarkesh: New interview') ? 792 : 720,
    })

    const notify = mockOnFeedsRefreshed.mock.calls.at(-1)![0]
    notify([{ feedId: 'feed-123', newItemCount: 1 }])

    expect(await screen.findByText('Dwarkesh: New interview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show 1 new item above' })).toBeInTheDocument()
    expect(screen.getByText('Feed Item old')).toBeInTheDocument()
    await waitFor(() => expect(scroller.scrollTop).toBe(372))
  })

  it('adds an explicit bulk selection with local progress', async () => {
    const items = [feedItem('one'), feedItem('two')]
    mockFeedGetItems.mockResolvedValue(page(items))
    let finishAdd!: (value: Array<{ itemId: string; episodeId: string }>) => void
    mockFeedIngestItems.mockReturnValue(new Promise((resolve) => { finishAdd = resolve }))

    render(<FeedView feedId="feed-123" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Select Feed Items' }))
    fireEvent.click(screen.getByRole('button', { name: 'Feed Item one' }))
    fireEvent.click(screen.getByRole('button', { name: 'Feed Item two' }))
    const add = screen.getByRole('button', { name: 'Add 2 episodes' })
    fireEvent.click(add)

    expect(mockFeedIngestItems).toHaveBeenCalledWith('feed-123', ['one', 'two'])
    expect(screen.getByRole('button', { name: 'Adding 2 episodes' })).toBeDisabled()
    finishAdd([
      { itemId: 'one', episodeId: 'episode-one' },
      { itemId: 'two', episodeId: 'episode-two' },
    ])
    await waitFor(() => expect(screen.getAllByLabelText('In Library')).toHaveLength(2))
  })

  it('uses an explicit Select mode where row clicks toggle bulk selection without acknowledgement', async () => {
    mockFeedGetItems.mockResolvedValue(page([
      feedItem('one', { state: 'new' }),
      feedItem('two', { state: 'new' }),
    ]))

    render(<FeedView feedId="feed-123" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Select Feed Items' }))
    fireEvent.click(screen.getByText('Feed Item one'))
    fireEvent.click(screen.getByText('Feed Item two'))

    expect(mockFeedAcknowledgeItems).not.toHaveBeenCalled()
    expect(new Set(useSelectionStore.getState().selectedIds)).toEqual(new Set(['one', 'two']))
    expect(screen.getByText('2 items selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add 2 episodes' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useSelectionStore.getState().selectedIds.size).toBe(0)
    expect(screen.queryByText('2 items selected')).not.toBeInTheDocument()
  })
})
