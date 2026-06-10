import { describe, it, expect, beforeEach, vi } from 'vitest'
import { join } from 'node:path'
import { homedir } from 'node:os'

const TMP_DIR = join(homedir(), '.audistill', 'tmp')

let mockExistsSync: (path: string) => boolean
let mockReaddirSync: (path: string) => string[]
const deletedFiles: string[] = []
let mockMkdirSync = vi.fn()

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    existsSync: (path: string) => mockExistsSync(path),
    readdirSync: (path: string) => mockReaddirSync(path),
    unlinkSync: (path: string) => { deletedFiles.push(path) },
    mkdirSync: (...args: any[]) => mockMkdirSync(...args),
  }
})

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
    fromWebContents: () => null,
    getFocusedWindow: () => null,
  },
  dialog: { showOpenDialog: vi.fn() },
  ipcMain: { handle: vi.fn() },
  net: { fetch: vi.fn() },
}))

import { ipcMain } from 'electron'
import { DatabaseService } from './database-service'
import { RecipeService } from './recipe-service'
import { TabService } from './tab-service'
import { IngestPipeline } from './ingest-pipeline'

const promptsDir = join(__dirname, 'prompts')

function createTestDb(): DatabaseService {
  return new DatabaseService(':memory:')
}

function getIpcHandler(channel: string): Function {
  const calls = vi.mocked(ipcMain.handle).mock.calls
  const match = calls.find(([ch]) => ch === channel)
  if (!match) throw new Error(`No IPC handler for ${channel}`)
  return match[1]
}

