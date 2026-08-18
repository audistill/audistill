import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventEmitter } from 'node:events'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/test' },
}))

let mockExecFileCalls: Array<{ file: string; args: string[] }> = []
let mockExecFileHandler: (file: string, args: string[], opts: any, cb: Function) => void = () => {}
let mockSpawnHandler: (file: string, args: string[]) => any = () => createMockProc()

vi.mock('node:child_process', () => ({
  execFile: (file: string, args: string[], ...rest: any[]) => {
    mockExecFileCalls.push({ file, args })
    const cb = typeof rest[rest.length - 1] === 'function' ? rest[rest.length - 1] : undefined
    const opts = rest.length > 1 ? rest[0] : {}
    if (cb) mockExecFileHandler(file, args, opts, cb)
  },
  spawn: (file: string, args: string[]) => {
    return mockSpawnHandler(file, args)
  },
}))

import { DatabaseService } from './database-service'
import { YtdlpService, YtdlpMetadata, YtdlpError, YtdlpDownloadError } from './ytdlp-service'

function createMockProc() {
  const proc = new EventEmitter() as any
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  proc.kill = vi.fn(() => {
    proc.emit('close', null)
  })
  return proc
}

function createTestDb(): DatabaseService {
  return new DatabaseService(':memory:')
}

