import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FeedService } from './feed-service'

const mockFetch = vi.fn()
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  net: { fetch: (...args: unknown[]) => mockFetch(...args) },
}))

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.apple.com/DTDs/Podcast-1.0.dtd">
  <channel>
    <title>Test Podcast</title>
    <itunes:image href="https://example.com/cover.jpg" />
    <link>https://example.com</link>
    <item>
      <title>Episode 3</title>
      <pubDate>Mon, 10 Jun 2026 12:00:00 GMT</pubDate>
      <itunes:duration>1:23:45</itunes:duration>
      <description>Third episode description</description>
      <enclosure url="https://example.com/ep3.mp3" type="audio/mpeg" length="45000000" />
      <guid>ep3-guid</guid>
    </item>
    <item>
      <title>Episode 2</title>
      <pubDate>Mon, 03 Jun 2026 12:00:00 GMT</pubDate>
      <itunes:duration>45:30</itunes:duration>
      <description>Second episode</description>
      <enclosure url="https://example.com/ep2.mp3" type="audio/mpeg" length="30000000" />
      <guid>ep2-guid</guid>
    </item>
    <item>
      <title>Episode 1</title>
      <pubDate>Mon, 27 May 2026 12:00:00 GMT</pubDate>
      <itunes:duration>30:00</itunes:duration>
      <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg" length="20000000" />
      <guid>ep1-guid</guid>
    </item>
  </channel>
</rss>`

const ATOM_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Podcast</title>
  <link href="https://example.com/atom" />
  <entry>
    <title>Atom Episode 1</title>
    <published>2026-06-01T10:00:00Z</published>
    <link rel="enclosure" href="https://example.com/atom-ep1.mp3" type="audio/mpeg" length="25000000" />
    <enclosure url="https://example.com/atom-ep1.mp3" type="audio/mpeg" length="25000000" />
    <id>atom-ep1-id</id>
  </entry>
</feed>`

function createMockResponse(body: string, ok = true, status = 200) {
  return {
    ok,
    status,
    text: () => Promise.resolve(body),
  }
}

describe('FeedService', () => {
  let service: FeedService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new FeedService()
  })

  it('parses RSS 2.0 feed with iTunes extensions', async () => {
    mockFetch.mockResolvedValue(createMockResponse(RSS_FIXTURE))

    const result = await service.fetchFeed('https://example.com/feed.xml')

    expect(result.title).toBe('Test Podcast')
    expect(result.image).toBe('https://example.com/cover.jpg')
    expect(result.feedUrl).toBe('https://example.com/feed.xml')
    expect(result.items).toHaveLength(3)
  })

  it('extracts item-level metadata correctly', async () => {
    mockFetch.mockResolvedValue(createMockResponse(RSS_FIXTURE))

    const result = await service.fetchFeed('https://example.com/feed.xml')
    const firstItem = result.items[0]

    expect(firstItem.title).toBe('Episode 3')
    expect(firstItem.enclosureUrl).toBe('https://example.com/ep3.mp3')
    expect(firstItem.guid).toBe('ep3-guid')
    expect(firstItem.duration).toBe('1:23:45')
    expect(firstItem.description).toBe('Third episode description')
    expect(firstItem.pubDate).toBeDefined()
  })

  it('handles Atom feeds', async () => {
    mockFetch.mockResolvedValue(createMockResponse(ATOM_FIXTURE))

    const result = await service.fetchFeed('https://example.com/atom.xml')

    expect(result.title).toBe('Atom Podcast')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Atom Episode 1')
    expect(result.items[0].enclosureUrl).toBe('https://example.com/atom-ep1.mp3')
  })

  it('handles missing optional fields gracefully', async () => {
    const minimalRss = `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <title>Minimal Feed</title>
        <item>
          <title>No extras</title>
          <enclosure url="https://example.com/minimal.mp3" type="audio/mpeg" />
        </item>
      </channel>
    </rss>`
    mockFetch.mockResolvedValue(createMockResponse(minimalRss))

    const result = await service.fetchFeed('https://example.com/minimal.xml')

    expect(result.title).toBe('Minimal Feed')
    expect(result.image).toBeNull()
    expect(result.items[0].duration).toBeNull()
    expect(result.items[0].description).toBeNull()
    expect(result.items[0].pubDate).toBeNull()
  })

  it('throws on malformed XML', async () => {
    mockFetch.mockResolvedValue(createMockResponse('not xml at all <<<<'))

    await expect(service.fetchFeed('https://example.com/bad')).rejects.toThrow()
  })

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue(createMockResponse('', false, 404))

    await expect(service.fetchFeed('https://example.com/missing')).rejects.toThrow('HTTP 404')
  })

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'))

    await expect(service.fetchFeed('https://example.com/down')).rejects.toThrow('net::ERR_CONNECTION_REFUSED')
  })

  it('filters out items without enclosure URL', async () => {
    const rssWithMissing = `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <title>Mixed Feed</title>
        <item>
          <title>Has enclosure</title>
          <enclosure url="https://example.com/has.mp3" type="audio/mpeg" />
        </item>
        <item>
          <title>No enclosure</title>
        </item>
      </channel>
    </rss>`
    mockFetch.mockResolvedValue(createMockResponse(rssWithMissing))

    const result = await service.fetchFeed('https://example.com/mixed.xml')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Has enclosure')
  })
})
