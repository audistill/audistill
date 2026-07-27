import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DatabaseService } from './database-service'
import {
  DevelopmentFakeCaptureBackend,
  RecordedEpisodeHandoff,
  RecordingSessionCoordinator,
  type RecordingCaptureBackend,
  type RecordingEpisodeHandoff,
} from './recording-session-coordinator'
import type { RecordingSourceKind } from '../shared/recording-session'

describe('RecordingSessionCoordinator', () => {
  const directories: string[] = []

  it('publishes Microphone Source activity through renderer-facing state changes', async () => {
    let publishActivity: ((sourceId: string, kind: RecordingSourceKind, level: number) => void) | undefined
    const backend: RecordingCaptureBackend = {
      getSources: async () => [{ id: 'mic-1', kind: 'microphone', name: 'Microphone', detail: '', readiness: 'ready', activity: 0 }],
      start: async () => {},
      pause: async () => {},
      resume: async () => {},
      finalize: async () => { throw new Error('unused') },
      cancel: async () => {},
      onActivity: (listener) => { publishActivity = listener },
    }
    const handoff: RecordingEpisodeHandoff = {
      createAndEnqueue: async () => { throw new Error('unused') },
    }
    const coordinator = new RecordingSessionCoordinator({ backend, handoff })
    await coordinator.open()
    const observedActivity: number[] = []
    coordinator.onStateChanged((state) => observedActivity.push(state.sources[0]?.activity ?? -1))

    publishActivity?.('mic-1', 'microphone', 0.8)

    expect(observedActivity).toContain(0.8)
  })

  it('preserves live activity while refreshing source readiness', async () => {
    let publishActivity: ((sourceId: string, kind: RecordingSourceKind, level: number) => void) | undefined
    const backend: RecordingCaptureBackend = {
      getSources: async () => [{ id: 'mic-1', kind: 'microphone', name: 'Microphone', detail: '', readiness: 'ready', activity: 0 }],
      start: async () => {},
      pause: async () => {},
      resume: async () => {},
      finalize: async () => { throw new Error('unused') },
      cancel: async () => {},
      onActivity: (listener) => { publishActivity = listener },
    }
    const handoff: RecordingEpisodeHandoff = {
      createAndEnqueue: async () => { throw new Error('unused') },
    }
    const coordinator = new RecordingSessionCoordinator({ backend, handoff })
    await coordinator.open()
    publishActivity?.('mic-1', 'microphone', 0.8)

    const refreshed = await coordinator.refreshSources()

    expect(refreshed.sources[0]?.activity).toBe(0.8)
  })

  afterEach(() => {
    for (const directory of directories) rmSync(directory, { recursive: true, force: true })
    directories.length = 0
  })

  it('turns one fake Recording Session into one Recorded Episode and cleans up after durable Transcription', async () => {
    const recordingsDirectory = mkdtempSync(join(tmpdir(), 'audistill-recordings-'))
    directories.push(recordingsDirectory)
    const db = new DatabaseService(':memory:')
    let now = Date.parse('2026-07-17T09:30:00.000Z')
    const backend = new DevelopmentFakeCaptureBackend({
      recordingsDirectory,
      now: () => now,
      allowFakeCapture: true,
    })
    let releaseHandoff!: () => void
    const handoffGate = new Promise<void>((resolve) => { releaseHandoff = resolve })
    const handoff = new RecordedEpisodeHandoff({
      db,
      enqueue: async (episodeId) => {
        const episode = db.getEpisode(episodeId)
        expect(episode?.status).toBe('queued')
        expect(episode?.file_path).toBeTruthy()

        // This is the durable Transcription boundary: commit first, clear ownership,
        // then report success so temporary capture may be removed.
        await handoffGate
        db.updateEpisode(episodeId, {
          transcript: JSON.stringify([{ start: 0, end: 3, text: 'Test transcript' }]),
          file_path: null,
          status: 'summarizing',
        })
      },
    })
    const coordinator = new RecordingSessionCoordinator({ backend, handoff, now: () => now })

    const setup = await coordinator.open()
    expect(setup.phase).toBe('setup')
    expect(setup.sources.map((source) => source.kind)).toEqual(['system-audio', 'microphone'])
    expect(db.getEpisodes()).toHaveLength(0)

    await coordinator.start({
      title: 'Weekly planning',
      enabledSourceKinds: ['system-audio'],
    })
    expect((await coordinator.open()).phase).toBe('recording')
    expect(db.getEpisodes()).toHaveLength(0)

    now += 2_000
    await coordinator.pause()
    now += 10_000
    await coordinator.resume()
    now += 1_000

    const stopPromise = coordinator.stop()
    await Promise.resolve()
    expect(coordinator.getState().phase).toBe('finalizing')
    await expect(coordinator.stop()).rejects.toThrow('cannot be stopped')
    await expect(coordinator.cancel()).rejects.toThrow('cannot be cancelled')
    releaseHandoff()
    const result = await stopPromise
    const episodes = db.getEpisodes()
    expect(episodes).toHaveLength(1)
    expect(result.episodeId).toBe(episodes[0].id)
    expect(episodes[0]).toMatchObject({
      title: 'Weekly planning',
      source_type: 'recorded',
      status: 'summarizing',
      file_path: null,
    })
    expect(JSON.parse(episodes[0].source_meta!)).toMatchObject({
      schemaVersion: 1,
      sources: { systemAudio: true, microphone: false },
      activeDurationMs: 3_000,
    })
    expect(episodes[0].source_meta).not.toContain(recordingsDirectory)
    expect(episodes[0].source_meta).not.toContain('device')
    expect(existsSync(result.sessionDirectory)).toBe(false)
    expect(coordinator.getState().phase).toBe('idle')
  })
})
