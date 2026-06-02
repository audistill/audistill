import { EventEmitter } from 'node:events'
import { createWriteStream } from 'node:fs'
import { access, mkdir, rename, rm } from 'node:fs/promises'
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

export interface ModelManagerEvents {
  progress: [percent: number]
}

export class ModelManager extends EventEmitter<ModelManagerEvents> {
  private modelDir: string

  constructor(modelDir?: string) {
    super()
    this.modelDir = modelDir ?? join(app.getPath('userData'), 'models')
  }

  async ensureModel(): Promise<string> {
    const allExist = await this.allFilesExist()
    if (allExist) return this.modelDir

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
          this.emit('progress', Math.min(percent, 100))
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
