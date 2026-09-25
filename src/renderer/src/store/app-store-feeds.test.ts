import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Feed } from '../../../shared/feed-subscription'

const mockApi = {
  getEpisodes: vi.fn().mockResolvedValue([]),
  getFolders: vi.fn().mockResolvedValue([]),
  getOpenTabs: vi.fn().mockResolvedValue([]),
  getSetting: vi.fn().mockResolvedValue(null),
  feedGetSubscriptions: vi.fn().mockResolvedValue([]),
  feedReorder: vi.fn().mockResolvedValue(undefined),
  feedUnsubscribe: vi.fn().mockResolvedValue(undefined),
  feedRefresh: vi.fn().mockResolvedValue({ feedId: 'feed-1', newItemCount: 0 }),
  feedRefreshAll: vi.fn().mockResolvedValue([]),
  feedClearNewItems: vi.fn().mockResolvedValue({ itemIds: [] }),
  feedGetNewCounts: vi.fn().mockResolvedValue({}),
  feedStartScheduler: vi.fn().mockResolvedValue(undefined),
}

;(globalThis as any).window = { api: mockApi }

import { useAppStore } from './app-store'

describe('app-store feeds', () => {
  const sampleFeeds: Feed[] = [
    {
      id: 'feed-1',
      url: 'https://example.com/1.xml',
      kind: 'rss',
      title: 'Feed 1',
      image: null,
      site_url: null,
      etag: null,
      last_modified: null,
      last_fetched_at: null,
      last_error: null,
      auto_ingest: 0,
      auto_ingest_folder_id: null,
      min_duration_sec: null,
      max_duration_sec: null,
      skip_live: 1,
      sort_order: 0,
      created_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'feed-2',
      url: 'https://example.com/2.xml',
      kind: 'rss',
      title: 'Feed 2',
      image: null,
      site_url: null,
      etag: null,
      last_modified: null,
      last_fetched_at: null,
      last_error: null,
      auto_ingest: 0,
      auto_ingest_folder_id: null,
      min_duration_sec: null,
      max_duration_sec: null,
      skip_live: 1,
      sort_order: 1,
      created_at: '2026-09-02T00:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      feeds: [],
      feedsCollapsed: false,
    })
  })

  it('hydrates feeds from window.api.feedGetSubscriptions', async () => {
    mockApi.feedGetSubscriptions.mockResolvedValueOnce(sampleFeeds)

    await useAppStore.getState().hydrate()

    expect(useAppStore.getState().feeds).toEqual(sampleFeeds)
  })

  it('starts scheduled checks only after renderer hydration completes', async () => {
    let finishLoadingFeeds: ((feeds: Feed[]) => void) | undefined
    mockApi.feedGetSubscriptions.mockReturnValueOnce(
      new Promise<Feed[]>((resolve) => { finishLoadingFeeds = resolve })
    )

    const hydration = useAppStore.getState().hydrate()
    await Promise.resolve()
    expect(mockApi.feedStartScheduler).not.toHaveBeenCalled()

    finishLoadingFeeds!(sampleFeeds)
    await hydration

    expect(useAppStore.getState().hydrated).toBe(true)
    expect(mockApi.feedStartScheduler).toHaveBeenCalledTimes(1)
  })

  it('toggles feedsCollapsed and updates localStorage', () => {
    expect(useAppStore.getState().feedsCollapsed).toBe(false)

    useAppStore.getState().toggleFeedsCollapsed()
    expect(useAppStore.getState().feedsCollapsed).toBe(true)

    useAppStore.getState().toggleFeedsCollapsed()
    expect(useAppStore.getState().feedsCollapsed).toBe(false)
  })

  it('reorders feeds and calls api', async () => {
    useAppStore.setState({ feeds: sampleFeeds })

    await useAppStore.getState().reorderFeeds(['feed-2', 'feed-1'])

    const reordered = useAppStore.getState().feeds
    expect(reordered.map((f) => f.id)).toEqual(['feed-2', 'feed-1'])
    expect(reordered[0].sort_order).toBe(0)
    expect(reordered[1].sort_order).toBe(1)
    expect(mockApi.feedReorder).toHaveBeenCalledWith(['feed-2', 'feed-1'])
  })

  it('unsubscribes feed and updates store', async () => {
    useAppStore.setState({ feeds: sampleFeeds })

    await useAppStore.getState().unsubscribeFeed('feed-1')

    const remaining = useAppStore.getState().feeds
    expect(remaining.map((f) => f.id)).toEqual(['feed-2'])
    expect(mockApi.feedUnsubscribe).toHaveBeenCalledWith('feed-1')
  })

  it('manages feed workspace state', () => {
    useAppStore.setState({
      feeds: sampleFeeds,
      tabs: [{ id: 'ep-1', episodeId: 'ep-1', preview: false }],
      activeTabId: 'ep-1',
      feedWorkspaceOpen: false,
      feedWorkspaceActive: false,
      activeFeedId: null,
    })

    // Opening workspace sets feed active and remembers previous tab
    useAppStore.getState().openFeedWorkspace('feed-1')
    expect(useAppStore.getState().feedWorkspaceOpen).toBe(true)
    expect(useAppStore.getState().feedWorkspaceActive).toBe(true)
    expect(useAppStore.getState().activeFeedId).toBe('feed-1')
    expect(useAppStore.getState().previousActiveTabId).toBe('ep-1')

    // Opening another feed replaces activeFeedId
    useAppStore.getState().openFeedWorkspace('feed-2')
    expect(useAppStore.getState().activeFeedId).toBe('feed-2')

    // Closing workspace deactivates and restores previous activeTabId
    useAppStore.getState().closeFeedWorkspace()
    expect(useAppStore.getState().feedWorkspaceOpen).toBe(false)
    expect(useAppStore.getState().feedWorkspaceActive).toBe(false)
    expect(useAppStore.getState().activeFeedId).toBeNull()
    expect(useAppStore.getState().activeTabId).toBe('ep-1')
  })

  describe('new item counts', () => {
    beforeEach(() => {
      useAppStore.setState({ feeds: sampleFeeds, newFeedItemCounts: {}, refreshingFeedIds: [] })
    })

    it('reloads feeds and counts once a check finishes', async () => {
      mockApi.feedGetNewCounts.mockResolvedValue({ 'feed-1': 2 })
      mockApi.feedRefresh.mockResolvedValue({ feedId: 'feed-1', newItemCount: 2 })

      await useAppStore.getState().refreshFeed('feed-1')

      expect(mockApi.feedRefresh).toHaveBeenCalledWith('feed-1')
      expect(mockApi.feedGetSubscriptions).toHaveBeenCalled()
      expect(useAppStore.getState().newFeedItemCounts).toEqual({ 'feed-1': 2 })
    })

    it('shows a feed as being checked whoever triggered the check', () => {
      // Background sweeps report through the same path as a manual refresh,
      // so the spinner is driven by the event rather than set optimistically.
      useAppStore.getState().setFeedRefreshing('feed-1', true)
      expect(useAppStore.getState().refreshingFeedIds).toEqual(['feed-1'])

      useAppStore.getState().setFeedRefreshing('feed-1', true)
      expect(useAppStore.getState().refreshingFeedIds).toEqual(['feed-1'])

      useAppStore.getState().setFeedRefreshing('feed-2', true)
      expect(useAppStore.getState().refreshingFeedIds).toEqual(['feed-1', 'feed-2'])

      useAppStore.getState().setFeedRefreshing('feed-1', false)
      expect(useAppStore.getState().refreshingFeedIds).toEqual(['feed-2'])
    })

    it('does not start a second check for a feed already being checked', async () => {
      mockApi.feedRefresh.mockResolvedValue({ feedId: 'feed-1', newItemCount: 0 })
      useAppStore.setState({ refreshingFeedIds: ['feed-1'] })

      await useAppStore.getState().refreshFeed('feed-1')

      expect(mockApi.feedRefresh).not.toHaveBeenCalled()
    })

    it('clears only the requested Feed count from the sidebar action', async () => {
      useAppStore.setState({ newFeedItemCounts: { 'feed-1': 3, 'feed-2': 1 } })
      mockApi.feedClearNewItems.mockResolvedValueOnce({ itemIds: ['a', 'b', 'c'] })

      await useAppStore.getState().clearFeedNew('feed-1')

      expect(mockApi.feedClearNewItems).toHaveBeenCalledWith('feed-1')
      expect(useAppStore.getState().newFeedItemCounts).toEqual({ 'feed-2': 1 })
    })

    it('drops a feed count when the feed is unsubscribed', async () => {
      useAppStore.setState({ newFeedItemCounts: { 'feed-1': 3, 'feed-2': 1 } })

      await useAppStore.getState().unsubscribeFeed('feed-1')

      expect(useAppStore.getState().newFeedItemCounts).toEqual({ 'feed-2': 1 })
    })
  })
})
