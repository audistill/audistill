import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import http from 'node:http'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

vi.mock('electron', () => ({
  app: { getPath: () => '/unused' }
}))

import { ModelManager } from '../src/main/model-manager'

const FAKE_CONTENT = Buffer.from('fake-model-data-for-testing')

function createFakeServer(): http.Server {
  return http.createServer((req, res) => {
    if (req.url === '/fail') {
      res.socket?.destroy()
      return
    }
    if (req.method === 'HEAD') {
      res.writeHead(200, { 'content-length': String(FAKE_CONTENT.length) })
      res.end()
    } else {
      res.writeHead(200, { 'content-length': String(FAKE_CONTENT.length) })
      res.end(FAKE_CONTENT)
    }
  })
}

describe('ModelManager', () => {
  let server: http.Server
  let baseUrl: string
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'model-manager-test-'))
    server = createFakeServer()
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address() as { port: number }
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await rm(tempDir, { recursive: true, force: true })
  })

  function createManager(): ModelManager {
    const modelDir = join(tempDir, 'models')
    const mgr = new ModelManager(modelDir)
    // Override the private MODEL_REPO to point at our fake server
    ;(mgr as any).modelDir = modelDir
    return mgr
  }

  function patchRepo(mgr: ModelManager): void {
    const proto = Object.getPrototypeOf(mgr)
    const origGetContentLength = proto.getContentLength.bind(mgr)
    const origDownloadFile = proto.downloadFile.bind(mgr)

    ;(mgr as any).getContentLength = function (url: string, redirects?: number) {
      const rewritten = url.replace(/https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/main/, baseUrl)
      return origGetContentLength(rewritten, redirects)
    }

    ;(mgr as any).downloadFile = function (url: string, dest: string, onChunk: (bytes: number) => void, redirects?: number) {
      const rewritten = url.replace(/https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/main/, baseUrl)
      return origDownloadFile(rewritten, dest, onChunk, redirects)
    }
  }

  it('first call triggers download when model directory is empty', async () => {
    const mgr = createManager()
    patchRepo(mgr)

    const result = await mgr.ensureModel()
    expect(result).toBe(join(tempDir, 'models'))

    const files = await readdir(result)
    expect(files.length).toBeGreaterThan(0)
  })

  it('progress events fire during download with increasing percentages', async () => {
    const mgr = createManager()
    patchRepo(mgr)

    const percents: number[] = []
    mgr.on('progress', (p) => percents.push(p))

    await mgr.ensureModel()

    expect(percents.length).toBeGreaterThan(0)
    for (let i = 1; i < percents.length; i++) {
      expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1])
    }
    expect(percents[percents.length - 1]).toBe(100)
  })

  it('files are written to the expected model directory', async () => {
    const mgr = createManager()
    patchRepo(mgr)

    const modelPath = await mgr.ensureModel()
    const files = await readdir(modelPath)

    expect(files).toContain('encoder-model.int8.onnx')
    expect(files).toContain('decoder_joint-model.int8.onnx')
    expect(files).toContain('nemo128.onnx')
    expect(files).toContain('vocab.txt')
    expect(files).toContain('config.json')
  })

  it('second call resolves immediately without HTTP requests', async () => {
    const mgr = createManager()
    patchRepo(mgr)

    await mgr.ensureModel()

    // Close server — any HTTP request would fail
    await new Promise<void>((resolve) => server.close(() => resolve()))

    const mgr2 = new ModelManager(join(tempDir, 'models'))
    const result = await mgr2.ensureModel()
    expect(result).toBe(join(tempDir, 'models'))

    // Recreate server for afterEach cleanup
    server = createFakeServer()
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  })

  it('interrupted download leaves no partial files (clean state for retry)', async () => {
    const modelDir = join(tempDir, 'models')
    const mgr = new ModelManager(modelDir)

    // Point at a server that kills the connection
    const failServer = http.createServer((req, res) => {
      if (req.method === 'HEAD') {
        res.writeHead(200, { 'content-length': '10000' })
        res.end()
      } else {
        res.writeHead(200, { 'content-length': '10000' })
        res.write('partial')
        res.socket?.destroy()
      }
    })
    await new Promise<void>((resolve) => failServer.listen(0, '127.0.0.1', resolve))
    const failAddr = failServer.address() as { port: number }
    const failUrl = `http://127.0.0.1:${failAddr.port}`

    const proto = Object.getPrototypeOf(mgr)
    const origGetContentLength = proto.getContentLength.bind(mgr)
    const origDownloadFile = proto.downloadFile.bind(mgr)
    ;(mgr as any).getContentLength = function (url: string, redirects?: number) {
      const rewritten = url.replace(/https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/main/, failUrl)
      return origGetContentLength(rewritten, redirects)
    }
    ;(mgr as any).downloadFile = function (url: string, dest: string, onChunk: (bytes: number) => void, redirects?: number) {
      const rewritten = url.replace(/https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/main/, failUrl)
      return origDownloadFile(rewritten, dest, onChunk, redirects)
    }

    await expect(mgr.ensureModel()).rejects.toThrow()

    // Neither the final model dir nor the temp dir should exist
    const entries = await readdir(tempDir).catch(() => [])
    expect(entries).not.toContain('models')
    expect(entries).not.toContain('models.downloading')

    await new Promise<void>((resolve) => failServer.close(() => resolve()))
  })
})
