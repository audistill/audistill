import { describe, it, expect } from 'vitest'
import { classifyUrl, isSupportedMediaType } from './classify-url'

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

describe('isSupportedMediaType', () => {
  it('accepts audio/mpeg (mp3)', () => {
    expect(isSupportedMediaType('audio/mpeg')).toBe(true)
  })

  it('accepts video/mp4', () => {
    expect(isSupportedMediaType('video/mp4')).toBe(true)
  })

  it('accepts audio/wav', () => {
    expect(isSupportedMediaType('audio/wav')).toBe(true)
  })

  it('accepts audio/x-wav', () => {
    expect(isSupportedMediaType('audio/x-wav')).toBe(true)
  })

  it('accepts audio/flac', () => {
    expect(isSupportedMediaType('audio/flac')).toBe(true)
  })

  it('accepts audio/ogg', () => {
    expect(isSupportedMediaType('audio/ogg')).toBe(true)
  })

  it('accepts audio/aac', () => {
    expect(isSupportedMediaType('audio/aac')).toBe(true)
  })

  it('accepts audio/opus', () => {
    expect(isSupportedMediaType('audio/opus')).toBe(true)
  })

  it('accepts video/webm', () => {
    expect(isSupportedMediaType('video/webm')).toBe(true)
  })

  it('accepts audio/mp4 (m4a)', () => {
    expect(isSupportedMediaType('audio/mp4')).toBe(true)
  })

  it('accepts audio/x-m4a', () => {
    expect(isSupportedMediaType('audio/x-m4a')).toBe(true)
  })

  it('rejects application/pdf', () => {
    expect(isSupportedMediaType('application/pdf')).toBe(false)
  })

  it('rejects text/html', () => {
    expect(isSupportedMediaType('text/html')).toBe(false)
  })

  it('rejects audio/midi (not decodable by ffmpeg for transcription)', () => {
    expect(isSupportedMediaType('audio/midi')).toBe(false)
  })

  it('handles content-type with charset parameter', () => {
    expect(isSupportedMediaType('audio/mpeg; charset=utf-8')).toBe(true)
  })
})
