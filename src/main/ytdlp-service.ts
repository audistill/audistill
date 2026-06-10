import { spawn, ChildProcess, execFile } from 'node:child_process'
import { DatabaseService } from './database-service'

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
}

export class YtdlpService {
  private db: DatabaseService
  private activeProcesses = new Map<string, ChildProcess>()

  constructor(db: DatabaseService) {
    this.db = db
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
    const args = [...customArgs, '--dump-json', url]

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
      '--newline',
      '--progress-template',
      'download:{"downloaded":%(progress.downloaded_bytes)s,"total":%(progress.total_bytes)s,"speed":%(progress.speed)s,"eta":%(progress.eta)s}',
      '--progress-delta', '1',
      '-o', outputPath,
      ...customArgs,
      url,
    ]

    return new Promise((resolve, reject) => {
      const proc = spawn(binPath, args)
      this.activeProcesses.set(episodeId, proc)

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
            reject(new Error('Download timed out — no data received for 30 seconds'))
          })
        }, 30_000)
      }
      resetStall()

      const parseProgressLines = (chunk: Buffer) => {
        const lines = chunk.toString().split('\n')
        for (const line of lines) {
          if (!line.startsWith('download:')) continue
          resetStall()
          try {
            const json = JSON.parse(line.slice('download:'.length))
            const total = json.total || 1
            const pct = Math.round((json.downloaded / total) * 100)
            opts.onProgress(pct, json.speed ?? 0, json.eta ?? 0)
          } catch {
            // ignore malformed progress lines
          }
        }
      }

      proc.stdout.on('data', parseProgressLines)
      proc.stderr.on('data', parseProgressLines)

      proc.on('error', (err) => {
        if (stallTimer) clearTimeout(stallTimer)
        settle(() => {
          this.activeProcesses.delete(episodeId)
          reject(err)
        })
      })

      proc.on('close', (code) => {
        if (stallTimer) clearTimeout(stallTimer)
        settle(() => {
          this.activeProcesses.delete(episodeId)
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`yt-dlp exited with code ${code}`))
          }
        })
      })
    })
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
