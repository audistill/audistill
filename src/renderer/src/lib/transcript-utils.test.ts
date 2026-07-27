import { describe, it, expect } from 'vitest'
import { parseTranscript, formatDuration, clampRatio } from './transcript-utils'

describe('parseTranscript', () => {
  it('returns empty array for null input', () => {
    expect(parseTranscript(null)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseTranscript('')).toEqual([])
  })

  it('parses lines with MM:SS timestamps', () => {
    const raw = '[00:05] Hello world\n[01:30] Second line'
    const result = parseTranscript(raw)
    expect(result).toEqual([
      { timestamp: '00:05', text: 'Hello world' },
      { timestamp: '01:30', text: 'Second line' },
    ])
  })

  it('parses lines with HH:MM:SS timestamps', () => {
    const raw = '[01:05:30] Long podcast content'
    const result = parseTranscript(raw)
    expect(result).toEqual([
      { timestamp: '01:05:30', text: 'Long podcast content' },
    ])
  })

  it('handles lines without timestamps', () => {
    const raw = 'Just plain text\nAnother line'
    const result = parseTranscript(raw)
    expect(result).toEqual([
      { timestamp: '', text: 'Just plain text' },
      { timestamp: '', text: 'Another line' },
    ])
  })

  it('skips blank lines', () => {
    const raw = '[00:01] First\n\n\n[00:10] Second'
    const result = parseTranscript(raw)
    expect(result).toHaveLength(2)
  })

  it('handles mixed timestamped and plain lines', () => {
    const raw = '[00:01] Timestamped\nPlain text\n[00:15] Another timestamp'
    const result = parseTranscript(raw)
    expect(result).toEqual([
      { timestamp: '00:01', text: 'Timestamped' },
      { timestamp: '', text: 'Plain text' },
      { timestamp: '00:15', text: 'Another timestamp' },
    ])
  })

  it('handles large transcripts efficiently', () => {
    const lines = Array.from({ length: 15000 }, (_, i) => {
      const min = String(Math.floor(i / 60)).padStart(2, '0')
      const sec = String(i % 60).padStart(2, '0')
      return `[${min}:${sec}] Line number ${i}`
    })
    const raw = lines.join('\n')
    const result = parseTranscript(raw)
    expect(result).toHaveLength(15000)
    expect(result[0]).toEqual({ timestamp: '00:00', text: 'Line number 0' })
    expect(result[59]).toEqual({ timestamp: '00:59', text: 'Line number 59' })
  })
})

describe('formatDuration', () => {
  it('returns empty string for null', () => {
    expect(formatDuration(null)).toBe('')
  })

  it('returns empty string for 0', () => {
    expect(formatDuration(0)).toBe('')
  })

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05')
  })

  it('formats hours minutes and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('pads single digit minutes in hours format', () => {
    expect(formatDuration(3600 + 5 * 60 + 3)).toBe('1:05:03')
  })
})

describe('clampRatio', () => {
  it('clamps below minimum to 0.25', () => {
    expect(clampRatio(0.1)).toBe(0.25)
  })

  it('clamps above maximum to 0.65', () => {
    expect(clampRatio(0.9)).toBe(0.65)
  })

  it('returns value within range unchanged', () => {
    expect(clampRatio(0.4)).toBe(0.4)
  })

  it('returns exact boundary values unchanged', () => {
    expect(clampRatio(0.25)).toBe(0.25)
    expect(clampRatio(0.65)).toBe(0.65)
  })
})
