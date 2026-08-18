import { spawn, ChildProcess, execFile } from 'node:child_process'
import { DatabaseService } from './database-service'
import { resolveFFmpegBin } from './audio-preprocessor'

const MAX_STDERR_BYTES = 64 * 1024

export interface YtdlpMetadata {
  title: string
  channel: string
  duration: number
  thumbnail: string
  uploadDate: string
}

export interface YtdlpError {
  code: 'unavailable' | 'geo-restricted' | 'age-restricted' | 'extraction-failed'
  message: string
}

export interface DownloadOpts {
  customArgs?: string
  onProgress: (pct: number, speed: number, eta: number) => void
  cleanupPartialOutput?: () => void | Promise<void>
}

export type YtdlpDownloadFailureKind = 'http-403' | 'http-429' | 'network' | 'unknown'

export class YtdlpDownloadError extends Error {
  readonly details: string
  readonly kind: YtdlpDownloadFailureKind
  readonly retryable: boolean

  constructor(message: string, details: string, kind: YtdlpDownloadFailureKind, retryable: boolean) {
    super(message)
    this.name = 'YtdlpDownloadError'
    this.details = details
    this.kind = kind
    this.retryable = retryable
  }
}

export class YtdlpService {
  private db: DatabaseService
  private activeProcesses = new Map<string, ChildProcess>()
  private ffmpegPathResolver: () => string | null

  constructor(db: DatabaseService, ffmpegPathResolver: () => string | null = resolveFFmpegBin) {
    this.db = db
    this.ffmpegPathResolver = ffmpegPathResolver
  }

  async detect(): Promise<string | null> {
    const userPath = this.db.getSetting('ytdlp_path')
    if (userPath) {
      const ok = await this.canExecute(userPath)
      if (ok) return userPath
    }

    const pathResult = await this.which('yt-dlp')
    return pathResult
  }

  async fetchMetadata(url: string): Promise<YtdlpMetadata | YtdlpError> {
    const binPath = await this.detect()
    if (!binPath) {
      return { code: 'extraction-failed', message: 'yt-dlp not found' }
    }

    const customArgs = this.getCustomArgs()
    const args = [...this.ffmpegArgs(), ...customArgs, '--dump-json', url]

    try {
      const stdout = await this.execBinary(binPath, args)
      const json = JSON.parse(stdout)
      return {
        title: json.title ?? 'Untitled',
        channel: json.channel ?? json.uploader ?? 'Unknown',
        duration: json.duration ?? 0,
        thumbnail: json.thumbnail ?? '',
        uploadDate: json.upload_date ?? '',
      }
    } catch (err: any) {
      const stderr = err.stderr ?? err.message ?? ''
      const typed = this.classifyError(stderr)

      if (typed.code === 'extraction-failed') {
        const version = await this.checkVersion().catch(() => null)
        if (version && this.isStale(version)) {
          typed.message += `. Your yt-dlp may be outdated (installed: ${version}). Try: brew upgrade yt-dlp`
        }
      }

      return typed
    }
  }