describe('YtdlpService', () => {
  let db: DatabaseService
  let service: YtdlpService

  beforeEach(() => {
    db = createTestDb()
    service = new YtdlpService(db)
    mockExecFileCalls = []
    mockExecFileHandler = () => {}
    mockSpawnHandler = () => createMockProc()
  })

  describe('detect()', () => {
    it('returns user-configured path when set and executable', async () => {
      db.setSetting('ytdlp_path', '/custom/yt-dlp')
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === '/custom/yt-dlp' && args[0] === '--version') {
          cb(null, '2024.11.18', '')
        } else {
          cb(new Error('not found'))
        }
      }

      const result = await service.detect()
      expect(result).toBe('/custom/yt-dlp')
    })

    it('falls back to PATH when user path is not set', async () => {
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which' && args[0] === 'yt-dlp') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else {
          cb(new Error('not found'))
        }
      }

      const result = await service.detect()
      expect(result).toBe('/usr/local/bin/yt-dlp')
    })

    it('falls back to PATH when user path is not executable', async () => {
      db.setSetting('ytdlp_path', '/bad/path')
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === '/bad/path') {
          cb(new Error('ENOENT'))
        } else if (file === 'which' && args[0] === 'yt-dlp') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else {
          cb(new Error('not found'))
        }
      }

      const result = await service.detect()
      expect(result).toBe('/usr/local/bin/yt-dlp')
    })

    it('returns null when neither user path nor PATH has yt-dlp', async () => {
      mockExecFileHandler = (_file, _args, _opts, cb) => {
        cb(new Error('not found'))
      }

      const result = await service.detect()
      expect(result).toBeNull()
    })
  })

  describe('fetchMetadata()', () => {
    const DUMP_JSON_FIXTURE = JSON.stringify({
      title: 'My Great Video',
      channel: 'TechChannel',
      duration: 3661,
      thumbnail: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
      upload_date: '20240315',
    })

    beforeEach(() => {
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which' && args[0] === 'yt-dlp') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--dump-json')) {
          cb(null, DUMP_JSON_FIXTURE, '')
        } else if (args.includes('--version')) {
          cb(null, '2024.11.18', '')
        } else {
          cb(new Error('unknown'))
        }
      }
    })

    it('returns structured metadata for valid videos', async () => {
      const result = await service.fetchMetadata('https://www.youtube.com/watch?v=abc123')
      expect(result).toEqual({
        title: 'My Great Video',
        channel: 'TechChannel',
        duration: 3661,
        thumbnail: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
        uploadDate: '20240315',
      } satisfies YtdlpMetadata)
    })

    it('returns typed error for unavailable video', async () => {
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--dump-json')) {
          const err = new Error('exit 1') as any
          err.stderr = 'ERROR: Video unavailable. This video is no longer available'
          cb(err)
        } else if (args.includes('--version')) {
          cb(null, '2024.11.18', '')
        } else {
          cb(new Error('unknown'))
        }
      }

      const result = await service.fetchMetadata('https://www.youtube.com/watch?v=gone')
      expect((result as YtdlpError).code).toBe('unavailable')
    })

    it('returns typed error for geo-restricted video', async () => {
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--dump-json')) {
          const err = new Error('exit 1') as any
          err.stderr = 'ERROR: This content is not available in your country'
          cb(err)
        } else if (args.includes('--version')) {
          cb(null, '2024.11.18', '')
        } else {
          cb(new Error('unknown'))
        }
      }

      const result = await service.fetchMetadata('https://www.youtube.com/watch?v=geo')
      expect((result as YtdlpError).code).toBe('geo-restricted')
    })

    it('returns typed error for age-restricted video', async () => {
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--dump-json')) {
          const err = new Error('exit 1') as any
          err.stderr = 'ERROR: Sign in to confirm your age'
          cb(err)
        } else if (args.includes('--version')) {
          cb(null, '2024.11.18', '')
        } else {
          cb(new Error('unknown'))
        }
      }

      const result = await service.fetchMetadata('https://www.youtube.com/watch?v=age')
      expect((result as YtdlpError).code).toBe('age-restricted')
    })

    it('enriches extraction-failed error with upgrade suggestion when version is stale', async () => {
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--dump-json')) {
          const err = new Error('exit 1') as any
          err.stderr = 'ERROR: Unable to extract video data'
          cb(err)
        } else if (args.includes('--version')) {
          cb(null, '2023.01.01', '')
        } else {
          cb(new Error('unknown'))
        }
      }

      const result = await service.fetchMetadata('https://www.youtube.com/watch?v=old')
      const err = result as YtdlpError
      expect(err.code).toBe('extraction-failed')
      expect(err.message).toContain('brew upgrade yt-dlp')
      expect(err.message).toContain('2023.01.01')
    })

    it('does not suggest upgrade when version is recent', async () => {
      const recentDate = new Date()
      const ver = `${recentDate.getFullYear()}.${String(recentDate.getMonth() + 1).padStart(2, '0')}.${String(recentDate.getDate()).padStart(2, '0')}`

      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--dump-json')) {
          const err = new Error('exit 1') as any
          err.stderr = 'ERROR: Unable to extract video data'
          cb(err)
        } else if (args.includes('--version')) {
          cb(null, ver, '')
        } else {
          cb(new Error('unknown'))
        }
      }

      const result = await service.fetchMetadata('https://www.youtube.com/watch?v=new')
      const err = result as YtdlpError
      expect(err.code).toBe('extraction-failed')
      expect(err.message).not.toContain('brew upgrade')
    })

    it('appends custom args from settings to --dump-json command', async () => {
      db.setSetting('ytdlp_custom_args', '--cookies-from-browser chrome --no-warnings')
      let capturedArgs: string[] = []

      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--dump-json')) {
          capturedArgs = args
          cb(null, DUMP_JSON_FIXTURE, '')
        } else {
          cb(null, '2024.11.18', '')
        }
      }

      await service.fetchMetadata('https://www.youtube.com/watch?v=abc')
      expect(capturedArgs).toContain('--cookies-from-browser')
      expect(capturedArgs).toContain('chrome')
      expect(capturedArgs).toContain('--no-warnings')
      expect(capturedArgs).toContain('--ffmpeg-location')
    })
  })

  describe('download()', () => {
    let proc: ReturnType<typeof createMockProc>

    beforeEach(() => {
      proc = createMockProc()
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--version')) {
          cb(null, '2024.11.18', '')
        } else {
          cb(new Error('unknown'))
        }
      }
      mockSpawnHandler = () => proc
    })

    it('calls onProgress with correct percentages from JSON progress lines', async () => {
      const progressValues: number[] = []

      mockSpawnHandler = () => {
        queueMicrotask(() => {
          proc.stdout.emit('data', Buffer.from('download:{"downloaded":500,"total":1000,"speed":100,"eta":5}\n'))
          proc.stdout.emit('data', Buffer.from('download:{"downloaded":1000,"total":1000,"speed":100,"eta":0}\n'))
          proc.emit('close', 0)
        })
        return proc
      }

      await service.download(
        'https://www.youtube.com/watch?v=test',
        '/tmp/out.webm',
        'ep-1',
        { onProgress: (pct) => progressValues.push(pct) }
      )

      expect(progressValues).toEqual([50, 100])
    })

    it('passes Audistill bundled FFmpeg location to yt-dlp', async () => {
      let capturedArgs: string[] = []
      mockSpawnHandler = (_file, args) => {
        capturedArgs = args
        queueMicrotask(() => proc.emit('close', 0))
        return proc
      }

      await service.download('https://www.youtube.com/watch?v=test', '/tmp/out.webm', 'ep-1', { onProgress: () => {} })

      const flagIndex = capturedArgs.indexOf('--ffmpeg-location')
      expect(flagIndex).toBeGreaterThanOrEqual(0)
      expect(capturedArgs[flagIndex + 1]).toContain('ffmpeg')
      const progressTemplateIndex = capturedArgs.indexOf('--progress-template')
      expect(capturedArgs[progressTemplateIndex + 1]).toMatch(/^download:download:/)
    })

    it.each([
      ['/workspace/node_modules/ffmpeg-static/ffmpeg', 'development'],
      ['/Applications/Audistill.app/Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg', 'packaged'],
    ])('passes the resolved %s FFmpeg path', async (resolvedPath) => {
      service = new YtdlpService(db, () => resolvedPath)
      let capturedArgs: string[] = []
      mockSpawnHandler = (_file, args) => {
        capturedArgs = args
        queueMicrotask(() => proc.emit('close', 0))
        return proc
      }

      await service.download('https://www.youtube.com/watch?v=test', '/tmp/out.webm', 'ep-1', { onProgress: () => {} })

      expect(capturedArgs).toContain('--ffmpeg-location')
      expect(capturedArgs).toContain(resolvedPath)
    })

    it('also parses progress from stderr', async () => {
      const progressValues: number[] = []

      mockSpawnHandler = () => {
        queueMicrotask(() => {
          proc.stderr.emit('data', Buffer.from('download:{"downloaded":250,"total":1000,"speed":50,"eta":15}\n'))
          proc.emit('close', 0)
        })
        return proc
      }

      await service.download(
        'https://www.youtube.com/watch?v=test',
        '/tmp/out.webm',
        'ep-1',
        { onProgress: (pct) => progressValues.push(pct) }
      )

      expect(progressValues).toEqual([25])
    })

    it('kills process and throws after 30s of no progress', async () => {
      vi.useFakeTimers()
      const attempts: ReturnType<typeof createMockProc>[] = []
      mockSpawnHandler = () => {
        const attempt = createMockProc()
        attempts.push(attempt)
        return attempt
      }

      const promise = service.download(
        'https://www.youtube.com/watch?v=test',
        '/tmp/out.webm',
        'ep-1',
        { onProgress: () => {} }
      )

      // Attach rejection handler before advancing timers to avoid unhandled rejection
      const resultPromise = promise.then(
        () => { throw new Error('should have rejected') },
        (err) => err
      )

      await vi.advanceTimersByTimeAsync(60_000)

      const err = await resultPromise
      expect(err.message).toContain('download was interrupted')
      expect(attempts).toHaveLength(2)
      expect(attempts.every((attempt) => attempt.kill.mock.calls.length === 1)).toBe(true)

      vi.useRealTimers()
    })

    it('rejects on non-zero exit code', async () => {
      proc.kill = vi.fn()

      mockSpawnHandler = () => {
        queueMicrotask(() => {
          proc.emit('close', 1)
        })
        return proc
      }

      await expect(
        service.download(
          'https://www.youtube.com/watch?v=test',
          '/tmp/out.webm',
          'ep-1',
          { onProgress: () => {} }
        )
      ).rejects.toThrow('The YouTube download failed.')
    })

    it('retains only the last 64 KiB of stderr, filters progress records, and includes the exit code', async () => {
      mockSpawnHandler = () => {
        queueMicrotask(() => {
          proc.stderr.emit('data', Buffer.from(`${'x'.repeat(70 * 1024)}\n`))
          proc.stderr.emit('data', Buffer.from('download:{"downloaded":1,"total":2,"speed":1,"eta":1}\n'))
          proc.stderr.emit('data', Buffer.from('WARNING: final diagnostic\n'))
          proc.emit('close', 7)
        })
        return proc
      }

      const error = await service.download(
        'https://www.youtube.com/watch?v=test', '/tmp/out.webm', 'ep-1', { onProgress: () => {} }
      ).then(
        () => { throw new Error('expected download failure') },
        (err) => err as YtdlpDownloadError,
      )

      expect(error.details).toContain('yt-dlp exited with code 7')
      expect(error.details).toContain('WARNING: final diagnostic')
      expect(error.details).not.toContain('download:{')
      const retainedStderr = error.details.slice(error.details.indexOf('\n') + 1)
      expect(Buffer.byteLength(retainedStderr)).toBeLessThanOrEqual(64 * 1024)
    })

    it('retries when an early transient signal is no longer present in retained stderr', async () => {
      let spawnCount = 0
      const cleanup = vi.fn()
      mockSpawnHandler = () => {
        const attemptProc = createMockProc()
        spawnCount++
        queueMicrotask(() => {
          attemptProc.stderr.emit('data', Buffer.from('ERROR: HTTP Error 403: Forbidden\n'))
          attemptProc.stderr.emit('data', Buffer.from(`${'x'.repeat(70 * 1024)}\n`))
          attemptProc.emit('close', 1)
        })
        return attemptProc
      }

      const error = await service.download(
        'https://www.youtube.com/watch?v=test', '/tmp/out.webm', 'ep-early-transient',
        { onProgress: () => {}, cleanupPartialOutput: cleanup }
      ).then(
        () => { throw new Error('expected download failure') },
        (err) => err as YtdlpDownloadError,
      )

      expect(spawnCount).toBe(2)
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(error.kind).toBe('http-403')
      expect(error.details).not.toContain('HTTP Error 403')
    })

    it('does not retry when an early permanent signal is no longer present in retained stderr', async () => {
      let spawnCount = 0
      const cleanup = vi.fn()
      mockSpawnHandler = () => {
        const attemptProc = createMockProc()
        spawnCount++
        queueMicrotask(() => {
          attemptProc.stderr.emit('data', Buffer.from('ERROR: Authentication required\n'))
          attemptProc.stderr.emit('data', Buffer.from(`${'x'.repeat(70 * 1024)}\n`))
          attemptProc.stderr.emit('data', Buffer.from('ERROR: HTTP Error 503: Service Unavailable\n'))
          attemptProc.emit('close', 1)
        })
        return attemptProc
      }

      await expect(service.download(
        'https://www.youtube.com/watch?v=test', '/tmp/out.webm', 'ep-early-permanent',
        { onProgress: () => {}, cleanupPartialOutput: cleanup }
      )).rejects.toThrow('The download was interrupted.')
      expect(spawnCount).toBe(1)
      expect(cleanup).not.toHaveBeenCalled()
    })

    it.each([
      ['HTTP Error 403: Forbidden', 'YouTube refused the audio download. Try again later.'],
      ['HTTP Error 429: Too Many Requests', 'YouTube is temporarily limiting downloads. Try again later.'],
      ['HTTP Error 503: Service Unavailable', 'The download was interrupted. Check your connection and retry.'],
      ['Connection reset by peer', 'The download was interrupted. Check your connection and retry.'],
      ['Remote end closed connection prematurely', 'The download was interrupted. Check your connection and retry.'],
    ])('retries one transient failure in a fresh process: %s', async (stderr, expectedMessage) => {
      let spawnCount = 0
      const cleanup = vi.fn()
      mockSpawnHandler = () => {
        const attemptProc = createMockProc()
        spawnCount++
        queueMicrotask(() => {
          attemptProc.stderr.emit('data', Buffer.from(`${stderr}\n`))
          attemptProc.emit('close', 1)
        })
        return attemptProc
      }

      const error = await service.download(
        'https://www.youtube.com/watch?v=test', '/tmp/out.webm', 'ep-retry',
        { onProgress: () => {}, cleanupPartialOutput: cleanup }
      ).then(
        () => { throw new Error('expected download failure') },
        (err) => err as YtdlpDownloadError,
      )

      expect(spawnCount).toBe(2)
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(error.message).toBe(expectedMessage)
    })

    it.each([
      'Authentication required',
      'ERROR: Private video. Sign in if you have been granted access',
      'This video is not available in your country',
      'Dependency not found: requested executable missing',
      'Invalid argument: no such option',
      'Post-processing error: ffmpeg conversion failed',
    ])('does not retry permanent failure: %s', async (stderr) => {
      let spawnCount = 0
      const cleanup = vi.fn()
      mockSpawnHandler = () => {
        const attemptProc = createMockProc()
        spawnCount++
        queueMicrotask(() => {
          attemptProc.stderr.emit('data', Buffer.from(`${stderr}\n`))
          attemptProc.emit('close', 1)
        })
        return attemptProc
      }

      await expect(service.download(
        'https://www.youtube.com/watch?v=test', '/tmp/out.webm', 'ep-permanent',
        { onProgress: () => {}, cleanupPartialOutput: cleanup }
      )).rejects.toThrow('The YouTube download failed.')
      expect(spawnCount).toBe(1)
      expect(cleanup).not.toHaveBeenCalled()
    })

    it('appends custom args from settings and opts', async () => {
      db.setSetting('ytdlp_custom_args', '--cookies-from-browser chrome')
      let capturedArgs: string[] = []

      mockSpawnHandler = (_file, args) => {
        capturedArgs = args
        queueMicrotask(() => proc.emit('close', 0))
        return proc
      }

      await service.download(
        'https://www.youtube.com/watch?v=test',
        '/tmp/out.webm',
        'ep-1',
        { customArgs: '--no-warnings', onProgress: () => {} }
      )

      expect(capturedArgs).toContain('--cookies-from-browser')
      expect(capturedArgs).toContain('chrome')
      expect(capturedArgs).toContain('--no-warnings')
      expect(capturedArgs).toContain('-x')
      expect(capturedArgs).toContain('-o')
    })
  })

  describe('checkVersion()', () => {
    it('returns the version date string', async () => {
      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--version')) {
          cb(null, '2024.11.18\n', '')
        } else {
          cb(new Error('unknown'))
        }
      }

      const version = await service.checkVersion()
      expect(version).toBe('2024.11.18')
    })
  })

  describe('kill()', () => {
    it('terminates the running process for the given episode', async () => {
      const proc = createMockProc()
      let spawnCalled = false

      mockExecFileHandler = (file, args, _opts, cb) => {
        if (file === 'which') {
          cb(null, '/usr/local/bin/yt-dlp\n', '')
        } else if (args.includes('--version')) {
          cb(null, '2024.11.18', '')
        } else {
          cb(new Error('unknown'))
        }
      }

      mockSpawnHandler = () => {
        spawnCalled = true
        return proc
      }

      // Capture the rejection immediately so vitest doesn't flag it as unhandled
      const promise = service.download(
        'https://www.youtube.com/watch?v=test',
        '/tmp/out.webm',
        'ep-kill-test',
        { onProgress: () => {} }
      ).catch(() => {})

      await vi.waitFor(() => expect(spawnCalled).toBe(true))

      service.kill('ep-kill-test')
      expect(proc.kill).toHaveBeenCalled()

      await promise
    })

    it('does nothing for unknown episode ids', () => {
      expect(() => service.kill('nonexistent')).not.toThrow()
    })
  })
})
