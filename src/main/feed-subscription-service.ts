import { randomUUID } from 'crypto'
import type { DatabaseService, Episode, FeedItemQueryCursor } from './database-service'
import { FeedService, type FeedResult } from './feed-service'
import type { IngestPipeline } from './ingest-pipeline'
import type {
  Feed,
  FeedItem,
  FeedItemIngestResult,
  FeedItemMutationResult,
  FeedItemPage,
  FeedItemPageRequest,
  FeedRefreshResult,
  RssIngestItem,
  SubscribeFeedResult,
} from '../shared/feed-subscription'

export function parseDurationToSeconds(duration: string | null | undefined): number | null {
  if (!duration) return null
  const str = String(duration).trim()
  if (!str) return null
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10)
  }
  const parts = str.split(':').map((p) => parseInt(p, 10))
  if (parts.some((n) => isNaN(n))) return null
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return null
}

/**
 * Build Feed Item rows from what a feed served.
 *
 * Subscribe and refresh differ only in what an unmatched item counts as:
 * subscribing records a back catalogue as `seen` so it is not presented as a
 * backlog, while a later check records an arrival as `new`.
 */
function toFeedItemRows(
  feedId: string,
  items: FeedResult['items'],
  episodeByUrl: Map<string, Episode>,
  options: { unmatchedState: 'seen' | 'new'; at: string }
): Parameters<DatabaseService['createFeedItems']>[0] {
  return items.map((item) => {
    const matchedEpisode = item.enclosureUrl ? episodeByUrl.get(item.enclosureUrl) : undefined
    return {
      id: randomUUID(),
      feed_id: feedId,
      guid: item.guid || item.enclosureUrl,
      title: item.title || 'Untitled',
      media_url: item.enclosureUrl,
      page_url: item.link ?? null,
      pub_date: item.pubDate ?? null,
      duration_sec: parseDurationToSeconds(item.duration),
      description: item.description ?? null,
      state: matchedEpisode ? ('ingested' as const) : options.unmatchedState,
      episode_id: matchedEpisode ? matchedEpisode.id : null,
      first_seen_at: options.at,
    }
  })
}

export interface FeedSubscriptionServiceOptions {
  interFeedDelayMs?: number
  delay?: (ms: number) => Promise<void>
}

const DEFAULT_INTER_FEED_DELAY_MS = 1_000
const DEFAULT_FEED_ITEM_PAGE_SIZE = 50
const MAX_FEED_ITEM_PAGE_SIZE = 200

function decodeFeedItemCursor(cursor: string | null | undefined): FeedItemQueryCursor | undefined {
  if (!cursor) return undefined
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as FeedItemQueryCursor
    if (
      typeof parsed.publishedAt !== 'number'
      || typeof parsed.firstSeenAt !== 'string'
      || typeof parsed.id !== 'string'
    ) {
      throw new Error('invalid shape')
    }
    return parsed
  } catch {
    throw new Error('Invalid Feed Item cursor')
  }
}

function encodeFeedItemCursor(cursor: FeedItemQueryCursor | null): string | null {
  return cursor ? Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url') : null
}

export class FeedSubscriptionService {
  private db: DatabaseService
  private feedService: FeedService
  private ingestPipeline?: IngestPipeline

  private refreshQueue: Promise<unknown> = Promise.resolve()
  private readonly refreshActivityListeners: ((feedId: string, refreshing: boolean) => void)[] = []
  private readonly interFeedDelayMs: number
  private readonly delay: (ms: number) => Promise<void>

  constructor(
    db: DatabaseService,
    feedService?: FeedService,
    options: FeedSubscriptionServiceOptions = {}
  ) {
    this.db = db
    this.feedService = feedService ?? new FeedService()
    this.interFeedDelayMs = options.interFeedDelayMs ?? DEFAULT_INTER_FEED_DELAY_MS
    this.delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  }

  setIngestPipeline(pipeline: IngestPipeline): void {
    this.ingestPipeline = pipeline
  }

