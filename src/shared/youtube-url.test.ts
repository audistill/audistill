import { describe, it, expect } from 'vitest'
import { parseYouTubeUrl } from './youtube-url'

describe('parseYouTubeUrl', () => {
  it('parses standard youtube.com/watch?v= URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result).toEqual({
      canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    })
  })

  it('parses youtu.be short URL', () => {
    const result = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(result).toEqual({
      canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    })
  })

  it('parses /shorts/ URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')
    expect(result).toEqual({
      canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    })
  })

  it('parses /live/ URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/live/dQw4w9WgXcQ')
    expect(result).toEqual({
      canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    })
  })

  it('parses /embed/ URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(result).toEqual({
      canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    })
  })

  it('parses m.youtube.com URL', () => {
    const result = parseYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result).toEqual({
      canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    })
  })

  it('strips tracking params (list, si, t)', () => {
    const result = parseYouTubeUrl(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&si=abc123&t=42'
    )
    expect(result).toEqual({
      canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    })
  })

  it('rejects playlist URLs with specific message', () => {
    const result = parseYouTubeUrl(
      'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'
    )
    expect(result).toEqual({
      error: 'Playlist URLs are not supported — paste a single video URL',
    })
  })

  it('rejects channel URLs', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/channel/UC38IQsAvIsxxjztdMZQtwHA')
    expect(result).toEqual({
      error: 'Channel URLs are not supported — paste a single video URL',
    })
  })

  it('rejects @username URLs', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/@username')
    expect(result).toEqual({
      error: 'Channel URLs are not supported — paste a single video URL',
    })
  })

  it('rejects non-YouTube URLs', () => {
    const result = parseYouTubeUrl('https://vimeo.com/12345')
    expect(result).toEqual({
      error: 'Only YouTube video URLs are supported',
    })
  })

  it('rejects invalid input (not a URL)', () => {
    const result = parseYouTubeUrl('not a url')
    expect(result).toEqual({
      error: 'Only YouTube video URLs are supported',
    })
  })
})
