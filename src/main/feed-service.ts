import { net } from 'electron'
import Parser from 'rss-parser'

export interface FeedItem {
  title: string
  enclosureUrl: string
  guid: string | null
  pubDate: string | null
  duration: string | null
  description: string | null
}

export interface FeedResult {
  title: string
  image: string | null
  feedUrl: string
  items: FeedItem[]
}

const parser = new Parser({
  customFields: {
    item: [['itunes:duration', 'itunesDuration'] as any],
    feed: [['itunes:image', 'itunesImage', { keepArray: false }] as any],
  },
})

function getEnclosureUrl(item: any): string | null {
  if (item.enclosure?.url) return item.enclosure.url
  if (item.link && typeof item.link === 'string' && (item.link.endsWith('.mp3') || item.link.endsWith('.m4a'))) {
    return item.link
  }
  return null
}

export class FeedService {
  async fetchFeed(url: string): Promise<FeedResult> {
    const response = await net.fetch(url, { method: 'GET' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const xml = await response.text()
    const feed = await parser.parseString(xml)

    const image = (feed as any).itunesImage?.$.href
      ?? feed.image?.url
      ?? null

    const items: FeedItem[] = (feed.items || [])
      .filter((item) => getEnclosureUrl(item) != null)
      .map((item) => ({
        title: item.title || 'Untitled',
        enclosureUrl: getEnclosureUrl(item)!,
        guid: item.guid || (item as any).id || null,
        pubDate: item.pubDate || item.isoDate || null,
        duration: (item as any).itunesDuration || null,
        description: item.contentSnippet || item.content || null,
      }))

    return {
      title: feed.title || 'Untitled Feed',
      image,
      feedUrl: url,
      items,
    }
  }
}
