import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { statfs } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { systemPreferences } from 'electron'
import type {
  RecordingCaptureBackend,
  FinalizedRecording,
} from './recording-session-coordinator'
import { readAndValidateRecordingManifest } from './recording-session-coordinator'
import type { RecordingSource, RecordingSourceKind } from '../shared/recording-session'

interface NativeBackendOptions {
  helperPath: string
  recordingsDirectory: string
}

interface HelperResponse {
  type: 'response'
  id: string
  ok: boolean
  result?: unknown
  error?: string
}

interface PendingCommand {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

const ACTIVITY_FLOOR_DB = -60
const ACTIVITY_FLOOR_LINEAR = 10 ** (ACTIVITY_FLOOR_DB / 20)

export function normalizeAudioActivityLevel(level: number): number {
  if (level <= ACTIVITY_FLOOR_LINEAR) return 0
  const decibels = 20 * Math.log10(Math.min(1, level))
  return Math.max(0, Math.min(1, (decibels - ACTIVITY_FLOOR_DB) / -ACTIVITY_FLOOR_DB))
}

export function resolveRecordingSourcePermission(
  source: RecordingSource,
  status: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown',
  permissionRequested: boolean,
): RecordingSource {
  if (status === 'granted') return source
  if (source.kind === 'system-audio' && status !== 'restricted' && !permissionRequested) {
    return { ...source, readiness: 'permission-not-determined', activity: 0 }
  }
  if (status === 'not-determined') return { ...source, readiness: 'permission-not-determined', activity: 0 }
  if (status === 'denied' || status === 'restricted') return { ...source, readiness: 'denied', activity: 0 }
  return source
}

export class NativeRecordingCaptureBackend implements RecordingCaptureBackend {
  private readonly helperPath: string
  private readonly recordingsDirectory: string
  private helper: ChildProcessWithoutNullStreams | null = null
  private readonly pending = new Map<string, PendingCommand>()
  private readonly requestedPermissions = new Set<RecordingSourceKind>()
  private sessionDirectory: string | null = null
  private activityListener: ((sourceId: string, kind: RecordingSourceKind, level: number) => void) | null = null
  private interruptionListener: ((kind: RecordingSourceKind, message: string) => void) | null = null
  private storagePressureListener: ((message: string) => void) | null = null

  constructor(options: NativeBackendOptions) {
    this.helperPath = options.helperPath
    this.recordingsDirectory = options.recordingsDirectory
  }

  onActivity(listener: (sourceId: string, kind: RecordingSourceKind, level: number) => void): void {
    this.activityListener = listener
  }

  onInterruption(listener: (kind: RecordingSourceKind, message: string) => void): void {
    this.interruptionListener = listener
  }

  onStoragePressure(listener: (message: string) => void): void {
    this.storagePressureListener = listener
  }

  async getAvailableCapacityBytes(): Promise<number> {
    mkdirSync(this.recordingsDirectory, { recursive: true })
    const stats = await statfs(this.recordingsDirectory)
    return stats.bavail * stats.bsize
  }

  async getSources(): Promise<RecordingSource[]> {
    const result = await this.sendCommand('sources')
    if (!Array.isArray(result)) throw new Error('Capture helper returned invalid sources')
    const sources = result as RecordingSource[]
    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    const microphoneStatus = systemPreferences.getMediaAccessStatus('microphone')
    return sources.map((source) => resolveRecordingSourcePermission(
      source,
      source.kind === 'system-audio' ? screenStatus : microphoneStatus,
      this.requestedPermissions.has(source.kind),
    ))
  }

  async requestPermission(kind: RecordingSourceKind): Promise<void> {
    this.requestedPermissions.add(kind)
    await this.sendCommand('request-permission', { sourceKind: kind })
  }

  async selectMicrophone(sourceId: string): Promise<void> {
    await this.sendCommand('select-microphone', { microphoneId: sourceId })
  }

  async replaceMicrophone(sourceId: string): Promise<void> {
    await this.sendCommand('replace-microphone', { microphoneId: sourceId })
  }

