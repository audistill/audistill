import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpDownloadService } from './http-download-service'

const mockFetch = vi.fn()
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  net: { fetch: (...args: unknown[]) => mockFetch(...args) },
}))

const mockWriteStream = {
  write: vi.fn().mockReturnValue(true),
  end: vi.fn((cb: () => void) => cb()),
  on: vi.fn(),
}
vi.mock('node:fs', () => ({
  createWriteStream: () => mockWriteStream,
  existsSync: () => true,
  mkdirSync: vi.fn(),
}))

function createMockResponse(opts: {
  ok?: boolean
  status?: number
  contentLength?: string | null
  body?: ReadableStream<Uint8Array> | null
}) {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers: {
      get: (name: string) => {
        if (name === 'content-length') return opts.contentLength ?? null
        return null
      },
    },
    body: opts.body ?? null,
  }
}

function createReadableStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index])
        index++
      } else {
        controller.close()
      }
    },
  })
}

describe('HttpDownloadService', () => {
  let service: HttpDownloadService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new HttpDownloadService()
  })

  it('downloads file to destination path', async () => {
    const chunk = new Uint8Array([1, 2, 3, 4, 5])
    const stream = createReadableStream([chunk])
    mockFetch.mockResolvedValue(createMockResponse({ body: stream, contentLength: '5' }))

    await service.download('https://example.com/file.mp3', '/tmp/out.mp3')

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/file.mp3', expect.objectContaining({ method: 'GET' }))
    expect(mockWriteStream.write).toHaveBeenCalledWith(Buffer.from(chunk))
    expect(mockWriteStream.end).toHaveBeenCalled()
  })

  it('reports progress via callback', async () => {
    const chunk1 = new Uint8Array(50)
    const chunk2 = new Uint8Array(50)
    const stream = createReadableStream([chunk1, chunk2])
    mockFetch.mockResolvedValue(createMockResponse({ body: stream, contentLength: '100' }))

    const progress: number[] = []
    await service.download('https://example.com/file.mp3', '/tmp/out.mp3', (pct) => {
      progress.push(pct)
    })

    expect(progress).toEqual([50, 100])
  })

  it('throws on 4xx response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ ok: false, status: 404 }))

    await expect(
      service.download('https://example.com/missing.mp3', '/tmp/out.mp3')
    ).rejects.toThrow('HTTP 404')
  })

  it('throws on 5xx response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ ok: false, status: 500 }))

    await expect(
      service.download('https://example.com/error.mp3', '/tmp/out.mp3')
    ).rejects.toThrow('HTTP 500')
  })

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'))

    await expect(
      service.download('https://example.com/down.mp3', '/tmp/out.mp3')
    ).rejects.toThrow('net::ERR_CONNECTION_REFUSED')
  })

  it('works without content-length (no progress reporting)', async () => {
    const chunk = new Uint8Array([1, 2, 3])
    const stream = createReadableStream([chunk])
    mockFetch.mockResolvedValue(createMockResponse({ body: stream, contentLength: null }))

    const progress: number[] = []
    await service.download('https://example.com/file.mp3', '/tmp/out.mp3', (pct) => {
      progress.push(pct)
    })

    expect(mockWriteStream.write).toHaveBeenCalled()
    expect(progress).toEqual([])
  })

  it('abort cancels an in-progress download', async () => {
    mockFetch.mockImplementation((_url: string, opts: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(new Error('aborted'))
        })
      })
    })

    const downloadPromise = service.download(
      'https://example.com/large.mp3',
      '/tmp/out.mp3',
      undefined,
      'ep-123'
    )

    service.abort('ep-123')

    await expect(downloadPromise).rejects.toThrow('aborted')
  })
})
