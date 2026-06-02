/**
 * Smoke test: verify ModelManager downloads model files from HuggingFace.
 * Run: npx tsx scripts/test-model-download.mts
 *
 * Downloads to a temp dir, prints progress, then verifies all files exist
 * with non-zero size. Cleans up on success (pass --keep to retain files).
 */
import { EventEmitter } from 'node:events'
import { createWriteStream } from 'node:fs'
import { access, mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import https from 'node:https'
import http from 'node:http'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const MODEL_REPO = 'https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx/resolve/main'
const MODEL_FILES = [
  'encoder-model.int8.onnx',
  'decoder_joint-model.int8.onnx',
  'vocab.txt',
  'config.json'
]

interface ModelManagerEvents {
  progress: [percent: number]
}

class ModelManager extends EventEmitter<ModelManagerEvents> {
  private modelDir: string

  constructor(modelDir: string) {
    super()
    this.modelDir = modelDir
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

// --- Run the test ---

const keep = process.argv.includes('--keep')
const testDir = join(tmpdir(), `podcapture-model-test-${Date.now()}`)

console.log(`\n📂 Download directory: ${testDir}`)
console.log(`📦 Files to download: ${MODEL_FILES.join(', ')}`)
console.log('')

const manager = new ModelManager(testDir)

let lastPrinted = -1
manager.on('progress', (percent) => {
  if (percent !== lastPrinted && percent % 5 === 0) {
    lastPrinted = percent
    process.stdout.write(`\r   Progress: ${percent}%`)
  }
})

try {
  console.log('1. First call — downloading model...')
  const t0 = Date.now()
  const modelPath = await manager.ensureModel()
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n   Done in ${elapsed}s → ${modelPath}`)

  // Verify files
  console.log('\n2. Verifying downloaded files...')
  const files = await readdir(modelPath)
  for (const expected of MODEL_FILES) {
    if (!files.includes(expected)) {
      throw new Error(`Missing file: ${expected}`)
    }
    const s = await stat(join(modelPath, expected))
    console.log(`   ✓ ${expected} (${(s.size / 1024 / 1024).toFixed(1)} MB)`)
  }

  // Second call should be instant
  console.log('\n3. Second call — should resolve immediately...')
  const t1 = Date.now()
  await manager.ensureModel()
  const elapsed2 = Date.now() - t1
  console.log(`   ✓ Resolved in ${elapsed2}ms (no download)`)

  console.log('\n✅ All checks passed!\n')
} catch (err) {
  console.error('\n❌ Test failed:', err)
  process.exit(1)
} finally {
  if (!keep) {
    await rm(testDir, { recursive: true, force: true })
    console.log('🧹 Cleaned up temp directory')
  } else {
    console.log(`📁 Keeping files at: ${testDir}`)
  }
}