  async start(sessionId: string, sourceKinds: RecordingSourceKind[], selectedMicrophoneId: string | null): Promise<void> {
    this.sessionDirectory = join(this.recordingsDirectory, sessionId)
    mkdirSync(this.sessionDirectory, { recursive: true })
    await this.sendCommand('start', {
      sessionId,
      sessionDirectory: this.sessionDirectory,
      sourceKinds,
      microphoneId: selectedMicrophoneId,
    })
  }

  async pause(): Promise<void> {
    await this.sendCommand('pause')
  }

  async resume(): Promise<void> {
    await this.sendCommand('resume')
  }

  async cancel(): Promise<void> {
    const sessionDirectory = this.sessionDirectory
    try {
      if (this.helper && !this.helper.killed) await this.sendCommand('cancel')
    } finally {
      if (sessionDirectory) rmSync(sessionDirectory, { recursive: true, force: true })
      this.sessionDirectory = null
    }
  }

  async finalize(): Promise<FinalizedRecording> {
    const manifestPath = await this.sendCommand('stop')
    if (typeof manifestPath !== 'string') throw new Error('Capture helper did not finalize a manifest')
    return readAndValidateRecordingManifest(manifestPath)
  }

  releaseFinalizedRecording(): void {
    this.sessionDirectory = null
  }

  async dispose(): Promise<void> {
    const helper = this.helper
    await Promise.race([
      this.cancel().catch(() => {}),
      new Promise<void>((resolve) => setTimeout(resolve, 2_000)),
    ])
    if (helper && helper.exitCode === null) {
      helper.kill('SIGTERM')
      await Promise.race([
        new Promise<void>((resolve) => helper.once('exit', () => resolve())),
        new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
      ])
      if (helper.exitCode === null) helper.kill('SIGKILL')
    }
    this.helper = null
  }

  private sendCommand(command: string, fields: Record<string, unknown> = {}): Promise<unknown> {
    const helper = this.ensureHelper()
    const id = randomUUID()
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      helper.stdin.write(`${JSON.stringify({ id, command, ...fields })}\n`, (error) => {
        if (!error) return
        this.pending.delete(id)
        reject(error)
      })
    })
  }

  private ensureHelper(): ChildProcessWithoutNullStreams {
    if (this.helper && !this.helper.killed) return this.helper
    const helper = spawn(this.helperPath, [], { stdio: ['pipe', 'pipe', 'pipe'] })
    this.helper = helper
    const lines = createInterface({ input: helper.stdout })
    lines.on('line', (line) => this.handleLine(line))
    helper.stderr.on('data', (chunk: Buffer) => console.error(`[capture-helper] ${chunk.toString().trim()}`))
    helper.on('error', (error) => this.rejectAll(error))
    helper.on('exit', (code, signal) => {
      this.helper = null
      this.rejectAll(new Error(`Capture helper exited (${signal ?? code ?? 'unknown'})`))
    })
    return helper
  }

  private handleLine(line: string): void {
    let message: Record<string, unknown>
    try {
      message = JSON.parse(line) as Record<string, unknown>
    } catch {
      console.error('[capture-helper] Invalid JSON response')
      return
    }
    if (message.type === 'activity') {
      const sourceId = message.sourceId
      const kind = message.sourceKind
      const level = message.level
      if (typeof sourceId === 'string' && (kind === 'system-audio' || kind === 'microphone') && typeof level === 'number') {
        this.activityListener?.(sourceId, kind, normalizeAudioActivityLevel(level))
      }
      return
    }
    if (message.type === 'storage-error') {
      this.storagePressureListener?.(String(message.message ?? 'Temporary storage is full'))
      return
    }
    if (message.type === 'capture-error') {
      const kind = message.sourceKind
      const errorMessage = String(message.message ?? 'Capture failed')
      console.error(`[capture-helper] ${errorMessage}`)
      if (kind === 'system-audio' || kind === 'microphone') this.interruptionListener?.(kind, errorMessage)
      return
    }
    if (message.type !== 'response') return
    const response = message as unknown as HelperResponse
    const pending = this.pending.get(response.id)
    if (!pending) return
    this.pending.delete(response.id)
    if (response.ok) pending.resolve(response.result)
    else pending.reject(new Error(response.error ?? 'Capture helper command failed'))
  }

  private rejectAll(error: Error): void {
    for (const command of this.pending.values()) command.reject(error)
    this.pending.clear()
  }
}