describe('IngestPipeline — resilience layer', () => {
  let db: DatabaseService
  let recipeService: RecipeService
  let tabService: TabService
  let pipeline: IngestPipeline
  let ytdlpService: { detect: any; download: any; kill: any; fetchMetadata: any; checkVersion: any }

  beforeEach(() => {
    db = createTestDb()
    recipeService = new RecipeService(db, promptsDir)
    tabService = new TabService(db)
    deletedFiles.length = 0

    const modelManager = { ensureModel: vi.fn() } as any
    ytdlpService = {
      detect: vi.fn().mockResolvedValue('/usr/local/bin/yt-dlp'),
      download: vi.fn().mockResolvedValue(undefined),
      kill: vi.fn(),
      fetchMetadata: vi.fn(),
      checkVersion: vi.fn(),
    }
    pipeline = new IngestPipeline(db, modelManager, recipeService, tabService, ytdlpService as any)

    mockExistsSync = () => false
    mockReaddirSync = () => []
    mockMkdirSync = vi.fn()

    vi.mocked(ipcMain.handle).mockClear()
  })

  describe('cancel during download', () => {
    it('kills yt-dlp process and sets status to cancelled', async () => {
      const id = db.createEpisode({
        title: 'Test Video',
        source_url: 'https://www.youtube.com/watch?v=abc123',
        status: 'downloading',
      })

      pipeline.registerIPC()
      const cancelHandler = getIpcHandler('ingest:cancel')

      await cancelHandler({}, id)

      expect(ytdlpService.kill).toHaveBeenCalledWith(id)
      const episode = db.getEpisode(id)
      expect(episode?.status).toBe('cancelled')
    })
  })

  describe('cancel during transcription', () => {
    it('terminates worker and sets status to cancelled', async () => {
      const id = db.createEpisode({
        title: 'Test Episode',
        file_path: '/path/to/audio.mp3',
        status: 'transcribing',
      })

      const mockWorker = { terminate: vi.fn().mockResolvedValue(undefined) } as any
      ;(pipeline as any).activeWorkers.set(id, mockWorker)

      pipeline.registerIPC()
      const cancelHandler = getIpcHandler('ingest:cancel')

      await cancelHandler({}, id)

      expect(mockWorker.terminate).toHaveBeenCalled()
      const episode = db.getEpisode(id)
      expect(episode?.status).toBe('cancelled')
    })
  })

  describe('stall detection propagation', () => {
    it('sets episode to error with descriptive timeout message', async () => {
      const id = db.createEpisode({
        title: 'Stalling Video',
        source_url: 'https://www.youtube.com/watch?v=stall',
        status: 'queued',
      })

      ytdlpService.download.mockRejectedValue(
        new Error('Download timed out — no data received for 30 seconds')
      )

      mockExistsSync = () => true
      mockReaddirSync = () => []

      await (pipeline as any).downloadEpisode(id, db.getEpisode(id)!)

      const episode = db.getEpisode(id)
      expect(episode?.status).toBe('error')
      expect(episode?.error_message).toContain('Download timed out')
      expect(episode?.error_message).toContain('30 seconds')
    })
  })

  describe('retry on URL episodes', () => {
    beforeEach(() => {
      vi.spyOn(pipeline as any, 'processQueue').mockResolvedValue(undefined)
    })

    it('deletes existing temp file before re-downloading', async () => {
      const id = db.createEpisode({
        title: 'Failed Video',
        source_url: 'https://www.youtube.com/watch?v=retry',
        status: 'error',
      })
      db.updateEpisode(id, { error_message: 'Network failure' })

      mockExistsSync = () => true
      mockReaddirSync = () => [`${id}.webm`]

      pipeline.registerIPC()
      const retryHandler = getIpcHandler('ingest:retry')

      await retryHandler({}, id)

      expect(deletedFiles).toContain(join(TMP_DIR, `${id}.webm`))
    })

    it('clears error_message and resets status to queued', async () => {
      const id = db.createEpisode({
        title: 'Errored Video',
        source_url: 'https://www.youtube.com/watch?v=err',
        status: 'error',
      })
      db.updateEpisode(id, { error_message: 'Something went wrong' })

      mockExistsSync = () => false
      mockReaddirSync = () => []

      pipeline.registerIPC()
      const retryHandler = getIpcHandler('ingest:retry')

      await retryHandler({}, id)

      const episode = db.getEpisode(id)
      expect(episode?.status).toBe('queued')
      expect(episode?.error_message).toBeNull()
    })

    it('also allows retry from cancelled status', async () => {
      const id = db.createEpisode({
        title: 'Cancelled Video',
        source_url: 'https://www.youtube.com/watch?v=cancel',
        status: 'cancelled',
      })

      mockExistsSync = () => false
      mockReaddirSync = () => []

      pipeline.registerIPC()
      const retryHandler = getIpcHandler('ingest:retry')

      await retryHandler({}, id)

      const episode = db.getEpisode(id)
      expect(episode?.status).toBe('queued')
    })
  })

  describe('startup temp sweep', () => {
    it('deletes all files in tmp directory', () => {
      mockExistsSync = () => true
      mockReaddirSync = () => ['ep1.webm', 'ep2.opus', 'ep3.m4a']

      pipeline.recoverOrphanedEpisodes()

      expect(deletedFiles).toContain(join(TMP_DIR, 'ep1.webm'))
      expect(deletedFiles).toContain(join(TMP_DIR, 'ep2.opus'))
      expect(deletedFiles).toContain(join(TMP_DIR, 'ep3.m4a'))
    })

    it('resets episodes stuck in downloading status to cancelled', () => {
      const id1 = db.createEpisode({
        title: 'Stuck Download 1',
        source_url: 'https://www.youtube.com/watch?v=s1',
        status: 'downloading',
      })
      const id2 = db.createEpisode({
        title: 'Stuck Download 2',
        source_url: 'https://www.youtube.com/watch?v=s2',
        status: 'downloading',
      })
      const id3 = db.createEpisode({
        title: 'Complete Episode',
        file_path: '/path.mp3',
        status: 'complete',
      })

      pipeline.recoverOrphanedEpisodes()

      expect(db.getEpisode(id1)?.status).toBe('cancelled')
      expect(db.getEpisode(id2)?.status).toBe('cancelled')
      expect(db.getEpisode(id3)?.status).toBe('complete')
    })

    it('resets episodes stuck in transcribing or queued status', () => {
      const id1 = db.createEpisode({
        title: 'Stuck Transcribing',
        file_path: '/path.mp3',
        status: 'transcribing',
      })
      const id2 = db.createEpisode({
        title: 'Stuck Queued',
        file_path: '/path2.mp3',
        status: 'queued',
      })

      pipeline.recoverOrphanedEpisodes()

      expect(db.getEpisode(id1)?.status).toBe('cancelled')
      expect(db.getEpisode(id2)?.status).toBe('cancelled')
    })
  })
})
