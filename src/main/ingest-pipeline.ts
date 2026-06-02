import { BrowserWindow, dialog, ipcMain } from 'electron'
import { Worker } from 'node:worker_threads'
import { join, basename } from 'node:path'
import { preprocess } from './audio-preprocessor'
import { ModelManager } from './model-manager'
import { DatabaseService, Episode } from './database-service'
import { SummarizationService } from './summarization-service'

const SUPPORTED_FILTERS = [
  { name: 'Audio Files', extensions: ['mp3', 'm4a', 'wav', 'flac', 'mp4'] }
]

export class IngestPipeline {
  private db: DatabaseService
  private modelManager: ModelManager
  private summarizationService: SummarizationService
  private processing = false
  private queue: string[] = []

  constructor(db: DatabaseService, modelManager: ModelManager, summarizationService: SummarizationService) {
    this.db = db
    this.modelManager = modelManager
    this.summarizationService = summarizationService
  }

  registerIPC(): void {
    ipcMain.handle('ingest:add-files', async (_event, filePaths: string[]) => {
      const ids: string[] = []
      for (const filePath of filePaths) {
        if (!filePath) continue
        const id = this.db.createEpisode({
          title: basename(filePath),
          file_path: filePath,
          status: 'queued',
        })
        ids.push(id)
        this.queue.push(id)
        this.broadcastEpisodeUpdate(id)
      }
      this.processQueue()
      return ids
    })

    ipcMain.handle('ingest:select-files', async () => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return null

      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
        filters: SUPPORTED_FILTERS,
      })

      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths
    })

    ipcMain.handle('ingest:retry', async (_event, episodeId: string) => {
      const episode = this.db.getEpisode(episodeId)
      if (!episode || episode.status !== 'error') return

      this.db.updateEpisode(episodeId, { status: 'queued', error_message: null })
      this.queue.push(episodeId)
      this.broadcastEpisodeUpdate(episodeId)
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const episodeId = this.queue.shift()!
      await this.processEpisode(episodeId)
    }

    this.processing = false
  }

  private async processEpisode(episodeId: string): Promise<void> {
    const episode = this.db.getEpisode(episodeId)
    if (!episode) return

    const hasTranscript = !!episode.transcript

    if (!hasTranscript) {
      const transcribeOk = await this.transcribeEpisode(episodeId, episode)
      if (!transcribeOk) return
    } else {
      this.db.updateEpisode(episodeId, { status: 'summarizing' })
      this.broadcastEpisodeUpdate(episodeId)
    }

    await this.summarizeEpisode(episodeId)
  }

  private async transcribeEpisode(episodeId: string, episode: Episode): Promise<boolean> {
    this.db.updateEpisode(episodeId, { status: 'transcribing' })
    this.broadcastEpisodeUpdate(episodeId)

    try {
      const modelPath = await this.modelManager.ensureModel()
      const pcmBuffer = await preprocess(episode.file_path)

      const durationSec = Math.round(pcmBuffer.byteLength / 4 / 16000)
      this.db.updateEpisode(episodeId, { duration_sec: durationSec })
      this.broadcastEpisodeUpdate(episodeId)

      const transcript = await this.runTranscriptionWorker(pcmBuffer, modelPath, episodeId)

      this.db.updateEpisode(episodeId, { transcript, status: 'summarizing' })
      this.broadcastEpisodeUpdate(episodeId)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.db.updateEpisode(episodeId, { status: 'error', error_message: message })
      this.broadcastEpisodeUpdate(episodeId)
      return false
    }
  }

  private runTranscriptionWorker(pcmBuffer: Buffer, modelPath: string, episodeId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const sharedBuffer = new SharedArrayBuffer(pcmBuffer.byteLength)
      const shared = new Float32Array(sharedBuffer)
      shared.set(new Float32Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.byteLength / 4))

      const workerPath = join(__dirname, 'transcription-worker.js')
      const worker = new Worker(workerPath)

      const segments: { start: number; end: number; text: string }[] = []

      worker.on('message', (msg: { type: string; percent?: number; start?: number; end?: number; text?: string; message?: string }) => {
        switch (msg.type) {
          case 'progress':
            this.broadcastProgress(episodeId, 'transcribing', msg.percent ?? 0)
            break
          case 'segment':
            if (msg.text) segments.push({ start: msg.start ?? 0, end: msg.end ?? 0, text: msg.text })
            break
          case 'done':
            worker.terminate()
            resolve(JSON.stringify(segments))
            break
          case 'error':
            worker.terminate()
            reject(new Error(msg.message || 'Transcription failed'))
            break
        }
      })

      worker.on('error', (err) => {
        reject(err)
      })

      worker.postMessage({ type: 'start', audioBuffer: sharedBuffer, modelPath })
    })
  }

  private async summarizeEpisode(episodeId: string): Promise<void> {
    this.db.updateEpisode(episodeId, { status: 'summarizing' })
    this.broadcastEpisodeUpdate(episodeId)

    const episode = this.db.getEpisode(episodeId)
    if (!episode?.transcript) {
      this.db.updateEpisode(episodeId, { status: 'error', error_message: 'No transcript available for summarization' })
      this.broadcastEpisodeUpdate(episodeId)
      return
    }

    try {
      const { title, summary } = await this.summarizationService.summarize(episode.transcript)
      this.db.updateEpisode(episodeId, { title, summary, status: 'complete', error_message: null })
      this.broadcastEpisodeUpdate(episodeId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.db.updateEpisode(episodeId, { status: 'error', error_message: message })
      this.broadcastEpisodeUpdate(episodeId)
    }
  }

  private broadcastEpisodeUpdate(episodeId: string): void {
    const episode = this.db.getEpisode(episodeId)
    if (!episode) return

    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('episode-updated', episode)
      }
    }
  }

  private broadcastProgress(episodeId: string, stage: string, percent: number): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('ingest-progress', { episodeId, stage, percent })
      }
    }
  }
}
