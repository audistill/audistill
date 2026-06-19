import { EventEmitter } from 'node:events'
import { createWriteStream } from 'node:fs'
import { access, mkdir, rename, rm, stat, readdir } from 'node:fs/promises'
import https from 'node:https'
import http from 'node:http'
import { join } from 'node:path'
import { app } from 'electron'

const MODEL_REPO = 'https://huggingface.co/grikdotnet/parakeet-tdt-0.6b-fp16/resolve/main'
const MODEL_FILES = [
  'encoder-model.fp16.onnx',
  'decoder_joint-model.fp16.onnx',
  'nemo128.onnx',
  'vocab.txt',
  'config.json'
]

export const MODEL_DESCRIPTOR = {
  id: 'parakeet-tdt-0.6b-fp16',
  name: 'Parakeet TDT 0.6B v3 fp16',
  repo: MODEL_REPO,
  files: MODEL_FILES,
} as const

export type ModelState = 'not-downloaded' | 'downloading' | 'ready' | 'error'

export interface ModelStatus {
  state: ModelState
  percent?: number
  sizeOnDisk?: number
  error?: string
}

export interface ModelManagerEvents {
  progress: [percent: number]
  'status-changed': [status: ModelStatus]
}

export class ModelManager extends EventEmitter<ModelManagerEvents> {
  private modelDir: string
  private _state: ModelState = 'not-downloaded'
  private _percent = 0
  private _error: string | undefined
  private _downloadPromise: Promise<string> | null = null

  constructor(modelDir?: string) {
    super()
    this.modelDir = modelDir ?? join(app.getPath('userData'), 'models')
  }

  /** Synchronously initialize state by checking disk. Call once at startup. */
  async init(): Promise<void> {
    const exists = await this.allFilesExist()
    if (exists) {
      this.transition('ready')
    } else {
      this.transition('not-downloaded')
    }
  }

  getStatus(): ModelStatus {
    const status: ModelStatus = { state: this._state }
    if (this._state === 'downloading') {
      status.percent = this._percent
    }
    if (this._state === 'error') {
      status.error = this._error
    }
    return status
  }

  async getStatusWithSize(): Promise<ModelStatus> {
    const status = this.getStatus()
    if (this._state === 'ready') {
      status.sizeOnDisk = await this.computeSizeOnDisk()
    }
    return status
  }

  async delete(): Promise<ModelStatus> {
    if (this._downloadPromise) {
      // Can't delete while downloading — just return current status
      return this.getStatus()
    }
    await rm(this.modelDir, { recursive: true, force: true })
    this.transition('not-downloaded')
    return this.getStatus()
  }

  download(): void {
    if (this._state === 'downloading') return
    this.transition('downloading')
    this._percent = 0
    this._downloadPromise = this.performDownload()
    this._downloadPromise
      .then(() => {
        this._downloadPromise = null
        this.transition('ready')
      })
      .catch((err) => {
        this._downloadPromise = null
        this._error = err instanceof Error ? err.message : String(err)
        this.transition('error')
      })
  }

  async ensureModel(): Promise<string> {
    if (this._state === 'ready') return this.modelDir

    // Check disk in case init() wasn't called (e.g., called from IngestPipeline)
    if (this._state === 'not-downloaded') {
      const exists = await this.allFilesExist()
      if (exists) {
        this.transition('ready')
        return this.modelDir
      }
    }

    if (this._state === 'downloading' && this._downloadPromise) {
      return this._downloadPromise
    }

    this.transition('downloading')
    this._percent = 0
    this._downloadPromise = this.performDownload()

    try {
      const result = await this._downloadPromise
      this._downloadPromise = null
      this.transition('ready')
      return result
    } catch (err) {
      this._downloadPromise = null
      this._error = err instanceof Error ? err.message : String(err)
      this.transition('error')
      throw err
    }
  }

  private transition(newState: ModelState): void {
    this._state = newState
    if (newState !== 'downloading') {
      this._percent = newState === 'ready' ? 100 : 0
    }
    if (newState !== 'error') {
      this._error = undefined
    }
    this.emit('status-changed', this.getStatus())
  }

  private async performDownload(): Promise<string> {
    const tempDir = this.modelDir + '.downloading'
    await rm(tempDir, { recursive: true, force: true })
    await mkdir(tempDir, { recursive: true })

    try {
      const sizes = await this.fetchFileSizes()
      const totalBytes = sizes.reduce((sum, s) => sum + s, 0)
      let downloadedBytes = 0

      for (let i = 0; i < MODEL_FILES.length; i++) {
        const file = MODEL_FILES[i]
        const dest = join(tempDir, file)
        const url = `${MODEL_REPO}/${file}`

        await this.downloadFile(url, dest, (bytes) => {
          downloadedBytes += bytes
          const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0
          this._percent = Math.min(percent, 100)
          this.emit('progress', this._percent)
        })
      }

      await rm(this.modelDir, { recursive: true, force: true })
      await rename(tempDir, this.modelDir)

      return this.modelDir
    } catch (err) {
      await rm(tempDir, { recursive: true, force: true })
      throw err
    }
  }

  private async allFilesExist(): Promise<boolean> {
    for (const file of MODEL_FILES) {
      try {
        await access(join(this.modelDir, file))
      } catch {
        return false
      }
    }
    return true
  }

  private async computeSizeOnDisk(): Promise<number> {
    try {
      const files = await readdir(this.modelDir)
      let total = 0
      for (const file of files) {
        const s = await stat(join(this.modelDir, file))
        total += s.size
      }
      return total
    } catch {
      return 0
    }
  }

  private async fetchFileSizes(): Promise<number[]> {
    return Promise.all(
      MODEL_FILES.map((file) => this.getContentLength(`${MODEL_REPO}/${file}`))
    )
  }

  private resolveRedirect(base: string, location: string): string {
    if (location.startsWith('http://') || location.startsWith('https://')) return location
    const parsed = new URL(base)
    return `${parsed.origin}${location}`
  }

  private getContentLength(url: string, redirects = 5): Promise<number> {
    return new Promise((resolve, reject) => {
      if (redirects <= 0) return reject(new Error('Too many redirects'))

      const client = url.startsWith('https') ? https : http
      const req = client.request(url, { method: 'HEAD' }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(this.getContentLength(this.resolveRedirect(url, res.headers.location), redirects - 1))
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HEAD ${url} returned ${res.statusCode}`))
          return
        }
        const len = parseInt(res.headers['content-length'] || '0', 10)
        resolve(len)
      })
      req.on('error', reject)
      req.end()
    })
  }

  private downloadFile(
    url: string,
    dest: string,
    onChunk: (bytes: number) => void,
    redirects = 5
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (redirects <= 0) return reject(new Error('Too many redirects'))

      const client = url.startsWith('https') ? https : http
      client.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          resolve(this.downloadFile(this.resolveRedirect(url, res.headers.location), dest, onChunk, redirects - 1))
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`Download failed: ${url} returned ${res.statusCode}`))
          return
        }

        const stream = createWriteStream(dest)
        res.on('data', (chunk: Buffer) => {
          onChunk(chunk.length)
        })
        res.pipe(stream)
        stream.on('finish', resolve)
        stream.on('error', reject)
        res.on('error', reject)
      }).on('error', reject)
    })
  }
}
