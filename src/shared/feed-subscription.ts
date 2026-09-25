export type FeedItemState = 'new' | 'seen' | 'ingested'
export type FeedItemFilter = 'new' | 'all'
export type FeedKind = 'rss' | 'youtube'

export interface RssIngestItem {
  title: string
  enclosureUrl: string
  guid: string | null
  feedUrl: string
  feedTitle: string
  feedImage: string | null
  pubDate: string | null
  description: string | null
  duration: string | null
}

export interface Feed {
  id: string
  url: string
  kind: FeedKind
  title: string
  image: string | null
  site_url: string | null
  etag: string | null
  last_modified: string | null
  last_fetched_at: string | null
  last_error: string | null
  auto_ingest: number
  auto_ingest_folder_id: string | null
  min_duration_sec: number | null
  max_duration_sec: number | null
  skip_live: number
  sort_order: number
  created_at: string
}

export interface FeedItem {
  id: string
  feed_id: string
  guid: string
  title: string
  media_url: string
  page_url: string | null
  pub_date: string | null
  duration_sec: number | null
  description: string | null
  state: FeedItemState
  episode_id: string | null
  first_seen_at: string
}

export interface FeedItemPageRequest {
  filter: FeedItemFilter
  cursor?: string | null
  limit?: number
}

export interface FeedItemPage {
  items: FeedItem[]
  nextCursor: string | null
  total: number
}

export interface FeedItemMutationResult {
  itemIds: string[]
}

export interface SubscribeFeedResult {
  alreadySubscribed: boolean
  feed: Feed
}

/** New Feed Item counts keyed by feed id. Feeds with nothing new are absent. */
export type NewFeedItemCounts = Record<string, number>

/** Outcome of checking one feed. `error` is set instead of thrown. */
export interface FeedRefreshResult {
  feedId: string
  newItemCount: number
  error?: string
}

export interface FeedItemIngestResult {
  itemId: string
  episodeId: string
}
