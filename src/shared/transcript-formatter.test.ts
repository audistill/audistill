import { describe, it, expect } from 'vitest'
import { formatTranscript } from './transcript-formatter'

describe('formatTranscript', () => {
  describe('with timestamps', () => {
    it('merges short segments at sentence boundaries and prefixes with m:ss timestamps', () => {
      const segments = [
        { start: 5, end: 7, text: 'Hello there.' },
        { start: 7, end: 10, text: ' How are you doing today?' },
        { start: 10, end: 14, text: ' I wanted to talk about something.' },
      ]

      const result = formatTranscript(segments, { timestamps: true, durationSec: 300 })

      expect(result).toBe(
        '0:05 Hello there.\n' +
        '0:07 How are you doing today?\n' +
        '0:10 I wanted to talk about something.'
      )
    })

    it('caps line length at ~150 chars when no sentence punctuation is found', () => {
      const segments = Array.from({ length: 20 }, (_, i) => ({
        start: i * 2,
        end: i * 2 + 2,
        text: 'word word word word word word word ',
      }))

      const result = formatTranscript(segments, { timestamps: true, durationSec: 300 })
      const lines = result.split('\n')

      for (const line of lines) {
        // timestamp prefix is ~5 chars, so total line should be under ~160
        expect(line.length).toBeLessThanOrEqual(165)
      }
      expect(lines.length).toBeGreaterThan(1)
    })

    it('uses h:mm:ss format when episode duration is >= 1 hour', () => {
      const segments = [
        { start: 3661, end: 3665, text: 'This is an hour in.' },
        { start: 3665, end: 3670, text: 'Still going strong.' },
      ]

      const result = formatTranscript(segments, { timestamps: true, durationSec: 7200 })

      expect(result).toBe(
        '1:01:01 This is an hour in.\n' +
        '1:01:05 Still going strong.'
      )
    })
  })

  describe('without timestamps', () => {
    it('produces flowing prose with paragraph breaks at pauses > 2 seconds', () => {
      const segments = [
        { start: 0, end: 2, text: 'First sentence here.' },
        { start: 2, end: 4, text: ' Continuing without a gap.' },
        { start: 7, end: 10, text: 'After a long pause.' },
        { start: 10, end: 12, text: ' And more here.' },
      ]

      const result = formatTranscript(segments, { timestamps: false, durationSec: 300 })

      expect(result).toBe(
        'First sentence here. Continuing without a gap.\n\nAfter a long pause. And more here.'
      )
    })
  })

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(formatTranscript([], { timestamps: true, durationSec: 300 })).toBe('')
      expect(formatTranscript([], { timestamps: false, durationSec: 300 })).toBe('')
    })

    it('handles single segment', () => {
      const segments = [{ start: 5, end: 10, text: 'Only one segment.' }]
      const result = formatTranscript(segments, { timestamps: true, durationSec: 300 })
      expect(result).toBe('0:05 Only one segment.')
    })

    it('handles segments with no gaps in no-timestamp mode', () => {
      const segments = [
        { start: 0, end: 2, text: 'No gaps here.' },
        { start: 2, end: 4, text: ' Everything flows.' },
        { start: 4, end: 6, text: ' Continuously.' },
      ]

      const result = formatTranscript(segments, { timestamps: false, durationSec: 300 })
      expect(result).toBe('No gaps here. Everything flows. Continuously.')
    })
  })
})
