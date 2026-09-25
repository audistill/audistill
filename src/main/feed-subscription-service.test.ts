import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseService } from './database-service'
import { FeedSubscriptionService, parseDurationToSeconds } from './feed-subscription-service'
import type { FeedService, FeedResult } from './feed-service'
import { IngestPipeline } from './ingest-pipeline'
import type { LicenseService } from './license-service'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  BrowserWindow: {
    getAllWindows: () => [],
    fromWebContents: () => null,
    getFocusedWindow: () => null,
  },
  dialog: { showOpenDialog: vi.fn() },
  ipcMain: { handle: vi.fn() },
  net: { fetch: vi.fn() },
}))

describe('FeedSubscriptionService', () => {
  let db: DatabaseService
  let service: FeedSubscriptionService
  let mockFeedService: FeedService

  const sampleFeedResult: FeedResult = {
    title: 'The Daily Tech',
    image: 'https://example.com/art.jpg',
    feedUrl: 'https://example.com/feed.xml',
    siteUrl: 'https://example.com',
    items: [
      {
        title: 'Episode 1: AI Revolution',
        enclosureUrl: 'https://example.com/audio1.mp3',
        guid: 'guid-1',
        pubDate: '2026-09-01T10:00:00Z',
        duration: '01:15:30',
        description: 'First episode about AI',
        link: 'https://example.com/ep1',
      },
      {
        title: 'Episode 2: Quantum Future',
        enclosureUrl: 'https://example.com/audio2.mp3',
        guid: null, // missing guid -> fallback to enclosureUrl
        pubDate: '2026-09-02T10:00:00Z',
        duration: '45:10',
        description: 'Second episode about quantum',
        link: 'https://example.com/ep2',
      },
    ],
  }

  beforeEach(() => {
    db = new DatabaseService(':memory:')
    mockFeedService = {
      fetchFeed: vi.fn().mockResolvedValue(sampleFeedResult),
    } as unknown as FeedService
    service = new FeedSubscriptionService(db, mockFeedService, { interFeedDelayMs: 0 })
  })

  function attachIngestPipeline(
    licenseState: 'licensed' | 'trial-expired' = 'licensed',
    ytdlpService: { fetchMetadata: (url: string) => Promise<unknown> } = {} as never
  ) {
    const pipeline = new IngestPipeline(db, {} as never, {} as never, {} as never, ytdlpService as never)
    pipeline.setLicenseService({ getState: () => licenseState } as LicenseService)
    const processQueue = vi.spyOn(
      pipeline as unknown as { processQueue: () => Promise<void> },
      'processQueue'
    ).mockResolvedValue(undefined)
    service.setIngestPipeline(pipeline)
    return { pipeline, processQueue }
  }

  describe('parseDurationToSeconds', () => {
    it('parses HH:MM:SS', () => {
      expect(parseDurationToSeconds('01:15:30')).toBe(3600 + 15 * 60 + 30)
    })

    it('parses MM:SS', () => {
      expect(parseDurationToSeconds('45:10')).toBe(45 * 60 + 10)
    })

    it('parses bare seconds string', () => {
      expect(parseDurationToSeconds('3600')).toBe(3600)
    })

    it('returns null for null, empty or invalid string', () => {
      expect(parseDurationToSeconds(null)).toBeNull()
      expect(parseDurationToSeconds('')).toBeNull()
      expect(parseDurationToSeconds('invalid')).toBeNull()
    })
  })

  describe('subscribe', () => {
    it('stores the feed and every item marked as seen (no backfill)', async () => {
      const result = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)

      expect(result.alreadySubscribed).toBe(false)
      expect(result.feed.title).toBe('The Daily Tech')
      expect(result.feed.url).toBe('https://example.com/feed.xml')
      expect(result.feed.image).toBe('https://example.com/art.jpg')
      expect(result.feed.site_url).toBe('https://example.com')

      const feeds = service.getSubscriptions()
      expect(feeds.length).toBe(1)

      const items = service.getFeedItems(result.feed.id)
      expect(items.length).toBe(2)

      // All items marked as 'seen'
      expect(items[0].state).toBe('seen')
      expect(items[1].state).toBe('seen')

      // Guid fallback to enclosureUrl when guid is null
      const ep2Item = items.find((i) => i.title === 'Episode 2: Quantum Future')
      expect(ep2Item?.guid).toBe('https://example.com/audio2.mp3')
      expect(ep2Item?.duration_sec).toBe(45 * 60 + 10)
    })

    it('stores a canonical YouTube feed as a YouTube Subscription', async () => {
      const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCexample'
      const result = await service.subscribe(feedUrl, {
        ...sampleFeedResult,
        feedUrl,
        title: 'Audistill Channel',
      })

      expect(result.feed.kind).toBe('youtube')
      expect(result.feed.title).toBe('Audistill Channel')
    })

    it('fetches feed via FeedService when previewData is not provided', async () => {
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({
        ...sampleFeedResult,
        etag: 'W/"fetched"',
        lastModified: 'Thu, 03 Sep 2026 10:00:00 GMT',
      })

      const result = await service.subscribe('https://example.com/feed.xml')

      expect(mockFeedService.fetchFeed).toHaveBeenCalledWith('https://example.com/feed.xml')
      expect(result.alreadySubscribed).toBe(false)
      expect(result.feed.title).toBe('The Daily Tech')
      expect(result.feed.etag).toBe('W/"fetched"')
      expect(result.feed.last_modified).toBe('Thu, 03 Sep 2026 10:00:00 GMT')
    })

    it('stores validators supplied with renderer preview data for the first refresh', async () => {
      const result = await service.subscribe('https://example.com/feed.xml', {
        ...sampleFeedResult,
        etag: 'W/"preview"',
        lastModified: 'Wed, 02 Sep 2026 10:00:00 GMT',
      })
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({ ...sampleFeedResult, items: [] })

      await service.refreshFeed(result.feed.id)

      expect(mockFeedService.fetchFeed).toHaveBeenCalledWith('https://example.com/feed.xml', {
        etag: 'W/"preview"',
        lastModified: 'Wed, 02 Sep 2026 10:00:00 GMT',
      })
    })

    it('links already-imported episodes and marks items as ingested', async () => {
      // Create an existing episode matching audio1.mp3
      const existingEpisodeId = db.createEpisode({
        title: 'Episode 1: AI Revolution',
        source_url: 'https://example.com/audio1.mp3',
        source_type: 'rss',
        status: 'complete',
      })

      const result = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)

      const items = service.getFeedItems(result.feed.id)
      const ingestedItem = items.find((i) => i.media_url === 'https://example.com/audio1.mp3')
      const seenItem = items.find((i) => i.media_url === 'https://example.com/audio2.mp3')

      expect(ingestedItem?.state).toBe('ingested')
      expect(ingestedItem?.episode_id).toBe(existingEpisodeId)

      expect(seenItem?.state).toBe('seen')
      expect(seenItem?.episode_id).toBeNull()
    })

    it('handles an existing subscription without duplicating or erroring', async () => {
      const firstResult = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      expect(firstResult.alreadySubscribed).toBe(false)

      // Subscribe again to the same feed URL
      const secondResult = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      expect(secondResult.alreadySubscribed).toBe(true)
      expect(secondResult.feed.id).toBe(firstResult.feed.id)

      // No duplicate feeds or items
      expect(service.getSubscriptions().length).toBe(1)
      expect(service.getFeedItems(firstResult.feed.id).length).toBe(2)
    })
  })

  describe('ingestItems', () => {
    it('creates an RSS Episode with feed provenance and links the Feed Item', async () => {
      const { processQueue } = attachIngestPipeline()
      const { feed } = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      const item = service.getFeedItems(feed.id).find((candidate) => candidate.guid === 'guid-1')!

      const ingestResults = await service.ingestItems(feed.id, [item.id])

      expect(ingestResults).toEqual([{ itemId: item.id, episodeId: expect.any(String) }])
      const episode = db.getEpisode(ingestResults[0].episodeId)!
      expect(episode.folder_id).toBeNull()
      expect(episode.source_type).toBe('rss')
      expect(episode.source_url).toBe(item.media_url)
      expect(episode.status).toBe('downloading')
      expect(JSON.parse(episode.source_meta!)).toEqual({
        feedUrl: feed.url,
        feedTitle: feed.title,
        feedImage: feed.image,
        pubDate: item.pub_date,
        description: item.description,
        duration: String(item.duration_sec),
        guid: item.guid,
      })
      expect(service.getFeedItems(feed.id).find((candidate) => candidate.id === item.id)).toMatchObject({
        state: 'ingested',
        episode_id: episode.id,
      })
      expect(processQueue).toHaveBeenCalledOnce()
    })

    it('creates a YouTube Episode through yt-dlp and links the Feed Item', async () => {
      const fetchMetadata = vi.fn().mockResolvedValue({
        title: 'Channel upload',
        channel: 'Audistill Channel',
        duration: 0,
        thumbnail: 'https://i.ytimg.com/vi/upload/hqdefault.jpg',
        uploadDate: '20260903',
      })
      const { processQueue } = attachIngestPipeline('licensed', { fetchMetadata })
      const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCexample'
      const { feed } = await service.subscribe(feedUrl, {
        title: 'Audistill Channel',
        image: 'https://example.com/channel.jpg',
        feedUrl,
        siteUrl: 'https://youtube.com/@audistill',
        items: [{
          title: 'Channel upload',
          enclosureUrl: 'https://www.youtube.com/watch?v=upload12345',
          guid: 'yt:video:upload12345',
          pubDate: '2026-09-03T10:00:00Z',
          duration: null,
          description: 'A channel upload',
        }],
      })
      const item = service.getFeedItems(feed.id)[0]

      const result = await service.ingestItems(feed.id, [item.id])

      expect(fetchMetadata).toHaveBeenCalledWith(item.media_url)
      expect(result).toEqual([{ itemId: item.id, episodeId: expect.any(String) }])
      expect(db.getEpisode(result[0].episodeId)).toMatchObject({
        source_type: 'youtube',
        source_url: item.media_url,
        status: 'downloading',
      })
      expect(service.getFeedItems(feed.id)[0]).toMatchObject({
        state: 'ingested',
        episode_id: result[0].episodeId,
      })
      expect(processQueue).toHaveBeenCalledOnce()
    })

    it('leaves a YouTube Feed Item unchanged when yt-dlp is missing', async () => {
      attachIngestPipeline('licensed', {
        fetchMetadata: vi.fn().mockResolvedValue({ code: 'extraction-failed', message: 'yt-dlp not found' }),
      })
      const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCexample'
      const { feed } = await service.subscribe(feedUrl, {
        ...sampleFeedResult,
        feedUrl,
        items: [{ ...sampleFeedResult.items[0], enclosureUrl: 'https://www.youtube.com/watch?v=upload12345' }],
      })
      const item = service.getFeedItems(feed.id)[0]

      await expect(service.ingestItems(feed.id, [item.id])).rejects.toThrow('yt-dlp not found')
      expect(service.getFeedItems(feed.id)[0]).toMatchObject({ state: 'seen', episode_id: null })
      expect(db.getEpisodes()).toHaveLength(0)
    })

    it('ignores item IDs belonging to another Feed', async () => {
      attachIngestPipeline()
      const { feed: firstFeed } = await service.subscribe('https://example.com/a.xml', {
        ...sampleFeedResult,
        feedUrl: 'https://example.com/a.xml',
      })
      const { feed: secondFeed } = await service.subscribe('https://example.com/b.xml', {
        ...sampleFeedResult,
        feedUrl: 'https://example.com/b.xml',
        items: [{ ...sampleFeedResult.items[0], enclosureUrl: 'https://example.com/b.mp3', guid: 'b-guid' }],
      })
      const firstItem = service.getFeedItems(firstFeed.id)[0]
      const secondItem = service.getFeedItems(secondFeed.id)[0]

      const ingestResults = await service.ingestItems(firstFeed.id, [firstItem.id, secondItem.id])

      expect(ingestResults).toEqual([{ itemId: firstItem.id, episodeId: expect.any(String) }])
      expect(db.getEpisodes()).toHaveLength(1)
      expect(service.getFeedItems(firstFeed.id)[0].state).toBe('ingested')
      expect(service.getFeedItems(secondFeed.id)[0].state).toBe('seen')
    })

    it('links an Episode imported after subscription instead of creating a duplicate', async () => {
      const { processQueue } = attachIngestPipeline()
      const { feed } = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      const item = service.getFeedItems(feed.id)[0]
      const existingEpisodeId = db.createEpisode({
        title: item.title,
        source_url: item.media_url,
        source_type: 'rss',
        status: 'complete',
      })

      const ingestResults = await service.ingestItems(feed.id, [item.id])

      expect(ingestResults).toEqual([{ itemId: item.id, episodeId: existingEpisodeId }])
      expect(db.getEpisodes()).toHaveLength(1)
      expect(service.getFeedItems(feed.id)[0]).toMatchObject({
        state: 'ingested',
        episode_id: existingEpisodeId,
      })
      expect(processQueue).not.toHaveBeenCalled()
    })

    it('is idempotent for repeated and concurrent requests', async () => {
      attachIngestPipeline()
      const { feed } = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      const item = service.getFeedItems(feed.id)[0]

      const [first, concurrentRepeat] = await Promise.all([
        service.ingestItems(feed.id, [item.id]),
        service.ingestItems(feed.id, [item.id]),
      ])
      const laterRepeat = await service.ingestItems(feed.id, [item.id])

      expect(first).toHaveLength(1)
      expect(concurrentRepeat).toEqual([])
      expect(laterRepeat).toEqual([])
      expect(db.getEpisodesBySourceUrls([item.media_url])).toHaveLength(1)
    })

    it('checks the License before linking existing Episodes and leaves items unchanged when blocked', async () => {
      attachIngestPipeline('trial-expired')
      const { feed } = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      const item = service.getFeedItems(feed.id)[0]
      db.createEpisode({
        title: item.title,
        source_url: item.media_url,
        source_type: 'rss',
        status: 'complete',
      })

      await expect(service.ingestItems(feed.id, [item.id])).rejects.toThrow('Trial has ended')

      expect(service.getFeedItems(feed.id)[0]).toMatchObject({ state: 'seen', episode_id: null })
      expect(db.getEpisodes()).toHaveLength(1)
    })

    it('rolls back Episode creation when linking Feed Items fails', async () => {
      const { processQueue } = attachIngestPipeline()
      const { feed } = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      const item = service.getFeedItems(feed.id)[0]
      vi.spyOn(db, 'markFeedItemsIngested').mockImplementationOnce(() => {
        throw new Error('link failed')
      })

      await expect(service.ingestItems(feed.id, [item.id])).rejects.toThrow('link failed')

      expect(db.getEpisodes()).toHaveLength(0)
      expect(service.getFeedItems(feed.id)[0]).toMatchObject({ state: 'seen', episode_id: null })
      expect(processQueue).not.toHaveBeenCalled()
    })
  })

  describe('unsubscribe', () => {
    it('removes the feed and its items, leaving episodes untouched', async () => {
      const episodeId = db.createEpisode({
        title: 'Episode 1: AI Revolution',
        source_url: 'https://example.com/audio1.mp3',
        source_type: 'rss',
        status: 'complete',
      })

      const result = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      expect(service.getSubscriptions().length).toBe(1)
      expect(service.getFeedItems(result.feed.id).length).toBe(2)

      // Unsubscribe
      service.unsubscribe(result.feed.id)

      expect(service.getSubscriptions().length).toBe(0)
      expect(service.getFeedItems(result.feed.id).length).toBe(0)

      // Episode is untouched
      const ep = db.getEpisode(episodeId)
      expect(ep).toBeDefined()
      expect(ep?.title).toBe('Episode 1: AI Revolution')
    })
  })

  describe('reorderFeeds', () => {
    it('updates feed sort order', async () => {
      const feedA = await service.subscribe('https://example.com/a.xml', {
        ...sampleFeedResult,
        feedUrl: 'https://example.com/a.xml',
        title: 'Feed A',
      })
      const feedB = await service.subscribe('https://example.com/b.xml', {
        ...sampleFeedResult,
        feedUrl: 'https://example.com/b.xml',
        title: 'Feed B',
      })

      const initialFeeds = service.getSubscriptions()
      expect(initialFeeds.map((f) => f.title)).toEqual(['Feed A', 'Feed B'])

      // Reorder B before A
      service.reorderFeeds([feedB.feed.id, feedA.feed.id])

      const reorderedFeeds = service.getSubscriptions()
      expect(reorderedFeeds.map((f) => f.title)).toEqual(['Feed B', 'Feed A'])
    })
  })

  describe('refreshFeed', () => {
    async function subscribed(): Promise<string> {
      const { feed } = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      return feed.id
    }

    function feedResultWith(items: FeedResult['items']): FeedResult {
      return { ...sampleFeedResult, items }
    }

    const newItem = {
      title: 'Episode 3: Fresh',
      enclosureUrl: 'https://example.com/audio3.mp3',
      guid: 'guid-3',
      pubDate: '2026-09-03T10:00:00Z',
      duration: '30:00',
      description: 'Third episode',
      link: 'https://example.com/ep3',
    }

    it('marks items that appeared since the last check as new, leaving known items alone', async () => {
      const feedId = await subscribed()
      mockFeedService.fetchFeed = vi
        .fn()
        .mockResolvedValue(feedResultWith([newItem, ...sampleFeedResult.items]))

      const result = await service.refreshFeed(feedId)

      expect(result.newItemCount).toBe(1)
      const items = db.getFeedItems(feedId)
      expect(items).toHaveLength(3)
      expect(items.filter((i) => i.state === 'new').map((i) => i.title)).toEqual(['Episode 3: Fresh'])
      expect(items.filter((i) => i.state === 'seen')).toHaveLength(2)
    })

    it('does not resurface a re-published item whose guid is already known', async () => {
      const feedId = await subscribed()
      const republished = { ...sampleFeedResult.items[0], title: 'Episode 1: AI Revolution (updated)' }
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue(feedResultWith([republished]))

      const result = await service.refreshFeed(feedId)

      expect(result.newItemCount).toBe(0)
      expect(db.getFeedItems(feedId).some((i) => i.state === 'new')).toBe(false)
    })

    it('retains every item returned by a feed and does not resurface stable entries', async () => {
      const catalogue = Array.from({ length: 201 }, (_, index) => ({
        title: `Episode ${index}`,
        enclosureUrl: `https://example.com/audio-${index}.mp3`,
        guid: `guid-${index}`,
        pubDate: new Date(Date.UTC(2026, 0, index + 1)).toUTCString(),
        duration: '30:00',
        description: null,
        link: null,
      }))
      const { feed } = await service.subscribe('https://example.com/feed.xml', feedResultWith(catalogue))
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue(feedResultWith(catalogue))

      await service.refreshFeed(feed.id)
      expect(service.getFeedItems(feed.id)).toHaveLength(201)

      const nextCheck = await service.refreshFeed(feed.id)

      expect(nextCheck.newItemCount).toBe(0)
      expect(service.getFeedItems(feed.id).some((item) => item.state === 'new')).toBe(false)
    })

    it('does not resurface cleared items after a newer item extends the catalogue', async () => {
      const catalogue = Array.from({ length: 200 }, (_, index) => ({
        title: `Episode ${index}`,
        enclosureUrl: `https://example.com/audio-${index}.mp3`,
        guid: `guid-${index}`,
        pubDate: new Date(Date.UTC(2026, 0, 200 - index)).toUTCString(),
        duration: '30:00',
        description: null,
        link: null,
      }))
      const { feed } = await service.subscribe('https://example.com/feed.xml', feedResultWith(catalogue))
      const latest = {
        ...newItem,
        guid: 'guid-latest',
        enclosureUrl: 'https://example.com/audio-latest.mp3',
        pubDate: new Date(Date.UTC(2026, 8, 4)).toUTCString(),
      }
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue(feedResultWith([latest, ...catalogue]))

      expect((await service.refreshFeed(feed.id)).newItemCount).toBe(1)
      service.clearNewItems(feed.id)

      const unchangedCheck = await service.refreshFeed(feed.id)

      expect(unchangedCheck.newItemCount).toBe(0)
      expect(service.getFeedItems(feed.id).some((item) => item.state === 'new')).toBe(false)
    })

    it('records an arriving item as ingested when its media is already an Episode', async () => {
      const feedId = await subscribed()
      db.createEpisode({ title: 'Already have it', source_url: newItem.enclosureUrl })
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue(feedResultWith([newItem]))

      const result = await service.refreshFeed(feedId)

      expect(result.newItemCount).toBe(0)
      const stored = db.getFeedItems(feedId).find((i) => i.media_url === newItem.enclosureUrl)!
      expect(stored.state).toBe('ingested')
      expect(stored.episode_id).not.toBeNull()
    })

    it('replays stored validators and records the ones the server returns', async () => {
      const feedId = await subscribed()
      const fetchFeed = vi.fn().mockResolvedValue({
        ...feedResultWith([]),
        etag: 'W/"v2"',
        lastModified: 'Thu, 03 Sep 2026 10:00:00 GMT',
      })
      mockFeedService.fetchFeed = fetchFeed

      await service.refreshFeed(feedId)
      expect(fetchFeed).toHaveBeenCalledWith('https://example.com/feed.xml', {
        etag: null,
        lastModified: null,
      })
      expect(db.getFeed(feedId)!.etag).toBe('W/"v2"')

      await service.refreshFeed(feedId)
      expect(fetchFeed).toHaveBeenLastCalledWith('https://example.com/feed.xml', {
        etag: 'W/"v2"',
        lastModified: 'Thu, 03 Sep 2026 10:00:00 GMT',
      })
    })

    it('treats an unchanged feed as a successful check that adds nothing', async () => {
      const feedId = await subscribed()
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({
        title: '',
        image: null,
        feedUrl: 'https://example.com/feed.xml',
        items: [],
        notModified: true,
      })

      const result = await service.refreshFeed(feedId)

      expect(result.newItemCount).toBe(0)
      const feed = db.getFeed(feedId)!
      expect(feed.last_fetched_at).not.toBeNull()
      expect(feed.last_error).toBeNull()
      expect(db.getFeedItems(feedId)).toHaveLength(2)
    })

    it('stores the reason a feed could not be reached without throwing', async () => {
      const feedId = await subscribed()
      mockFeedService.fetchFeed = vi.fn().mockRejectedValue(new Error('HTTP 503'))

      const result = await service.refreshFeed(feedId)

      expect(result.error).toContain('HTTP 503')
      const feed = db.getFeed(feedId)!
      expect(feed.last_error).toContain('HTTP 503')
      expect(feed.last_fetched_at).not.toBeNull()
    })

    it('clears a stored error once the feed loads again', async () => {
      const feedId = await subscribed()
      mockFeedService.fetchFeed = vi.fn().mockRejectedValue(new Error('HTTP 503'))
      await service.refreshFeed(feedId)
      expect(db.getFeed(feedId)!.last_error).not.toBeNull()

      mockFeedService.fetchFeed = vi.fn().mockResolvedValue(feedResultWith([]))
      await service.refreshFeed(feedId)

      expect(db.getFeed(feedId)!.last_error).toBeNull()
    })
  })

  describe('refresh concurrency and validators', () => {
    it('clears validators the server has stopped sending instead of replaying stale ones', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({
        ...sampleFeedResult,
        items: [],
        etag: 'W/"v1"',
        lastModified: 'Thu, 03 Sep 2026 10:00:00 GMT',
      })
      await service.refreshFeed(feed.id)
      expect(db.getFeed(feed.id)!.etag).toBe('W/"v1"')

      // Server drops its ETag: replaying the old one would risk a spurious 304
      // and permanently missed items.
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({
        ...sampleFeedResult,
        items: [],
        etag: null,
        lastModified: null,
      })
      await service.refreshFeed(feed.id)

      expect(db.getFeed(feed.id)!.etag).toBeNull()
      expect(db.getFeed(feed.id)!.last_modified).toBeNull()
    })

    it('keeps validators when a check does not reach a fresh body', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      mockFeedService.fetchFeed = vi
        .fn()
        .mockResolvedValue({ ...sampleFeedResult, items: [], etag: 'W/"keep"', lastModified: null })
      await service.refreshFeed(feed.id)

      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({
        title: '',
        image: null,
        feedUrl: feed.url,
        items: [],
        notModified: true,
      })
      await service.refreshFeed(feed.id)
      expect(db.getFeed(feed.id)!.etag).toBe('W/"keep"')

      mockFeedService.fetchFeed = vi.fn().mockRejectedValue(new Error('offline'))
      await service.refreshFeed(feed.id)
      expect(db.getFeed(feed.id)!.etag).toBe('W/"keep"')
    })

    it('serialises checks triggered from different places rather than overlapping them', async () => {
      const a = await service.subscribe('https://example.com/a.xml', { ...sampleFeedResult, items: [] })
      const b = await service.subscribe('https://example.com/b.xml', { ...sampleFeedResult, items: [] })

      let inFlight = 0
      let maxInFlight = 0
      mockFeedService.fetchFeed = vi.fn().mockImplementation(async () => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((r) => setTimeout(r, 5))
        inFlight--
        return { ...sampleFeedResult, items: [] }
      })

      // A scheduled sweep and a user-triggered check at the same moment.
      await Promise.all([
        service.refreshAllFeeds(),
        service.refreshFeed(a.feed.id),
        service.refreshFeed(b.feed.id),
      ])

      expect(maxInFlight).toBe(1)
    })

    it('reports each feed as it starts and finishes being checked', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', { ...sampleFeedResult, items: [] })
      const events: string[] = []
      service.onFeedRefreshActivity((feedId, refreshing) =>
        events.push(`${feedId === feed.id ? 'feed' : feedId}:${refreshing}`)
      )
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({ ...sampleFeedResult, items: [] })

      await service.refreshFeed(feed.id)

      expect(events).toEqual(['feed:true', 'feed:false'])
    })

    it('reports a feed as finished even when its check fails', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', { ...sampleFeedResult, items: [] })
      const events: boolean[] = []
      service.onFeedRefreshActivity((_id, refreshing) => events.push(refreshing))
      mockFeedService.fetchFeed = vi.fn().mockRejectedValue(new Error('offline'))

      await service.refreshFeed(feed.id)

      expect(events).toEqual([true, false])
    })
  })

  describe('refreshAllFeeds', () => {
    it('checks feeds one at a time and keeps going after one fails', async () => {
      await service.subscribe('https://example.com/a.xml', { ...sampleFeedResult, items: [] })
      await service.subscribe('https://example.com/b.xml', { ...sampleFeedResult, items: [] })

      let inFlight = 0
      let maxInFlight = 0
      mockFeedService.fetchFeed = vi.fn().mockImplementation(async (url: string) => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((r) => setTimeout(r, 5))
        inFlight--
        if (url.endsWith('a.xml')) throw new Error('HTTP 500')
        return { ...sampleFeedResult, items: [] }
      })

      await service.refreshAllFeeds()

      expect(maxInFlight).toBe(1)
      expect(mockFeedService.fetchFeed).toHaveBeenCalledTimes(2)
      expect(db.getFeedByUrl('https://example.com/a.xml')!.last_error).toContain('HTTP 500')
      expect(db.getFeedByUrl('https://example.com/b.xml')!.last_error).toBeNull()
    })

    it('skips a feed that was checked moments ago', async () => {
      const { feed } = await service.subscribe('https://example.com/a.xml', { ...sampleFeedResult, items: [] })
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({ ...sampleFeedResult, items: [] })

      await service.refreshFeed(feed.id)
      expect(mockFeedService.fetchFeed).toHaveBeenCalledTimes(1)

      await service.refreshAllFeeds({ minAgeMs: 60_000 })
      expect(mockFeedService.fetchFeed).toHaveBeenCalledTimes(1)

      await service.refreshAllFeeds({ minAgeMs: 0 })
      expect(mockFeedService.fetchFeed).toHaveBeenCalledTimes(2)
    })

    it('retries a recently failed feed on the next sweep', async () => {
      const { feed } = await service.subscribe('https://example.com/a.xml', { ...sampleFeedResult, items: [] })
      mockFeedService.fetchFeed = vi.fn().mockRejectedValueOnce(new Error('offline'))
      await service.refreshFeed(feed.id)

      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({ ...sampleFeedResult, items: [] })
      await service.refreshAllFeeds({ minAgeMs: 60_000 })

      expect(mockFeedService.fetchFeed).toHaveBeenCalledTimes(1)
      expect(db.getFeed(feed.id)!.last_error).toBeNull()
    })

    it('waits between eligible feeds', async () => {
      await service.subscribe('https://example.com/a.xml', { ...sampleFeedResult, items: [] })
      await service.subscribe('https://example.com/b.xml', { ...sampleFeedResult, items: [] })
      let releaseDelay: (() => void) | undefined
      const delay = vi.fn(() => new Promise<void>((resolve) => { releaseDelay = resolve }))
      service = new FeedSubscriptionService(db, mockFeedService, {
        interFeedDelayMs: 1_000,
        delay,
      })
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({ ...sampleFeedResult, items: [] })

      const sweep = service.refreshAllFeeds()
      await vi.waitFor(() => expect(mockFeedService.fetchFeed).toHaveBeenCalledTimes(1))
      expect(delay).toHaveBeenCalledWith(1_000)
      expect(mockFeedService.fetchFeed).toHaveBeenCalledTimes(1)

      releaseDelay!()
      await sweep
      expect(mockFeedService.fetchFeed).toHaveBeenCalledTimes(2)
      expect(delay).toHaveBeenCalledTimes(1)
    })
  })

  describe('catalogue queries', () => {
    it('pages deterministically through All and keeps New as a subset', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', { ...sampleFeedResult, items: [] })
      db.createFeedItems([
        { id: 'newest', feed_id: feed.id, guid: 'newest', title: 'Newest', media_url: 'https://example.com/newest.mp3', state: 'new', pub_date: '2026-09-03T10:00:00Z' },
        { id: 'middle', feed_id: feed.id, guid: 'middle', title: 'Middle', media_url: 'https://example.com/middle.mp3', state: 'seen', pub_date: '2026-09-02T10:00:00Z' },
        { id: 'oldest', feed_id: feed.id, guid: 'oldest', title: 'Oldest', media_url: 'https://example.com/oldest.mp3', state: 'ingested', pub_date: '2026-09-01T10:00:00Z' },
      ])

      const first = service.getFeedItemPage(feed.id, { filter: 'all', limit: 2 })
      const second = service.getFeedItemPage(feed.id, { filter: 'all', limit: 2, cursor: first.nextCursor })
      const newItems = service.getFeedItemPage(feed.id, { filter: 'new', limit: 2 })

      expect(first.items.map((item) => item.id)).toEqual(['newest', 'middle'])
      expect(first.total).toBe(3)
      expect(first.nextCursor).not.toBeNull()
      expect(second.items.map((item) => item.id)).toEqual(['oldest'])
      expect(second.nextCursor).toBeNull()
      expect(newItems.items.map((item) => item.id)).toEqual(['newest'])
      expect(newItems.total).toBe(1)
    })
  })

  describe('queue management', () => {
    it('acknowledges one New item without changing its siblings', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', { ...sampleFeedResult, items: [] })
      db.createFeedItems([
        { id: 'clicked', feed_id: feed.id, guid: 'clicked', title: 'Clicked', media_url: 'https://example.com/clicked.mp3', state: 'new' },
        { id: 'untouched', feed_id: feed.id, guid: 'untouched', title: 'Untouched', media_url: 'https://example.com/untouched.mp3', state: 'new' },
      ])

      const result = service.acknowledgeItems(feed.id, ['clicked'])

      expect(result).toEqual({ itemIds: ['clicked'] })
      const byId = new Map(service.getFeedItems(feed.id).map((item) => [item.id, item.state]))
      expect(byId.get('clicked')).toBe('seen')
      expect(byId.get('untouched')).toBe('new')
    })

    it('clears the invocation snapshot including unloaded New items', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', { ...sampleFeedResult, items: [] })
      db.createFeedItems([
        { id: 'loaded', feed_id: feed.id, guid: 'loaded', title: 'Loaded', media_url: 'https://example.com/loaded.mp3', state: 'new' },
        { id: 'unloaded', feed_id: feed.id, guid: 'unloaded', title: 'Unloaded', media_url: 'https://example.com/unloaded.mp3', state: 'new' },
        { id: 'already-seen', feed_id: feed.id, guid: 'already-seen', title: 'Already seen', media_url: 'https://example.com/already-seen.mp3', state: 'seen' },
      ])

      const result = service.clearNewItems(feed.id)
      db.createFeedItems([
        { id: 'arrived-later', feed_id: feed.id, guid: 'arrived-later', title: 'Arrived later', media_url: 'https://example.com/arrived-later.mp3', state: 'new' },
      ])

      expect(new Set(result.itemIds)).toEqual(new Set(['loaded', 'unloaded']))
      const byId = new Map(service.getFeedItems(feed.id).map((item) => [item.id, item.state]))
      expect(byId.get('loaded')).toBe('seen')
      expect(byId.get('unloaded')).toBe('seen')
      expect(byId.get('arrived-later')).toBe('new')
      expect(byId.get('already-seen')).toBe('seen')
    })

    it('restores acknowledged items to new without changing ingested items', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', { ...sampleFeedResult, items: [] })
      const episodeId = db.createEpisode({ title: 'Already added' })
      db.createFeedItems([
        { id: 'cleared', feed_id: feed.id, guid: 'cleared', title: 'Cleared', media_url: 'https://example.com/cleared.mp3', state: 'seen' },
        { id: 'added', feed_id: feed.id, guid: 'added', title: 'Added', media_url: 'https://example.com/added.mp3', state: 'ingested', episode_id: episodeId },
      ])

      service.restoreNewItems(feed.id, ['cleared', 'added'])

      const byId = new Map(service.getFeedItems(feed.id).map((item) => [item.id, item.state]))
      expect(byId.get('cleared')).toBe('new')
      expect(byId.get('added')).toBe('ingested')
    })

    it('returns an item to All as seen when its linked Episode is deleted', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', { ...sampleFeedResult, items: [] })
      const episodeId = db.createEpisode({ title: 'Imported' })
      db.createFeedItems([{
        id: 'linked', feed_id: feed.id, guid: 'linked', title: 'Linked',
        media_url: 'https://example.com/linked.mp3', state: 'ingested', episode_id: episodeId,
      }])

      db.deleteEpisode(episodeId)

      const item = service.getFeedItems(feed.id)[0]
      expect(item.state).toBe('seen')
      expect(item.episode_id).toBeNull()
    })
  })

  describe('new item counts', () => {
    it('counts new items per feed and clears them when the feed is marked seen', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', sampleFeedResult)
      mockFeedService.fetchFeed = vi.fn().mockResolvedValue({
        ...sampleFeedResult,
        items: [
          {
            title: 'Episode 3: Fresh',
            enclosureUrl: 'https://example.com/audio3.mp3',
            guid: 'guid-3',
            pubDate: '2026-09-03T10:00:00Z',
            duration: '30:00',
            description: null,
            link: null,
          },
        ],
      })
      await service.refreshFeed(feed.id)

      expect(service.getNewItemCounts()).toEqual({ [feed.id]: 1 })

      service.clearNewItems(feed.id)

      expect(service.getNewItemCounts()).toEqual({})
      expect(db.getFeedItems(feed.id).some((i) => i.state === 'new')).toBe(false)
    })

    it('leaves ingested and seen items out of the count', async () => {
      const { feed } = await service.subscribe('https://example.com/feed.xml', { ...sampleFeedResult, items: [] })
      db.createFeedItems([
        { feed_id: feed.id, guid: 'n', title: 'New', media_url: 'https://x/1.mp3', state: 'new' },
        { feed_id: feed.id, guid: 'i', title: 'Ingested', media_url: 'https://x/2.mp3', state: 'ingested' },
        { feed_id: feed.id, guid: 's', title: 'Seen', media_url: 'https://x/3.mp3', state: 'seen' },
      ])

      expect(service.getNewItemCounts()).toEqual({ [feed.id]: 1 })
    })
  })
})
