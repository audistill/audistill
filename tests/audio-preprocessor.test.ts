import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { preprocess } from '../src/main/audio-preprocessor'

const FIXTURE_MP3 = resolve(__dirname, 'fixtures/tone-2s.mp3')
const SAMPLE_RATE = 16000
const BYTES_PER_SAMPLE = 4

describe('AudioPreprocessor', () => {
  it('produces a buffer of approximately correct byte length for a 2s MP3', async () => {
    const result = await preprocess(FIXTURE_MP3)

    const expectedBytes = 2 * SAMPLE_RATE * BYTES_PER_SAMPLE
    // Allow 10% tolerance for encoder padding
    expect(result.length).toBeGreaterThan(expectedBytes * 0.9)
    expect(result.length).toBeLessThan(expectedBytes * 1.1)
  })

  it('output is parseable as float32 samples in -1.0 to 1.0 range', async () => {
    const result = await preprocess(FIXTURE_MP3)

    const samples = new Float32Array(result.buffer, result.byteOffset, result.length / BYTES_PER_SAMPLE)
    for (let i = 0; i < samples.length; i += 1000) {
      expect(samples[i]).toBeGreaterThanOrEqual(-1.0)
      expect(samples[i]).toBeLessThanOrEqual(1.0)
    }
  })

  it('returns a descriptive error for a missing file', async () => {
    await expect(preprocess('/nonexistent/file.mp3')).rejects.toThrow('File not found')
  })

  it('returns a descriptive error for an unsupported extension', async () => {
    await expect(preprocess('/some/file.txt')).rejects.toThrow('Unsupported file format')
  })
})