  async download(url: string, outputPath: string, episodeId: string, opts: DownloadOpts): Promise<void> {
    const binPath = await this.detect()
    if (!binPath) throw new Error('yt-dlp not found')

    const customArgs = this.getCustomArgs()
    if (opts.customArgs) {
      customArgs.push(...opts.customArgs.split(/\s+/).filter(Boolean))
    }

    const args = [
      '-x',
      ...this.ffmpegArgs(),
      '--newline',
      '--progress-template',
      'download:download:{"downloaded":%(progress.downloaded_bytes)s,"total":%(progress.total_bytes)s,"speed":%(progress.speed)s,"eta":%(progress.eta)s}',
      '--progress-delta', '1',
      '-o', outputPath,
      ...customArgs,
      url,
    ]

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this.runDownloadProcess(binPath, args, episodeId, opts)
        return
      } catch (error) {
        if (!(error instanceof YtdlpDownloadError) || attempt === 1 || !error.retryable) {
          throw error
        }
        await opts.cleanupPartialOutput?.()
      }
    }
  }

  private runDownloadProcess(binPath: string, args: string[], episodeId: string, opts: DownloadOpts): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(binPath, args)
      this.activeProcesses.set(episodeId, proc)
      let stderr = Buffer.alloc(0)
      let stderrRemainder = ''
      let stdoutRemainder = ''
      let observedFailureKind: YtdlpDownloadFailureKind = 'unknown'
      let observedPermanentFailure = false

      let settled = false
      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        fn()
      }

      let stallTimer: ReturnType<typeof setTimeout> | null = null
      const resetStall = () => {
        if (stallTimer) clearTimeout(stallTimer)
        stallTimer = setTimeout(() => {
          settle(() => {
            this.activeProcesses.delete(episodeId)
            proc.kill()
            reject(failure(null, new Error('Download timed out — no data received for 30 seconds')))
          })
        }, 30_000)
      }
      resetStall()

      const parseProgressLine = (line: string) => {
        if (!line.startsWith('download:')) return false
        resetStall()
        try {
          const json = JSON.parse(line.slice('download:'.length))
          const total = json.total || 1
          const pct = Math.round((json.downloaded / total) * 100)
          opts.onProgress(pct, json.speed ?? 0, json.eta ?? 0)
        } catch {
          // ignore malformed progress lines
        }
        return true
      }

      const appendStderr = (value: string) => {
        stderr = Buffer.concat([stderr, Buffer.from(value)])
        if (stderr.byteLength > MAX_STDERR_BYTES) stderr = stderr.subarray(stderr.byteLength - MAX_STDERR_BYTES)
      }

      const observeDiagnostic = (value: string) => {
        const kind = this.failureKind(value)
        if (kind !== 'unknown') observedFailureKind = kind
        if (this.isPermanentFailure(value)) observedPermanentFailure = true
      }

      const parseStdout = (chunk: Buffer) => {
        const parts = (stdoutRemainder + chunk.toString()).split('\n')
        stdoutRemainder = parts.pop() ?? ''
        for (const line of parts) parseProgressLine(line)
      }

      const parseStderr = (chunk: Buffer) => {
        const parts = (stderrRemainder + chunk.toString()).split('\n')
        stderrRemainder = parts.pop() ?? ''
        for (const line of parts) {
          if (!parseProgressLine(line)) {
            observeDiagnostic(line)
            appendStderr(`${line}\n`)
          }
        }
      }

      const flushStderr = () => {
        if (stderrRemainder && !parseProgressLine(stderrRemainder)) {
          observeDiagnostic(stderrRemainder)
          appendStderr(stderrRemainder)
        }
        stderrRemainder = ''
      }

      const failure = (code: number | null, fallback?: Error) => {
        flushStderr()
        if (fallback) observeDiagnostic(fallback.message)
        const rawStderr = stderr.toString()
        const exit = code === null ? 'yt-dlp process failed' : `yt-dlp exited with code ${code}`
        const details = rawStderr ? `${exit}\n${rawStderr}` : `${exit}${fallback ? `\n${fallback.message}` : ''}`
        const kind = observedFailureKind === 'unknown' ? this.failureKind(details) : observedFailureKind
        const retryable = !observedPermanentFailure && kind !== 'unknown'
        return new YtdlpDownloadError(this.friendlyMessage(kind), details, kind, retryable)
      }

      proc.stdout.on('data', parseStdout)
      proc.stderr.on('data', parseStderr)

      proc.on('error', (err) => {
        if (stallTimer) clearTimeout(stallTimer)
        settle(() => {
          this.activeProcesses.delete(episodeId)
          reject(failure(null, err))
        })
      })

      proc.on('close', (code) => {
        if (stallTimer) clearTimeout(stallTimer)
        settle(() => {
          this.activeProcesses.delete(episodeId)
          if (code === 0) {
            resolve()
          } else {
            reject(failure(code))
          }
        })
      })
    })
  }

  private ffmpegArgs(): string[] {
    const ffmpegPath = this.ffmpegPathResolver()
    return ffmpegPath ? ['--ffmpeg-location', ffmpegPath] : []
  }

  private isPermanentFailure(details: string): boolean {
    return /authentication|login required|sign in|private video|video unavailable|not available in your (?:country|region)|geo.?restrict|dependency|not found|no such option|invalid (?:argument|option)|post.?process|conversion failed/i.test(details)
  }

  private failureKind(details: string): YtdlpDownloadFailureKind {
    if (/HTTP Error 403|\b403 Forbidden\b/i.test(details)) return 'http-403'
    if (/HTTP Error 429|\b429 Too Many Requests\b/i.test(details)) return 'http-429'
    if (/HTTP Error 5\d\d|\b5\d\d (?:Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)\b|ECONNRESET|connection (?:was )?(?:reset|closed|aborted)|remote end closed|premature(?:ly)? (?:closed|disconnect|end)|unexpected eof|incomplete read|network is unreachable|timed out/i.test(details)) return 'network'
    return 'unknown'
  }

  private friendlyMessage(kind: YtdlpDownloadFailureKind): string {
    if (kind === 'http-403') return 'YouTube refused the audio download. Try again later.'
    if (kind === 'http-429') return 'YouTube is temporarily limiting downloads. Try again later.'
    if (kind === 'network') return 'The download was interrupted. Check your connection and retry.'
    return 'The YouTube download failed.'
  }

  async checkVersion(): Promise<string> {
    const binPath = await this.detect()
    if (!binPath) throw new Error('yt-dlp not found')

    const stdout = await this.execBinary(binPath, ['--version'])
    return stdout.trim()
  }

  kill(episodeId: string): void {
    const proc = this.activeProcesses.get(episodeId)
    if (proc) {
      proc.kill()
      this.activeProcesses.delete(episodeId)
    }
  }

  private getCustomArgs(): string[] {
    const raw = this.db.getSetting('ytdlp_custom_args')
    if (!raw) return []
    return raw.split(/\s+/).filter(Boolean)
  }

  private classifyError(stderr: string): YtdlpError {
    if (/video is unavailable|has been removed|private video|this video is no longer available/i.test(stderr)) {
      return { code: 'unavailable', message: 'This video is private or has been deleted.' }
    }
    if (/geo.?restrict|not available in your country|blocked.*your country/i.test(stderr)) {
      return { code: 'geo-restricted', message: 'This video is not available in your region.' }
    }
    if (/age.?restrict|sign in to confirm your age|age.?gate/i.test(stderr)) {
      return { code: 'age-restricted', message: 'This video requires sign-in and cannot be imported.' }
    }
    return { code: 'extraction-failed', message: stderr.trim() || 'Extraction failed' }
  }

  private isStale(versionStr: string): boolean {
    const match = versionStr.match(/(\d{4})\.(\d{2})\.(\d{2})/)
    if (!match) return false
    const versionDate = new Date(+match[1], +match[2] - 1, +match[3])
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return versionDate < thirtyDaysAgo
  }

  private canExecute(path: string): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(path, ['--version'], (err) => {
        resolve(!err)
      })
    })
  }

  private which(binary: string): Promise<string | null> {
    return new Promise((resolve) => {
      execFile('which', [binary], (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve(null)
        } else {
          resolve(stdout.trim())
        }
      })
    })
  }

  private execBinary(binPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(binPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err: any, stdout: string, stderr: string) => {
        if (err) {
          err.stderr = err.stderr ?? stderr
          reject(err)
        } else {
          resolve(stdout)
        }
      })
    })
  }
}
