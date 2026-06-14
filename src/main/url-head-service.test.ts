import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchUrlHead } from './url-head-service'

const mockFetch = vi.fn()
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  net: { fetch: (...args: unknown[]) => mockFetch(...args) },
}))

describe('fetchUrlHead', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns content-type and content-length from HEAD response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'content-type') return 'audio/mpeg'
          if (name === 'content-length') return '12345678'
          return null
        },
      },
    })

    const result = await fetchUrlHead('https://example.com/episode.mp3')
    expect(result).toEqual({
      contentType: 'audio/mpeg',
      contentLength: 12345678,
    })
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/episode.mp3', { method: 'HEAD' })
  })

  it('returns null content-length when header is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'content-type') return 'application/rss+xml; charset=utf-8'
          return null
        },
      },
    })

    const result = await fetchUrlHead('https://example.com/feed.xml')
    expect(result).toEqual({
      contentType: 'application/rss+xml; charset=utf-8',
      contentLength: null,
    })
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(fetchUrlHead('https://example.com/missing')).rejects.toThrow('HTTP 404')
  })

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'))

    await expect(fetchUrlHead('https://example.com/down')).rejects.toThrow('net::ERR_CONNECTION_REFUSED')
  })
})
