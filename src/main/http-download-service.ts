import { net } from 'electron'
import { createWriteStream } from 'node:fs'

export class HttpDownloadService {
  private activeControllers = new Map<string, AbortController>()

  async download(
    url: string,
    destPath: string,
    onProgress?: (percent: number) => void,
    episodeId?: string
  ): Promise<void> {
    const controller = new AbortController()
    if (episodeId) {
      this.activeControllers.set(episodeId, controller)
    }

    try {
      const response = await net.fetch(url, { method: 'GET', signal: controller.signal })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const contentLengthHeader = response.headers.get('content-length')
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null

      const body = response.body
      if (!body) {
        throw new Error('Response body is empty')
      }

      const writer = createWriteStream(destPath)
      const reader = body.getReader()
      let downloaded = 0

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          writer.write(Buffer.from(value))
          downloaded += value.byteLength

          if (onProgress && totalBytes && totalBytes > 0) {
            onProgress(Math.round((downloaded / totalBytes) * 100))
          }
        }
      } finally {
        await new Promise<void>((resolve) => writer.end(resolve))
      }
    } finally {
      if (episodeId) {
        this.activeControllers.delete(episodeId)
      }
    }
  }

  abort(episodeId: string): void {
    const controller = this.activeControllers.get(episodeId)
    if (controller) {
      controller.abort()
      this.activeControllers.delete(episodeId)
    }
  }
}
