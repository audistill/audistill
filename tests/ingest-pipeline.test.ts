import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/unused' },
  BrowserWindow: {
    getAllWindows: () => [],
    getFocusedWindow: () => null
  },
  dialog: { showOpenDialog: vi.fn() },
  ipcMain: { handle: vi.fn() },
  net: {
    fetch: (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args)
  }
}))

let workerFactory: () => any

vi.mock('node:worker_threads', () => ({
  Worker: class MockWorker {
    private listeners: Record<string, ((...args: any[]) => void)[]> = {}
    private impl: any

    constructor() {
      this.impl = workerFactory()
      this.impl._emit = (event: string, ...args: any[]) => {
        const handlers = this.listeners[event] || []
        for (const handler of handlers) handler(...args)
      }
    }

    on(event: string, cb: (...args: any[]) => void) {
      this.listeners[event] = this.listeners[event] || []
      this.listeners[event].push(cb)
      return this
    }

    postMessage(msg: any) {
      this.impl.postMessage(msg, this.impl._emit)
    }

    terminate() {}
  }
}))

vi.mock('../src/main/audio-preprocessor', () => ({
  preprocess: vi.fn()
}))

import { DatabaseService } from '../src/main/database-service'
import { SummarizationService } from '../src/main/summarization-service'
import { IngestPipeline } from '../src/main/ingest-pipeline'
import { ModelManager } from '../src/main/model-manager'
import { preprocess } from '../src/main/audio-preprocessor'

function createMockModelManager(): ModelManager {
  return {
    ensureModel: vi.fn().mockResolvedValue('/fake/models')
  } as unknown as ModelManager
}

function createMockSummarizationService(
  result = { title: 'Generated Title', summary: '**The Rundown:** Content' }
): SummarizationService {
  return {
    summarize: vi.fn().mockResolvedValue(result),
    validateApiKey: vi.fn().mockResolvedValue(true)
  } as unknown as SummarizationService
}

function setupMockWorker(segments?: { start: number; end: number; text: string }[]): void {
  const defaultSegments = [
    { start: 0, end: 30.5, text: 'This is the transcribed text' }
  ]
  const segs = segments ?? defaultSegments

  workerFactory = () => ({
    postMessage(msg: { type: string }, emit: (event: string, ...args: any[]) => void) {
      if (msg.type === 'start') {
        Promise.resolve().then(() => {
          emit('message', { type: 'progress', percent: 50 })
          for (const seg of segs) {
            emit('message', { type: 'segment', start: seg.start, end: seg.end, text: seg.text })
          }
          emit('message', { type: 'done' })
        })
      }
    }
  })
}

function setupFailingWorker(errorMessage: string): void {
  workerFactory = () => ({
    postMessage(msg: { type: string }, emit: (event: string, ...args: any[]) => void) {
      if (msg.type === 'start') {
        Promise.resolve().then(() => {
          emit('message', { type: 'error', message: errorMessage })
        })
      }
    }
  })
}

