import { net } from 'electron'
import Parser from 'rss-parser'

export interface FeedItem {
  title: string
  enclosureUrl: string
  guid: string | null
  pubDate: string | null
  duration: string | null
  description: string | null
  image?: string | null
  link?: string | null
}

export interface FeedResult {
  title: string
  image: string | null
  feedUrl: string
  siteUrl?: string | null
  items: FeedItem[]
  /** True when the server confirmed nothing changed and no body was parsed. */
  notModified?: boolean
  /** Validators to replay on the next check so an unchanged feed costs nothing. */
  etag?: string | null
  lastModified?: string | null
}

/** Cache validators stored from the previous fetch of the same feed. */
export interface FeedFetchValidators {
  etag?: string | null
  lastModified?: string | null
}

const parser = new Parser({
  customFields: {
    item: [
      ['itunes:duration', 'itunesDuration'] as any,
    ],
    feed: [
      ['itunes:image', 'itunesImage', { keepArray: false }] as any,
    ],
  },
})

function getEnclosureUrl(item: any): string | null {
  if (item.enclosure?.url) return item.enclosure.url
  if (item.link && typeof item.link === 'string' && (item.link.endsWith('.mp3') || item.link.endsWith('.m4a'))) {
    return item.link
  }
  return null
}

export interface FeedServiceOptions {
  fetchYouTubeFeed?: (url: string) => Promise<FeedResult>
}

function isYouTubeFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '') === 'youtube.com'
      && parsed.pathname === '/feeds/videos.xml'
      && (parsed.searchParams.has('channel_id') || parsed.searchParams.has('playlist_id'))
  } catch {
    return false
  }
}

export class FeedService {
  private readonly fetchYouTubeFeed?: (url: string) => Promise<FeedResult>

  constructor(options: FeedServiceOptions = {}) {
    this.fetchYouTubeFeed = options.fetchYouTubeFeed
  }

  async fetchFeed(url: string, validators?: FeedFetchValidators): Promise<FeedResult> {
    if (this.fetchYouTubeFeed && isYouTubeFeedUrl(url)) {
      return this.fetchYouTubeFeed(url)
    }

    const headers: Record<string, string> = {}
    if (validators?.etag) headers['If-None-Match'] = validators.etag
    if (validators?.lastModified) headers['If-Modified-Since'] = validators.lastModified

    const response = await net.fetch(url, { method: 'GET', headers })

    // 304 is the cheap path: the server confirmed our copy is current, so there
    // is no body to parse and nothing for the caller to diff.
    if (response.status === 304) {
      return { title: '', image: null, feedUrl: url, items: [], notModified: true }
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const xml = await response.text()
    const feed = await parser.parseString(xml)

    const items: FeedItem[] = (feed.items || [])
      .filter((item) => getEnclosureUrl(item) != null)
      .map((item) => ({
        title: item.title || 'Untitled',
        enclosureUrl: getEnclosureUrl(item)!,
        guid: item.guid || (item as any).id || null,
        pubDate: item.pubDate || item.isoDate || null,
        duration: (item as any).itunesDuration || null,
        description: item.contentSnippet ?? item.content ?? null,
        link: item.link || null,
      }))

    return {
      title: feed.title || 'Untitled Feed',
      image: (feed as any).itunesImage?.$.href ?? feed.image?.url ?? null,
      feedUrl: url,
      siteUrl: (feed as any).link || null,
      items,
      notModified: false,
      etag: response.headers?.get('ETag') ?? null,
      lastModified: response.headers?.get('Last-Modified') ?? null,
    }
  }
}
