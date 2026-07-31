import { describe, expect, it } from 'vitest'
import { transcriptionWindowRanges } from './transcription-timeline'

describe('transcriptionWindowRanges', () => {
  it('covers long audio exactly once with no gaps or overlapping samples', () => {
    const ranges = transcriptionWindowRanges(70, 30, 10)

    expect(ranges).toEqual([
      { startSample: 0, endSample: 30 },
      { startSample: 30, endSample: 60 },
      { startSample: 60, endSample: 70 },
    ])

    for (let index = 1; index < ranges.length; index++) {
      expect(ranges[index].startSample).toBe(ranges[index - 1].endSample)
    }
  })

  it('does not create an empty trailing window at an exact boundary', () => {
    expect(transcriptionWindowRanges(60, 30, 10)).toEqual([
      { startSample: 0, endSample: 30 },
      { startSample: 30, endSample: 60 },
    ])
  })

  it('keeps a short tail attached to the preceding window', () => {
    expect(transcriptionWindowRanges(65, 30, 10)).toEqual([
      { startSample: 0, endSample: 30 },
      { startSample: 30, endSample: 65 },
    ])
  })
})
