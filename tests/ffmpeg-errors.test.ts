import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { resolve } from 'node:path'
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { parseFfmpegError, preprocess } from '../src/main/audio-preprocessor'

vi.mock('electron', () => ({
  app: { isPackaged: false },
}))

describe('parseFfmpegError', () => {
  it('returns friendly message for "no audio stream" stderr', () => {
    const stderr = 'Output file #0 does not contain any stream\n'
    expect(parseFfmpegError(stderr)).toBe('This file contains no audio track.')
  })

  it('returns friendly message for corrupt/invalid data stderr', () => {
    const stderr = '[mov,mp4] Invalid data found when processing input\n'
    expect(parseFfmpegError(stderr)).toBe('This file appears to be corrupted or incomplete.')
  })

  it('returns friendly message for corrupt file stderr', () => {
    const stderr = 'Header missing: file is corrupt\n'
    expect(parseFfmpegError(stderr)).toBe('This file appears to be corrupted or incomplete.')
  })

  it('returns friendly message for unsupported codec stderr', () => {
    const stderr = 'Decoder hevc not found\n'
    expect(parseFfmpegError(stderr)).toBe('This audio format is not supported.')
  })

  it('returns friendly message for "codec not currently supported" stderr', () => {
    const stderr = 'codec not currently supported in container\n'
    expect(parseFfmpegError(stderr)).toBe('This audio format is not supported.')
  })

  it('returns generic fallback for unknown errors', () => {
    const stderr = 'Unexpected error: something went very wrong\n'
    expect(parseFfmpegError(stderr)).toBe('Could not process this file. Try converting it to MP3 first.')
  })
})

describe('preprocess friendly errors', () => {
  const fixtureDir = resolve(__dirname, 'fixtures')
  const corruptFile = resolve(fixtureDir, 'corrupt.mp3')

  beforeAll(() => {
    mkdirSync(fixtureDir, { recursive: true })
    writeFileSync(corruptFile, 'not valid audio data at all')
  })

  afterAll(() => {
    try { unlinkSync(corruptFile) } catch {}
  })

  it('does not expose raw FFmpeg stderr to the user', async () => {
    const err = await preprocess(corruptFile).catch((e) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).not.toMatch(/FFmpeg failed/)
    expect(err.message).not.toMatch(/exit \d+/)
  })

  it('produces a user-friendly error for a corrupt file', async () => {
    const err = await preprocess(corruptFile).catch((e) => e)
    expect(err).toBeInstanceOf(Error)
    const friendly = [
      'This file contains no audio track.',
      'This file appears to be corrupted or incomplete.',
      'This audio format is not supported.',
      'Could not process this file. Try converting it to MP3 first.',
    ]
    expect(friendly).toContain(err.message)
  })
})
