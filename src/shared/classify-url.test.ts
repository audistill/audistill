import { describe, it, expect } from 'vitest'
import { classifyUrl } from './classify-url'

describe('classifyUrl', () => {
  it('returns youtube for a standard YouTube URL without needing content-type', () => {
    const result = classifyUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '')
    expect(result).toBe('youtube')
  })

  it('returns rss for application/rss+xml content type', () => {
    const result = classifyUrl('https://example.com/feed', 'application/rss+xml')
    expect(result).toBe('rss')
  })

  it('returns rss for application/atom+xml content type', () => {
    const result = classifyUrl('https://example.com/feed.xml', 'application/atom+xml')
    expect(result).toBe('rss')
  })

  it('returns rss for text/xml content type', () => {
    const result = classifyUrl('https://example.com/rss', 'text/xml')
    expect(result).toBe('rss')
  })

  it('returns rss for application/xml content type', () => {
    const result = classifyUrl('https://example.com/podcast.xml', 'application/xml')
    expect(result).toBe('rss')
  })

  it('returns direct for audio/mpeg content type', () => {
    const result = classifyUrl('https://example.com/episode.mp3', 'audio/mpeg')
    expect(result).toBe('direct')
  })

  it('returns direct for video/mp4 content type', () => {
    const result = classifyUrl('https://example.com/video.mp4', 'video/mp4')
    expect(result).toBe('direct')
  })

  it('returns direct for audio/ogg content type', () => {
    const result = classifyUrl('https://example.com/file.ogg', 'audio/ogg')
    expect(result).toBe('direct')
  })

  it('returns unsupported for text/html content type', () => {
    const result = classifyUrl('https://example.com/page', 'text/html')
    expect(result).toBe('unsupported')
  })

  it('returns unsupported for application/json content type', () => {
    const result = classifyUrl('https://example.com/api', 'application/json')
    expect(result).toBe('unsupported')
  })

  it('handles content-type with charset parameter', () => {
    const result = classifyUrl('https://example.com/feed', 'application/rss+xml; charset=utf-8')
    expect(result).toBe('rss')
  })

  it('youtube detection takes priority over content-type', () => {
    const result = classifyUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'text/html')
    expect(result).toBe('youtube')
  })
})
