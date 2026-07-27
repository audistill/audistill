import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecordingManifest } from '../shared/recording-session'

vi.mock('electron', () => ({ app: { isPackaged: false } }))

import { spawnRecordedPreprocessor } from './audio-preprocessor'
import { transcriptTimeRange } from './transcription-timeline'

const directories: string[] = []

afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('recorded preprocessing', () => {
  it('aligns paired source segments on the global Transcript timeline and mixes missing spans with headroom', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'audistill-mix-'))
    directories.push(directory)
    writeMonoWave(join(directory, 'system-a.wav'), 0.4, 100)
    writeMonoWave(join(directory, 'system-b.wav'), 0.4, 100)
    writeMonoWave(join(directory, 'microphone.wav'), 0.2, 100)

    const manifest: RecordingManifest = {
      version: 1,
      sessionId: 'mix-fixture',
      startedAt: '2026-01-01T00:00:00.000Z',
      stoppedAt: '2026-01-01T00:00:00.300Z',
      activeDurationMs: 300,
      sourceKinds: ['system-audio', 'microphone'],
      segments: [
        { sourceKind: 'system-audio', path: 'system-a.wav', activeStartMs: 0, durationMs: 100 },
        { sourceKind: 'microphone', path: 'microphone.wav', activeStartMs: 100, durationMs: 100 },
        { sourceKind: 'system-audio', path: 'system-b.wav', activeStartMs: 200, durationMs: 100 },
      ],
      finalized: true,
    }
    const manifestPath = join(directory, 'manifest.json')
    writeFileSync(manifestPath, JSON.stringify(manifest))

    const output = await collectOutput(spawnRecordedPreprocessor(manifestPath))
    const samples = new Float32Array(output.buffer, output.byteOffset, output.byteLength / 4)

    expect(samples.length).toBe(4_800)
    expect(mean(samples, 400, 1_200)).toBeCloseTo(0.2, 2)
    expect(mean(samples, 2_000, 2_800)).toBeCloseTo(0.1, 2)
    expect(mean(samples, 3_600, 4_400)).toBeCloseTo(0.2, 2)
    expect(maxMagnitude(samples)).toBeLessThanOrEqual(0.21)
    expect(transcriptTimeRange(1_600, 1_600, samples.length)).toEqual({ start: 0.1, end: 0.2 })
  })
})

function collectOutput(process: ReturnType<typeof spawnRecordedPreprocessor>): Promise<Buffer> {
  process.stdin.end()
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let stderr = ''
    process.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    process.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    process.on('error', reject)
    process.on('close', (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(stderr)))
  })
}

function writeMonoWave(path: string, amplitude: number, durationMs: number): void {
  const sampleRate = 16_000
  const sampleCount = Math.round(sampleRate * durationMs / 1_000)
  const dataSize = sampleCount * 2
  const wave = Buffer.alloc(44 + dataSize)
  wave.write('RIFF', 0)
  wave.writeUInt32LE(36 + dataSize, 4)
  wave.write('WAVEfmt ', 8)
  wave.writeUInt32LE(16, 16)
  wave.writeUInt16LE(1, 20)
  wave.writeUInt16LE(1, 22)
  wave.writeUInt32LE(sampleRate, 24)
  wave.writeUInt32LE(sampleRate * 2, 28)
  wave.writeUInt16LE(2, 32)
  wave.writeUInt16LE(16, 34)
  wave.write('data', 36)
  wave.writeUInt32LE(dataSize, 40)
  const value = Math.round(amplitude * 32_767)
  for (let index = 0; index < sampleCount; index += 1) wave.writeInt16LE(value, 44 + index * 2)
  writeFileSync(path, wave)
}

function mean(samples: Float32Array, start: number, end: number): number {
  let total = 0
  for (let index = start; index < end; index += 1) total += samples[index]
  return total / (end - start)
}

function maxMagnitude(samples: Float32Array): number {
  let maximum = 0
  for (const sample of samples) maximum = Math.max(maximum, Math.abs(sample))
  return maximum
}
