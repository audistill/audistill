import { BrowserWindow, dialog, ipcMain } from 'electron'
import { Worker } from 'node:worker_threads'
import { join, basename } from 'node:path'
import { preprocess } from './audio-preprocessor'
import { ModelManager } from './model-manager'
import { DatabaseService, Episode } from './database-service'
import { RecipeService } from './recipe-service'
import { TabService } from './tab-service'

const SUPPORTED_FILTERS = [
  { name: 'Audio Files', extensions: ['mp3', 'm4a', 'wav', 'flac', 'mp4'] }
]

export class IngestPipeline {
  private db: DatabaseService
  private modelManager: ModelManager
  private recipeService: RecipeService
  private tabService: TabService
  private processing = false
  private queue: string[] = []
  private activeWorkers = new Map<string, Worker>()

  constructor(db: DatabaseService, modelManager: ModelManager, recipeService: RecipeService, tabService: TabService) {
    this.db = db
    this.modelManager = modelManager
    this.recipeService = recipeService
    this.tabService = tabService
  }

  recoverOrphanedEpisodes(): void {
    const allEpisodes = this.db.getEpisodes()
    for (const ep of allEpisodes) {
      if (ep.status === 'transcribing' || ep.status === 'queued') {
        this.db.updateEpisode(ep.id, { status: 'cancelled', error_message: null })
      }
    }
  }