  async ingestItems(feedId: string, itemIds: string[]): Promise<FeedItemIngestResult[]> {
    if (!this.ingestPipeline) {
      throw new Error('Ingest pipeline not available')
    }
    const feed = this.db.getFeed(feedId)
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`)
    }

    const uniqueItemIds = [...new Set(itemIds)]
    const itemById = new Map(
      this.db.getFeedItemsByIds(uniqueItemIds).map((item) => [item.id, item])
    )
    const items = uniqueItemIds
      .map((id) => itemById.get(id))
      .filter((item): item is FeedItem =>
        item !== undefined && item.feed_id === feedId && item.state !== 'ingested'
      )

    if (items.length === 0) return []

    const existingEpisodes = this.db.getEpisodesBySourceUrls(
      [...new Set(items.map((item) => item.media_url))]
    )
    const episodeIdByMediaUrl = new Map<string, string>(
      existingEpisodes.flatMap((episode): Array<[string, string]> =>
        episode.source_url ? [[episode.source_url, episode.id]] : []
      )
    )

    const itemByNewMediaUrl = new Map<string, FeedItem>()
    for (const item of items) {
      if (!episodeIdByMediaUrl.has(item.media_url) && !itemByNewMediaUrl.has(item.media_url)) {
        itemByNewMediaUrl.set(item.media_url, item)
      }
    }

    const newMediaUrls = [...itemByNewMediaUrl.keys()]
    const linkCreatedEpisodes = (createdEpisodeIds: string[]): void => {
      for (const [index, mediaUrl] of newMediaUrls.entries()) {
        episodeIdByMediaUrl.set(mediaUrl, createdEpisodeIds[index])
      }
      this.db.markFeedItemsIngested(items.map((item) => ({
        id: item.id,
        episode_id: episodeIdByMediaUrl.get(item.media_url)!,
      })))
    }

    if (feed.kind === 'youtube') {
      await this.ingestPipeline.addYoutubeUrls(newMediaUrls, linkCreatedEpisodes)
    } else {
      const rssItems: RssIngestItem[] = newMediaUrls.map((mediaUrl) => {
        const item = itemByNewMediaUrl.get(mediaUrl)!
        return {
          title: item.title,
          enclosureUrl: item.media_url,
          guid: item.guid,
          feedUrl: feed.url,
          feedTitle: feed.title,
          feedImage: feed.image,
          pubDate: item.pub_date,
          description: item.description,
          duration: item.duration_sec != null ? String(item.duration_sec) : null,
        }
      })
      this.ingestPipeline.addRssItems(rssItems, linkCreatedEpisodes)
    }

    return items.map((item) => ({
      itemId: item.id,
      episodeId: episodeIdByMediaUrl.get(item.media_url)!,
    }))
  }

  async subscribe(url: string, previewData?: FeedResult): Promise<SubscribeFeedResult> {
    const existing = this.db.getFeedByUrl(url)
    if (existing) {
      return { alreadySubscribed: true, feed: existing }
    }

    const feedData = previewData ?? (await this.feedService.fetchFeed(url))

    const feedId = randomUUID()
    const createdAt = new Date().toISOString()
    this.db.createFeed({
      id: feedId,
      url,
      kind: url.startsWith('https://www.youtube.com/feeds/videos.xml?') ? 'youtube' : 'rss',
      title: feedData.title || 'Untitled Feed',
      image: feedData.image ?? null,
      site_url: feedData.siteUrl ?? null,
      etag: feedData.etag ?? null,
      last_modified: feedData.lastModified ?? null,
      created_at: createdAt,
    })

    const createdFeed = this.db.getFeed(feedId)!

    // Look for matching episodes by media enclosure URLs
    const currentItems = feedData.items
    const enclosureUrls = currentItems.map((i) => i.enclosureUrl).filter(Boolean)
    const existingEpisodes = this.db.getEpisodesBySourceUrls(enclosureUrls)
    const episodeByUrl = new Map<string, Episode>()
    for (const ep of existingEpisodes) {
      if (ep.source_url) {
        episodeByUrl.set(ep.source_url, ep)
      }
    }

    // Subscribing is silent: the existing catalogue is recorded as seen so the
    // user is not handed a backlog they never asked for.
    const feedItems = toFeedItemRows(feedId, currentItems, episodeByUrl, {
      unmatchedState: 'seen',
      at: createdAt,
    })

    this.db.createFeedItems(feedItems)

    return { alreadySubscribed: false, feed: createdFeed }
  }

  /**
   * Check one feed for items published since the last check.
   *
   * Never throws: a feed that cannot be reached stores its reason and is
   * retried on the next cycle, so one bad CDN cannot stall a refresh sweep or
   * raise a dialog at the user.
   */
  async refreshFeed(feedId: string): Promise<FeedRefreshResult> {
    return this.enqueue(() => this.checkFeed(feedId))
  }

  /**
   * Run feed checks strictly one at a time, whoever asked for them.
   *
   * A scheduled sweep and a user pressing Refresh must not fetch in parallel:
   * the guarantee is "checked sequentially, never in parallel", and it has to
   * hold across entry points, not just within one of them.
   */
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.refreshQueue.then(work, work)
    this.refreshQueue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  /** Report a feed entering or leaving a check, so its row can show a spinner. */
  onFeedRefreshActivity(listener: (feedId: string, refreshing: boolean) => void): void {
    this.refreshActivityListeners.push(listener)
  }

  private emitRefreshActivity(feedId: string, refreshing: boolean): void {
    for (const listener of this.refreshActivityListeners) listener(feedId, refreshing)
  }

  private async checkFeed(feedId: string): Promise<FeedRefreshResult> {
    this.emitRefreshActivity(feedId, true)
    try {
      return await this.performCheck(feedId)
    } finally {
      this.emitRefreshActivity(feedId, false)
    }
  }

  private async performCheck(feedId: string): Promise<FeedRefreshResult> {
    const feed = this.db.getFeed(feedId)
    if (!feed) return { feedId, newItemCount: 0, error: 'Feed not found' }

    const checkedAt = new Date().toISOString()
    let feedData: FeedResult
    try {
      feedData = await this.feedService.fetchFeed(feed.url, {
        etag: feed.etag,
        lastModified: feed.last_modified,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      this.db.updateFeedFetchState(feedId, { last_fetched_at: checkedAt, last_error: message })
      return { feedId, newItemCount: 0, error: message }
    }

    // Unchanged: the server already told us there is nothing to diff.
    if (feedData.notModified) {
      this.db.updateFeedFetchState(feedId, { last_fetched_at: checkedAt, last_error: null })
      return { feedId, newItemCount: 0 }
    }

    const knownGuids = new Set(this.db.getFeedItems(feedId).map((item) => item.guid))
    const currentItems = feedData.items
    const arriving = currentItems.filter(
      (item) => !knownGuids.has(item.guid || item.enclosureUrl)
    )

    // An arriving item whose media the user already has is not news to them.
    const existingEpisodes = this.db.getEpisodesBySourceUrls(
      arriving.map((item) => item.enclosureUrl).filter(Boolean)
    )
    const episodeByUrl = new Map<string, Episode>()
    for (const ep of existingEpisodes) {
      if (ep.source_url) episodeByUrl.set(ep.source_url, ep)
    }

    const feedItems = toFeedItemRows(feedId, arriving, episodeByUrl, {
      unmatchedState: 'new',
      at: checkedAt,
    })

    this.db.createFeedItems(feedItems)
    this.db.updateFeedFetchState(feedId, {
      last_fetched_at: checkedAt,
      last_error: null,
      validators: { etag: feedData.etag ?? null, last_modified: feedData.lastModified ?? null },
    })

    return { feedId, newItemCount: feedItems.filter((i) => i.state === 'new').length }
  }

  /**
   * Check every subscription, one at a time. Feeds are deliberately not checked
   * in parallel: a sweep is background work and should not contend for the
   * network or the main process with whatever the user is actually doing.
   */
  async refreshAllFeeds(options: { minAgeMs?: number } = {}): Promise<FeedRefreshResult[]> {
    const minAgeMs = options.minAgeMs ?? 0
    const now = Date.now()
    const results: FeedRefreshResult[] = []

    const eligibleFeeds = this.db.getFeeds().filter((feed) => {
      if (feed.last_error || minAgeMs <= 0 || !feed.last_fetched_at) return true
      const age = now - new Date(feed.last_fetched_at).getTime()
      return age >= minAgeMs
    })

    for (const [index, feed] of eligibleFeeds.entries()) {
      results.push(await this.enqueue(() => this.checkFeed(feed.id)))
      if (index < eligibleFeeds.length - 1 && this.interFeedDelayMs > 0) {
        await this.delay(this.interFeedDelayMs)
      }
    }
    return results
  }

  /** New Feed Item counts keyed by feed. Feeds with nothing new are absent. */
  getNewItemCounts(): Record<string, number> {
    return this.db.getNewFeedItemCounts()
  }

  acknowledgeItems(feedId: string, itemIds: string[]): FeedItemMutationResult {
    if (!this.db.getFeed(feedId)) throw new Error(`Feed not found: ${feedId}`)
    return { itemIds: this.db.acknowledgeFeedItems(feedId, itemIds) }
  }

  clearNewItems(feedId: string): FeedItemMutationResult {
    if (!this.db.getFeed(feedId)) throw new Error(`Feed not found: ${feedId}`)
    return { itemIds: this.db.clearNewFeedItems(feedId) }
  }

  restoreNewItems(feedId: string, itemIds: string[]): void {
    if (!this.db.getFeed(feedId)) throw new Error(`Feed not found: ${feedId}`)
    this.db.restoreNewFeedItems(feedId, [...new Set(itemIds)])
  }

  unsubscribe(id: string): void {
    this.db.deleteFeed(id)
  }

  reorderFeeds(feedIds: string[]): void {
    this.db.reorderFeeds(feedIds)
  }

  getSubscriptions(): Feed[] {
    return this.db.getFeeds()
  }

  getFeedItems(feedId: string): FeedItem[] {
    return this.db.getFeedItems(feedId)
  }

  getFeedItemPage(feedId: string, request: FeedItemPageRequest): FeedItemPage {
    if (!this.db.getFeed(feedId)) throw new Error(`Feed not found: ${feedId}`)
    const limit = Math.max(1, Math.min(request.limit ?? DEFAULT_FEED_ITEM_PAGE_SIZE, MAX_FEED_ITEM_PAGE_SIZE))
    const page = this.db.getFeedItemPage(feedId, {
      filter: request.filter,
      cursor: decodeFeedItemCursor(request.cursor),
      limit,
    })
    return {
      items: page.items,
      nextCursor: encodeFeedItemCursor(page.nextCursor),
      total: page.total,
    }
  }
}