describe('IngestPipeline', () => {
  let db: DatabaseService
  let pipeline: IngestPipeline
  let mockModelManager: ModelManager
  let mockSummarizationService: SummarizationService

  beforeEach(() => {
    db = new DatabaseService(':memory:')
    mockModelManager = createMockModelManager()
    mockSummarizationService = createMockSummarizationService()
    pipeline = new IngestPipeline(db, mockModelManager, mockSummarizationService)

    const fakePcm = Buffer.alloc(16000 * 4 * 2) // 2 seconds of silence
    ;(preprocess as ReturnType<typeof vi.fn>).mockResolvedValue(fakePcm)
    setupMockWorker()
  })

  afterEach(() => {
    db.close()
    vi.clearAllMocks()
  })

  describe('state transitions', () => {
    it('transitions queued → transcribing → summarizing → complete', async () => {
      const epId = db.createEpisode({ file_path: '/test.mp3', title: 'Test', status: 'queued' })
      const statuses: string[] = []

      const origUpdate = db.updateEpisode.bind(db)
      vi.spyOn(db, 'updateEpisode').mockImplementation((id, fields) => {
        origUpdate(id, fields)
        if (fields.status) statuses.push(fields.status)
      })

      await (pipeline as any).processEpisode(epId)

      expect(statuses).toContain('transcribing')
      expect(statuses).toContain('summarizing')
      expect(statuses).toContain('complete')

      const episode = db.getEpisode(epId)
      expect(episode!.status).toBe('complete')
      expect(episode!.title).toBe('Generated Title')
      const briefSummary = db.getSummary(epId, 'brief')
      expect(briefSummary).toBeDefined()
      expect(briefSummary!.content).toContain('The Rundown')
      expect(briefSummary!.status).toBe('complete')
      const segments = JSON.parse(episode!.transcript!)
      expect(segments).toEqual([{ start: 0, end: 30.5, text: 'This is the transcribed text' }])
    })
  })

  describe('progress events', () => {
    it('emits progress during transcription', async () => {
      const epId = db.createEpisode({ file_path: '/test.mp3', title: 'Test', status: 'queued' })

      const progressEvents: any[] = []
      vi.spyOn(pipeline as any, 'broadcastProgress').mockImplementation(
        (episodeId: string, stage: string, percent: number) => {
          progressEvents.push({ episodeId, stage, percent })
        }
      )

      await (pipeline as any).processEpisode(epId)

      expect(progressEvents.length).toBeGreaterThan(0)
      expect(progressEvents[0].stage).toBe('transcribing')
    })
  })

  describe('transcription error', () => {
    it('sets episode status to error with error_message', async () => {
      setupFailingWorker('Transcription model failed')

      const epId = db.createEpisode({ file_path: '/test.mp3', title: 'Test', status: 'queued' })
      await (pipeline as any).processEpisode(epId)

      const episode = db.getEpisode(epId)
      expect(episode!.status).toBe('error')
      expect(episode!.error_message).toContain('Transcription model failed')
      expect(episode!.transcript).toBeNull()
    })
  })

  describe('summarization error', () => {
    it('preserves transcript in DB when summarization fails', async () => {
      ;(mockSummarizationService.summarize as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API rate limit exceeded')
      )

      const epId = db.createEpisode({ file_path: '/test.mp3', title: 'Test', status: 'queued' })
      await (pipeline as any).processEpisode(epId)

      const episode = db.getEpisode(epId)
      expect(episode!.status).toBe('error')
      expect(episode!.error_message).toContain('rate limit')
      const segments = JSON.parse(episode!.transcript!)
      expect(segments).toEqual([{ start: 0, end: 30.5, text: 'This is the transcribed text' }])
    })
  })

  describe('retry behavior', () => {
    it('retry after transcription error re-runs full pipeline', async () => {
      setupFailingWorker('Model error')
      const epId = db.createEpisode({ file_path: '/test.mp3', title: 'Test', status: 'queued' })
      await (pipeline as any).processEpisode(epId)

      expect(db.getEpisode(epId)!.status).toBe('error')

      setupMockWorker([{ start: 0, end: 15, text: 'Retry transcript' }])
      db.updateEpisode(epId, { status: 'queued', error_message: null })
      await (pipeline as any).processEpisode(epId)

      const episode = db.getEpisode(epId)
      expect(episode!.status).toBe('complete')
      const segments = JSON.parse(episode!.transcript!)
      expect(segments[0].text).toBe('Retry transcript')
    })

    it('retry after summarization error skips transcription, re-runs summarization only', async () => {
      const epId = db.createEpisode({ file_path: '/test.mp3', title: 'Test', status: 'queued' })

      // First run: transcription succeeds, summarization fails
      ;(mockSummarizationService.summarize as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Temporary failure')
      )
      await (pipeline as any).processEpisode(epId)

      expect(db.getEpisode(epId)!.status).toBe('error')
      const transcriptJson = JSON.parse(db.getEpisode(epId)!.transcript!)
      expect(transcriptJson[0].text).toBe('This is the transcribed text')

      // Retry: transcript exists so transcription is skipped
      ;(mockSummarizationService.summarize as ReturnType<typeof vi.fn>).mockResolvedValue({
        title: 'Retry Title',
        summary: 'Retry summary'
      })
      ;(preprocess as ReturnType<typeof vi.fn>).mockClear()

      db.updateEpisode(epId, { status: 'queued', error_message: null })
      await (pipeline as any).processEpisode(epId)

      expect(preprocess).not.toHaveBeenCalled()
      const episode = db.getEpisode(epId)
      expect(episode!.status).toBe('complete')
      expect(episode!.title).toBe('Retry Title')
    })
  })

  describe('queue behavior', () => {
    it('multiple queued files process sequentially', async () => {
      const processingOrder: string[] = []

      const origProcess = (pipeline as any).processEpisode.bind(pipeline)
      vi.spyOn(pipeline as any, 'processEpisode').mockImplementation(async (id: string) => {
        processingOrder.push(id)
        return origProcess(id)
      })

      const id1 = db.createEpisode({ file_path: '/first.mp3', title: 'First', status: 'queued' })
      const id2 = db.createEpisode({ file_path: '/second.mp3', title: 'Second', status: 'queued' })

      ;(pipeline as any).queue = [id1, id2]
      await (pipeline as any).processQueue()

      expect(processingOrder).toEqual([id1, id2])
      expect(db.getEpisode(id1)!.status).toBe('complete')
      expect(db.getEpisode(id2)!.status).toBe('complete')
    })

    it('episode record created immediately on queue (before processing starts)', () => {
      const id = db.createEpisode({ file_path: '/queued.mp3', title: 'Queued', status: 'queued' })
      const episode = db.getEpisode(id)

      expect(episode).toBeDefined()
      expect(episode!.status).toBe('queued')
      expect(episode!.transcript).toBeNull()
    })
  })

  describe('preprocessor integration', () => {
    it('calls AudioPreprocessor with the episode file path', async () => {
      const epId = db.createEpisode({ file_path: '/my/audio.mp3', title: 'Test', status: 'queued' })
      await (pipeline as any).processEpisode(epId)

      expect(preprocess).toHaveBeenCalledWith('/my/audio.mp3')
    })

    it('handles preprocessor error gracefully', async () => {
      ;(preprocess as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unsupported format'))

      const epId = db.createEpisode({ file_path: '/bad.xyz', title: 'Bad', status: 'queued' })
      await (pipeline as any).processEpisode(epId)

      const episode = db.getEpisode(epId)
      expect(episode!.status).toBe('error')
      expect(episode!.error_message).toContain('Unsupported format')
    })
  })

  describe('transcript format', () => {
    it('stores transcript as JSON array of timestamped segments', async () => {
      setupMockWorker([
        { start: 0, end: 30.5, text: 'First segment of speech.' },
        { start: 30.5, end: 62.1, text: 'Second segment continues here.' },
        { start: 62.1, end: 90.0, text: 'Third and final segment.' },
      ])

      const epId = db.createEpisode({ file_path: '/test.mp3', title: 'Test', status: 'queued' })
      await (pipeline as any).processEpisode(epId)

      const episode = db.getEpisode(epId)
      const transcript = episode!.transcript!
      const segments = JSON.parse(transcript)

      expect(Array.isArray(segments)).toBe(true)
      expect(segments).toHaveLength(3)
      for (const seg of segments) {
        expect(typeof seg.start).toBe('number')
        expect(typeof seg.end).toBe('number')
        expect(typeof seg.text).toBe('string')
        expect(seg.end).toBeGreaterThan(seg.start)
      }
      expect(segments[0]).toEqual({ start: 0, end: 30.5, text: 'First segment of speech.' })
      expect(segments[2]).toEqual({ start: 62.1, end: 90.0, text: 'Third and final segment.' })
    })
  })
})