  terminateWorkerForEpisode(episodeId: string): void {
    const worker = this.activeWorkers.get(episodeId)
    if (worker) {
      worker.terminate()
      this.activeWorkers.delete(episodeId)
    }
    this.queue = this.queue.filter((id) => id !== episodeId)
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
      if (!episode || (episode.status !== 'error' && episode.status !== 'cancelled')) return

      this.db.updateEpisode(episodeId, { status: 'queued', error_message: null })
      this.queue.push(episodeId)
      this.broadcastEpisodeUpdate(episodeId)
      this.processQueue()
    })

    ipcMain.handle('ingest:cancel', async (_event, episodeId: string) => {
      const episode = this.db.getEpisode(episodeId)
      if (!episode || episode.status !== 'transcribing') return

      const worker = this.activeWorkers.get(episodeId)
      if (worker) {
        await worker.terminate()
        this.activeWorkers.delete(episodeId)
      }

      this.db.updateEpisode(episodeId, { status: 'cancelled', error_message: null })
      this.broadcastEpisodeUpdate(episodeId)
    })

    ipcMain.handle('tabs:execute-recipe', async (_event, episodeId: string, tabId: string) => {
      await this.regenerateTab(episodeId, tabId)
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

    await this.runSummarization(episodeId)
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
      const current = this.db.getEpisode(episodeId)
      if (current?.status === 'cancelled') return false

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

      this.activeWorkers.set(episodeId, worker)
      let settled = false

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
            if (settled) break
            settled = true
            this.activeWorkers.delete(episodeId)
            worker.terminate()
            resolve(JSON.stringify(segments))
            break
          case 'error':
            if (settled) break
            settled = true
            this.activeWorkers.delete(episodeId)
            worker.terminate()
            reject(new Error(msg.message || 'Transcription failed'))
            break
        }
      })

      worker.on('error', (err) => {
        if (settled) return
        settled = true
        this.activeWorkers.delete(episodeId)
        reject(err)
      })

      worker.on('exit', (code) => {
        this.activeWorkers.delete(episodeId)
        if (settled) return
        settled = true
        if (code === 1) {
          reject(new Error('Worker was terminated'))
        } else if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`))
        }
      })

      worker.postMessage({ type: 'start', audioBuffer: sharedBuffer, modelPath })
    })
  }

  async runSummarization(episodeId: string): Promise<void> {
    this.db.updateEpisode(episodeId, { status: 'summarizing' })
    this.broadcastEpisodeUpdate(episodeId)

    const episode = this.db.getEpisode(episodeId)
    if (!episode?.transcript) {
      this.db.updateEpisode(episodeId, { status: 'error', error_message: 'No transcript available for summarization' })
      this.broadcastEpisodeUpdate(episodeId)
      return
    }

    const pipelineRecipe = this.recipeService.getPipelineRecipe()
    if (!pipelineRecipe) {
      this.db.updateEpisode(episodeId, { status: 'error', error_message: 'No pipeline recipe configured' })
      this.broadcastEpisodeUpdate(episodeId)
      return
    }

    const tabId = this.tabService.createTab(episodeId, {
      recipe_id: pipelineRecipe.id,
      tab_name: pipelineRecipe.name,
      is_pipeline: true,
    })

    this.broadcastTabEvent('tab:stream-start', { episodeId, tabId })

    let content = ''
    try {
      await this.recipeService.executeRecipe(pipelineRecipe.id, episode.transcript, (token) => {
        content += token
        this.broadcastTabEvent('tab:stream-token', { episodeId, tabId, token })
      })

      const { title, summary } = this.parseRecipeOutput(content)
      const finalContent = summary || content
      this.tabService.updateTabContent(tabId, finalContent)

      if (summary) {
        this.broadcastTabEvent('tab:content-updated', { episodeId, tabId, content: finalContent })
      }

      if (title) {
        this.db.updateEpisode(episodeId, { title, status: 'complete', error_message: null })
      } else {
        this.db.updateEpisode(episodeId, { status: 'complete', error_message: null })
      }

      this.broadcastTabEvent('tab:stream-end', { episodeId, tabId })
      this.broadcastEpisodeUpdate(episodeId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.db.updateEpisode(episodeId, { status: 'error', error_message: message })
      this.broadcastTabEvent('tab:stream-error', { episodeId, tabId, error: message })
      this.broadcastEpisodeUpdate(episodeId)
    }
  }

  async regenerateTab(episodeId: string, tabId: string): Promise<void> {
    const tabs = this.tabService.getTabs(episodeId)
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) throw new Error('Tab not found')
    if (!tab.recipe_id) throw new Error('Tab has no associated recipe')

    const episode = this.db.getEpisode(episodeId)
    if (!episode?.transcript) throw new Error('No transcript available')

    this.tabService.updateTabContent(tabId, '')
    this.broadcastTabEvent('tab:stream-start', { episodeId, tabId })

    let content = ''
    try {
      await this.recipeService.executeRecipe(tab.recipe_id, episode.transcript, (token) => {
        content += token
        this.broadcastTabEvent('tab:stream-token', { episodeId, tabId, token })
      })
      const { title, summary } = this.parseRecipeOutput(content)
      const finalContent = summary || content
      this.tabService.updateTabContent(tabId, finalContent)

      if (summary) {
        this.broadcastTabEvent('tab:content-updated', { episodeId, tabId, content: finalContent })
      }

      if (title && tab.is_pipeline) {
        this.db.updateEpisode(episodeId, { title })
        this.broadcastEpisodeUpdate(episodeId)
      }

      this.broadcastTabEvent('tab:stream-end', { episodeId, tabId })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.broadcastTabEvent('tab:stream-error', { episodeId, tabId, error: message })
      throw err
    }
  }

  private parseRecipeOutput(content: string): { title: string | null; summary: string | null } {
    try {
      const trimmed = content.trim()
      const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
      const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed
      const parsed = JSON.parse(jsonStr)
      if (typeof parsed === 'object' && parsed !== null && 'title' in parsed && 'summary' in parsed) {
        return {
          title: typeof parsed.title === 'string' ? parsed.title : null,
          summary: typeof parsed.summary === 'string' ? parsed.summary : null,
        }
      }
    } catch {
      // not JSON, treat as plain markdown
    }
    return { title: null, summary: null }
  }

  private broadcastTabEvent(channel: string, data: Record<string, unknown>): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
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
