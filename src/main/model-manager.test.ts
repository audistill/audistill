import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-model-manager',
  },
}))

import { ModelManager } from './model-manager'
import type { ModelStatus } from './model-manager'

describe('ModelManager', () => {
  let tempDir: string
  let modelManager: ModelManager

  const MODEL_FILES = [
    'encoder-model.fp16.onnx',
    'decoder_joint-model.fp16.onnx',
    'nemo128.onnx',
    'vocab.txt',
    'config.json',
  ]

  async function seedModelFiles(dir: string, content = 'fake-content'): Promise<void> {
    await mkdir(dir, { recursive: true })
    for (const f of MODEL_FILES) {
      await writeFile(join(dir, f), content)
    }
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'model-mgr-test-'))
    modelManager = new ModelManager(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
    await rm(tempDir + '.downloading', { recursive: true, force: true })
  })

  describe('init + getStatus', () => {
    it('reports not-downloaded when model dir does not exist', async () => {
      // tempDir was created by mkdtemp but has no model files
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()
      const status = modelManager.getStatus()
      expect(status.state).toBe('not-downloaded')
    })

    it('reports ready when all model files exist', async () => {
      await seedModelFiles(tempDir)
      await modelManager.init()
      const status = modelManager.getStatus()
      expect(status.state).toBe('ready')
    })

    it('reports not-downloaded when only some files exist', async () => {
      await mkdir(tempDir, { recursive: true })
      await writeFile(join(tempDir, 'vocab.txt'), 'fake')
      await modelManager.init()
      const status = modelManager.getStatus()
      expect(status.state).toBe('not-downloaded')
    })
  })

  describe('state transitions', () => {
    it('emits status-changed on init', async () => {
      const statuses: ModelStatus[] = []
      modelManager.on('status-changed', (s) => statuses.push({ ...s }))
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()
      expect(statuses.length).toBe(1)
      expect(statuses[0].state).toBe('not-downloaded')
    })

    it('transitions to downloading when download() is called', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()

      const statuses: ModelStatus[] = []
      modelManager.on('status-changed', (s) => statuses.push({ ...s }))

      // Mock the private performDownload to never resolve (simulates in-flight download)
      const neverResolves = new Promise<string>(() => {})
      vi.spyOn(modelManager as any, 'performDownload').mockReturnValue(neverResolves)

      modelManager.download()

      // download() synchronously transitions to 'downloading'
      expect(statuses.length).toBe(1)
      expect(statuses[0].state).toBe('downloading')
      expect(modelManager.getStatus().state).toBe('downloading')
    })

    it('transitions to error when download fails', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()

      const statuses: ModelStatus[] = []
      modelManager.on('status-changed', (s) => statuses.push({ ...s }))

      vi.spyOn(modelManager as any, 'performDownload').mockRejectedValue(new Error('Network error'))

      modelManager.download()

      // Wait for the rejected promise's .catch() handler to fire
      await new Promise((r) => setTimeout(r, 50))

      expect(statuses[0].state).toBe('downloading')
      expect(statuses[1].state).toBe('error')
      expect(modelManager.getStatus().error).toBe('Network error')
    })

    it('transitions to ready when download succeeds', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()

      const statuses: ModelStatus[] = []
      modelManager.on('status-changed', (s) => statuses.push({ ...s }))

      vi.spyOn(modelManager as any, 'performDownload').mockResolvedValue(tempDir)

      modelManager.download()

      await vi.waitFor(() => modelManager.getStatus().state === 'ready', { timeout: 1000 })

      expect(statuses[0].state).toBe('downloading')
      expect(statuses[1].state).toBe('ready')
    })

    it('ignores download() call when already downloading', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()

      const neverResolves = new Promise<string>(() => {})
      vi.spyOn(modelManager as any, 'performDownload').mockReturnValue(neverResolves)

      modelManager.download()
      const statusesBefore = modelManager.getStatus()
      modelManager.download() // Should be a no-op
      const statusesAfter = modelManager.getStatus()

      expect(statusesBefore).toEqual(statusesAfter)
    })
  })

  describe('delete', () => {
    it('removes model directory and transitions to not-downloaded', async () => {
      await seedModelFiles(tempDir)
      await modelManager.init()
      expect(modelManager.getStatus().state).toBe('ready')

      const statuses: ModelStatus[] = []
      modelManager.on('status-changed', (s) => statuses.push({ ...s }))

      const result = await modelManager.delete()
      expect(result.state).toBe('not-downloaded')
      expect(statuses[0].state).toBe('not-downloaded')
    })

    it('is safe when model dir does not exist', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()
      const result = await modelManager.delete()
      expect(result.state).toBe('not-downloaded')
    })

    it('does not delete while downloading', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()

      const neverResolves = new Promise<string>(() => {})
      vi.spyOn(modelManager as any, 'performDownload').mockReturnValue(neverResolves)

      modelManager.download()
      expect(modelManager.getStatus().state).toBe('downloading')

      const result = await modelManager.delete()
      expect(result.state).toBe('downloading') // Unchanged
    })
  })

  describe('getStatusWithSize', () => {
    it('includes sizeOnDisk when model is ready', async () => {
      await mkdir(tempDir, { recursive: true })
      for (const f of MODEL_FILES) {
        await writeFile(join(tempDir, f), 'x'.repeat(100))
      }

      await modelManager.init()
      const status = await modelManager.getStatusWithSize()
      expect(status.state).toBe('ready')
      expect(status.sizeOnDisk).toBe(500) // 5 files × 100 bytes
    })

    it('does not include sizeOnDisk when not downloaded', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()
      const status = await modelManager.getStatusWithSize()
      expect(status.state).toBe('not-downloaded')
      expect(status.sizeOnDisk).toBeUndefined()
    })
  })

  describe('ensureModel', () => {
    it('returns modelDir immediately when state is ready', async () => {
      await seedModelFiles(tempDir)
      await modelManager.init()
      const result = await modelManager.ensureModel()
      expect(result).toBe(tempDir)
    })

    it('throws and transitions to error when download fails', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()

      vi.spyOn(modelManager as any, 'performDownload').mockRejectedValue(new Error('Download failed'))

      await expect(modelManager.ensureModel()).rejects.toThrow('Download failed')
      expect(modelManager.getStatus().state).toBe('error')
    })

    it('resolves when download succeeds', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()

      vi.spyOn(modelManager as any, 'performDownload').mockResolvedValue(tempDir)

      const result = await modelManager.ensureModel()
      expect(result).toBe(tempDir)
      expect(modelManager.getStatus().state).toBe('ready')
    })

    it('reuses existing download promise if already downloading', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()

      const downloadSpy = vi.spyOn(modelManager as any, 'performDownload').mockResolvedValue(tempDir)

      // Start download
      modelManager.download()

      // ensureModel should reuse the existing promise
      const result = await modelManager.ensureModel()
      expect(result).toBe(tempDir)
      expect(downloadSpy).toHaveBeenCalledTimes(1) // Not called again
    })
  })

  describe('download after delete', () => {
    it('can re-download after deleting model', async () => {
      await seedModelFiles(tempDir)
      await modelManager.init()
      expect(modelManager.getStatus().state).toBe('ready')

      await modelManager.delete()
      expect(modelManager.getStatus().state).toBe('not-downloaded')

      const statuses: ModelStatus[] = []
      modelManager.on('status-changed', (s) => statuses.push({ ...s }))

      vi.spyOn(modelManager as any, 'performDownload').mockResolvedValue(tempDir)

      modelManager.download()

      await vi.waitFor(() => modelManager.getStatus().state === 'ready', { timeout: 1000 })

      expect(statuses[0].state).toBe('downloading')
      expect(statuses[1].state).toBe('ready')
    })
  })

  describe('progress events', () => {
    it('emits progress during download', async () => {
      await rm(tempDir, { recursive: true, force: true })
      await modelManager.init()

      const progressValues: number[] = []
      modelManager.on('progress', (p) => progressValues.push(p))

      // Mock performDownload to emit progress events before resolving
      vi.spyOn(modelManager as any, 'performDownload').mockImplementation(async () => {
        modelManager.emit('progress', 25)
        modelManager.emit('progress', 50)
        modelManager.emit('progress', 100)
        return tempDir
      })

      modelManager.download()
      await vi.waitFor(() => modelManager.getStatus().state === 'ready', { timeout: 1000 })

      expect(progressValues).toEqual([25, 50, 100])
    })
  })
})
