import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { DatabaseService } from './database-service'
import type {
  RecordingManifest,
  RecordingRecoveryCandidate,
  RecordingSessionPhase,
  RecordingSessionState,
  RecordingSource,
  RecordingSourceKind,
  StartRecordingSessionInput,
  StopRecordingSessionResult,
} from '../shared/recording-session'
import type { RecordingRecoveryEntry } from './recording-session-recovery'

export interface FinalizedRecording {
  manifestPath: string
  sessionDirectory: string
  manifest: RecordingManifest
}

export interface RecordingCaptureBackend {
  getSources(): Promise<RecordingSource[]>
  requestPermission?(kind: RecordingSourceKind): Promise<void>
  selectMicrophone?(sourceId: string): Promise<void>
  replaceMicrophone?(sourceId: string): Promise<void>
  start(sessionId: string, sourceKinds: RecordingSourceKind[], selectedMicrophoneId: string | null): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  finalize(): Promise<FinalizedRecording>
  cancel(): Promise<void>
  onActivity?: (listener: (sourceId: string, kind: RecordingSourceKind, level: number) => void) => void
  onInterruption?: (listener: (kind: RecordingSourceKind, message: string) => void) => void
  onStoragePressure?: (listener: (message: string) => void) => void
  getAvailableCapacityBytes?: () => Promise<number>
  releaseFinalizedRecording?: () => void
  dispose?: () => Promise<void>
}

export interface RecordingEpisodeHandoff {
  createAndEnqueue(
    recording: FinalizedRecording,
    title: string,
    options?: { recovered?: boolean; correlatedEpisodeId?: string | null },
  ): Promise<string>
  discardRecovery?(recording: FinalizedRecording, correlatedEpisodeId: string | null): Promise<void>
}

interface CoordinatorOptions {
  backend: RecordingCaptureBackend
  handoff: RecordingEpisodeHandoff
  now?: () => number
}

export const MINIMUM_RECORDING_START_CAPACITY_BYTES = 1024 * 1024 * 1024
export const CRITICAL_RECORDING_CAPACITY_BYTES = 64 * 1024 * 1024

const idleState = (): RecordingSessionState => ({
  phase: 'idle',
  sessionId: null,
  title: '',
  enabledSourceKinds: [],
  selectedMicrophoneId: null,
  sources: [],
  activeDurationMs: 0,
  startedAt: null,
  warnings: [],
  startBlockedReason: null,
  completionIssue: null,
  recoveryCandidate: null,
})

export class RecordingSessionCoordinator {
  private readonly backend: RecordingCaptureBackend
  private readonly handoff: RecordingEpisodeHandoff
  private readonly now: () => number
  private state = idleState()
  private activeStartedAt: number | null = null
  private monitorTimer: ReturnType<typeof setInterval> | null = null
  private refreshPromise: Promise<RecordingSessionState> | null = null
  private pendingFinalizedRecording: FinalizedRecording | null = null
  private storagePressureHandling = false
  private recoveryEntries: RecordingRecoveryEntry[] = []
  private readonly stateListeners = new Set<(state: RecordingSessionState) => void>()

  constructor(options: CoordinatorOptions) {
    this.backend = options.backend
    this.handoff = options.handoff
    this.now = options.now ?? Date.now
    this.backend.onActivity?.((sourceId, kind, level) => {
      this.state = {
        ...this.state,
        sources: this.state.sources.map((source) => source.id === sourceId && source.kind === kind ? { ...source, activity: level } : source),
      }
      this.emitState()
    })
    this.backend.onInterruption?.((kind, message) => { void this.handleSourceInterruption(kind, message) })
    this.backend.onStoragePressure?.((message) => { void this.handleStoragePressure(message) })
  }

  getState(): RecordingSessionState {
    return this.snapshot()
  }

  onStateChanged(listener: (state: RecordingSessionState) => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  setRecoveryEntries(entries: RecordingRecoveryEntry[]): void {
    if (this.state.phase !== 'idle') throw new Error('Recovery can only be initialized while idle')
    this.recoveryEntries = [...entries]
    this.showNextRecoveryCandidate()
  }

  async recover(): Promise<StopRecordingSessionResult> {
    if (this.state.phase !== 'recovery') throw new Error('No interrupted Recording Session is available')
    const entry = this.recoveryEntries[0]
    if (!entry) throw new Error('Recovery candidate is unavailable')
    this.state = { ...this.state, phase: 'finalizing' }
    this.emitState()
    try {
      const recording = readAndValidateRecordingManifest(entry.recording.manifestPath)
      const title = defaultRecordingTitle(recording.manifest.startedAt, this.now())
      const episodeId = await this.handoff.createAndEnqueue(recording, title, {
        recovered: true,
        correlatedEpisodeId: entry.correlatedEpisodeId,
      })
      this.recoveryEntries.shift()
      this.showNextRecoveryCandidate()
      this.emitState()
      return { episodeId, sessionDirectory: recording.sessionDirectory }
    } catch (error) {
      this.state = { ...this.state, phase: 'recovery' }
      this.emitState()
      throw error
    }
  }

  async discardRecovery(): Promise<RecordingSessionState> {
    if (this.state.phase !== 'recovery') throw new Error('No interrupted Recording Session is available')
    const entry = this.recoveryEntries[0]
    if (!entry) throw new Error('Recovery candidate is unavailable')
    this.state = { ...this.state, phase: 'finalizing' }
    this.emitState()
    try {
      await this.handoff.discardRecovery?.(entry.recording, entry.correlatedEpisodeId)
      rmSync(entry.recording.sessionDirectory, { recursive: true, force: true })
      this.recoveryEntries.shift()
      this.showNextRecoveryCandidate()
      this.emitState()
      return this.snapshot()
    } catch (error) {
      this.state = { ...this.state, phase: 'recovery' }
      this.emitState()
      throw error
    }
  }

  async open(): Promise<RecordingSessionState> {
    if (this.state.phase !== 'idle') return this.snapshot()
    const sources = await this.backend.getSources()
    const startBlockedReason = await this.capacityBlockReason()
    const selectedMicrophoneId = sources.find((source) => source.kind === 'microphone')?.id ?? null
    this.state = { ...idleState(), phase: 'setup', sources, selectedMicrophoneId, startBlockedReason }
    return this.snapshot()
  }

  async requestPermission(kind: RecordingSourceKind): Promise<RecordingSessionState> {
    if (this.state.phase !== 'setup') throw new Error('Permissions can only be requested before recording starts')
    await this.backend.requestPermission?.(kind)
    return this.refreshSources()
  }

  async selectMicrophone(sourceId: string): Promise<RecordingSessionState> {
    if (this.state.phase !== 'setup' && this.state.phase !== 'recording' && this.state.phase !== 'paused') {
      throw new Error('Microphone selection is unavailable')
    }
    const source = this.state.sources.find((candidate) => candidate.id === sourceId && candidate.kind === 'microphone')
    if (!source || source.readiness !== 'ready') throw new Error('Selected Microphone Source is not ready')
    if (this.state.phase === 'setup') await this.backend.selectMicrophone?.(sourceId)
    else await this.backend.replaceMicrophone?.(sourceId)
    this.state = {
      ...this.state,
      selectedMicrophoneId: sourceId,
      warnings: this.state.warnings.filter((warning) => !warning.toLowerCase().includes('microphone')),
      sources: this.state.sources.map((candidate) => candidate.kind === 'microphone' ? { ...candidate, activity: 0 } : candidate),
    }
    this.emitState()
    return this.snapshot()
  }

  private async handleSourceInterruption(kind: RecordingSourceKind, message: string): Promise<void> {
    if (this.state.phase !== 'recording') return
    this.state = {
      ...this.state,
      sources: this.state.sources.map((source) => source.kind === kind
        ? { ...source, readiness: 'unavailable', activity: 0, detail: message }
        : source),
    }
    const anotherReady = this.state.enabledSourceKinds.some((enabledKind) => enabledKind !== kind && this.state.sources.some((source) =>
      source.kind === enabledKind && source.readiness === 'ready',
    ))
    if (anotherReady) {
      this.state = { ...this.state, warnings: [`${kind === 'microphone' ? 'Microphone' : 'System Audio'} interrupted; remaining sources continue recording.`] }
    } else {
      const pausedAt = this.now()
      try { await this.backend.pause() } catch { /* failed sources may already be stopped */ }
      if (this.activeStartedAt !== null) {
        this.state = {
          ...this.state,
          phase: 'paused',
          activeDurationMs: this.state.activeDurationMs + pausedAt - this.activeStartedAt,
          warnings: ['Recording paused because no enabled source is available.'],
        }
        this.activeStartedAt = null
      }
    }
    this.emitState()
  }

  refreshSources(): Promise<RecordingSessionState> {
    if (this.refreshPromise) return this.refreshPromise
    this.refreshPromise = this.performSourceRefresh().finally(() => { this.refreshPromise = null })
    return this.refreshPromise
  }

  private async performSourceRefresh(): Promise<RecordingSessionState> {
    if (!isSourceRefreshPhase(this.state.phase)) return this.snapshot()
    const freshSources = await this.backend.getSources()
    let availableCapacityBytes: number | undefined
    let capacityError: string | null = null
    try {
      availableCapacityBytes = await this.backend.getAvailableCapacityBytes?.()
    } catch {
      capacityError = 'AudiStill could not verify temporary storage capacity. Check the recordings folder and try again.'
    }
    if (!isSourceRefreshPhase(this.state.phase)) return this.snapshot()
    const sourcesWithActivity = freshSources.map((source) => {
      const current = this.state.sources.find((candidate) => candidate.id === source.id && candidate.kind === source.kind)
      return source.readiness === 'ready' && current ? { ...source, activity: current.activity } : source
    })
    const selectedBefore = this.state.sources.find((source) => source.id === this.state.selectedMicrophoneId)
    const selectedStillExists = sourcesWithActivity.some((source) => source.id === this.state.selectedMicrophoneId)
    const sources = selectedBefore && !selectedStillExists
      ? [...sourcesWithActivity, { ...selectedBefore, readiness: 'disconnected' as const, activity: 0, detail: 'Microphone disconnected — choose a replacement' }]
      : sourcesWithActivity
    const failedKinds = this.state.enabledSourceKinds.filter((kind) => {
      if (kind === 'microphone') {
        return !sources.some((source) => source.id === this.state.selectedMicrophoneId && source.readiness === 'ready')
      }
      return !sources.some((source) => source.kind === kind && source.readiness === 'ready')
    })
    const warnings = failedKinds.map((kind) => kind === 'microphone'
      ? 'Microphone unavailable. Choose a replacement; remaining sources continue recording.'
      : 'System Audio unavailable; remaining sources continue recording.')

    const startBlockedReason = this.state.phase === 'setup'
      ? capacityError ?? capacityBlockReasonFor(availableCapacityBytes)
      : this.state.startBlockedReason
    this.state = { ...this.state, sources, warnings, startBlockedReason }
    if (this.state.phase === 'recording' && availableCapacityBytes !== undefined && availableCapacityBytes < CRITICAL_RECORDING_CAPACITY_BYTES) {
      await this.handleStoragePressure('Temporary storage is almost full. Recording was stopped safely.')
      return this.snapshot()
    }
    if (this.state.phase === 'recording' && failedKinds.length === this.state.enabledSourceKinds.length) {
      const pausedAt = this.now()
      try { await this.backend.pause() } catch { /* the helper may already have stopped the failed sources */ }
      if (this.activeStartedAt !== null) {
        this.state = {
          ...this.state,
          phase: 'paused',
          activeDurationMs: this.state.activeDurationMs + pausedAt - this.activeStartedAt,
          sources: this.state.sources.map((source) => ({ ...source, activity: 0 })),
          warnings: ['Recording paused because no enabled source is available.'],
        }
        this.activeStartedAt = null
      }
    }
    this.emitState()
    return this.snapshot()
  }

  async handleSystemSuspend(): Promise<void> {
    if (this.state.phase !== 'recording') return
    await this.pause()
    this.state = { ...this.state, warnings: ['Recording paused while your Mac was asleep. Check sources, then resume.'] }
    this.emitState()
  }

  async handleSystemResume(): Promise<void> {
    if (this.state.phase !== 'paused') return
    await this.refreshSources()
  }

  private async capacityBlockReason(): Promise<string | null> {
    try {
      return capacityBlockReasonFor(await this.backend.getAvailableCapacityBytes?.())
    } catch {
      return 'AudiStill could not verify temporary storage capacity. Check the recordings folder and try again.'
    }
  }

  private async handleStoragePressure(message: string): Promise<void> {
    if (this.storagePressureHandling || (this.state.phase !== 'recording' && this.state.phase !== 'paused')) return
    this.storagePressureHandling = true
    if (this.activeStartedAt !== null) {
      this.state = { ...this.state, activeDurationMs: this.state.activeDurationMs + this.now() - this.activeStartedAt }
      this.activeStartedAt = null
    }
    this.state = { ...this.state, phase: 'finalizing', warnings: [] }
    this.emitState()
    try {
      const recording = await this.backend.finalize()
      validateFinalizedRecording(recording)
      this.pendingFinalizedRecording = recording
      this.state = {
        ...this.state,
        phase: 'completion-required',
        completionIssue: { message: `${message} You can process the captured audio or discard it.`, canProcess: true },
      }
    } catch (error) {
      try { await this.backend.cancel() } catch { /* cleanup is idempotent and retried by disposal */ }
      this.pendingFinalizedRecording = null
      this.state = {
        ...this.state,
        phase: 'completion-required',
        completionIssue: {
          message: `Temporary storage filled before usable audio could be finalized. Captured artifacts were removed. ${errorMessage(error)}`,
          canProcess: false,
        },
      }
    } finally {
      this.stopMonitoring()
      this.storagePressureHandling = false
      this.emitState()
    }
  }

  async start(input: StartRecordingSessionInput): Promise<RecordingSessionState> {
    if (this.state.phase !== 'setup') throw new Error('A Recording Session is already active')
    const startBlockedReason = await this.capacityBlockReason()
    if (startBlockedReason) {
      this.state = { ...this.state, startBlockedReason }
      this.emitState()
      throw new Error(startBlockedReason)
    }
    const uniqueKinds = [...new Set(input.enabledSourceKinds)]
    if (uniqueKinds.length === 0) throw new Error('At least one ready source is required')
    const readyKinds = new Set(
      this.state.sources.filter((source) => source.readiness === 'ready').map((source) => source.kind),
    )
    if (uniqueKinds.some((kind) => !readyKinds.has(kind))) {
      throw new Error('At least one enabled source is not ready')
    }
    const selectedMicrophoneId = input.selectedMicrophoneId ?? this.state.selectedMicrophoneId
    if (uniqueKinds.includes('microphone')) {
      const selectedMicrophone = this.state.sources.find((source) => source.id === selectedMicrophoneId && source.kind === 'microphone')
      if (!selectedMicrophone || selectedMicrophone.readiness !== 'ready') {
        throw new Error('Select a ready Microphone Source')
      }
    }

    const sessionId = randomUUID()
    await this.backend.start(sessionId, uniqueKinds, selectedMicrophoneId)
    const started = this.now()
    this.activeStartedAt = started
    this.state = {
      ...this.state,
      phase: 'recording',
      sessionId,
      title: input.title.trim(),
      enabledSourceKinds: uniqueKinds,
      selectedMicrophoneId,
      activeDurationMs: 0,
      startedAt: new Date(started).toISOString(),
      warnings: [],
    }
    this.startMonitoring()
    this.emitState()
    return this.snapshot()
  }

  async pause(): Promise<RecordingSessionState> {
    if (this.state.phase !== 'recording' || this.activeStartedAt === null) {
      throw new Error('Recording Session is not recording')
    }
    await this.backend.pause()
    this.state = {
      ...this.state,
      phase: 'paused',
      activeDurationMs: this.state.activeDurationMs + this.now() - this.activeStartedAt,
      sources: this.state.sources.map((source) => ({ ...source, activity: 0 })),
    }
    this.activeStartedAt = null
    return this.snapshot()
  }

  async resume(): Promise<RecordingSessionState> {
    if (this.state.phase !== 'paused') throw new Error('Recording Session is not paused')
    await this.refreshSources()
    const enabledReady = this.state.enabledSourceKinds.some((kind) => kind === 'microphone'
      ? this.state.sources.some((source) => source.id === this.state.selectedMicrophoneId && source.readiness === 'ready')
      : this.state.sources.some((source) => source.kind === kind && source.readiness === 'ready'))
    if (!enabledReady) throw new Error('No enabled source is ready to resume')
    await this.backend.resume()
    this.activeStartedAt = this.now()
    this.state = { ...this.state, phase: 'recording', warnings: [] }
    return this.snapshot()
  }

  async cancel(): Promise<RecordingSessionState> {
    if (this.state.phase !== 'recording' && this.state.phase !== 'paused' && this.state.phase !== 'completion-required') {
      throw new Error('Recording Session cannot be cancelled')
    }
    this.state = { ...this.state, phase: 'finalizing', completionIssue: null }
    this.emitState()
    try {
      await this.backend.cancel()
    } finally {
      if (this.pendingFinalizedRecording) {
        rmSync(this.pendingFinalizedRecording.sessionDirectory, { recursive: true, force: true })
      }
      this.pendingFinalizedRecording = null
    }
    this.stopMonitoring()
    this.activeStartedAt = null
    this.state = idleState()
    this.emitState()
    return this.snapshot()
  }

  async stop(): Promise<StopRecordingSessionResult> {
    const canRetryCompletion = this.state.phase === 'completion-required' && this.state.completionIssue?.canProcess === true
    if (this.state.phase !== 'recording' && this.state.phase !== 'paused' && !canRetryCompletion) {
      throw new Error('Recording Session cannot be stopped')
    }
    if (this.activeStartedAt !== null) {
      this.state = {
        ...this.state,
        activeDurationMs: this.state.activeDurationMs + this.now() - this.activeStartedAt,
      }
      this.activeStartedAt = null
    }
    this.state = { ...this.state, phase: 'finalizing', completionIssue: null }
    this.emitState()

    let recording = this.pendingFinalizedRecording
    try {
      if (!recording) {
        recording = await this.backend.finalize()
        validateFinalizedRecording(recording)
        this.pendingFinalizedRecording = recording
      }
      const title = this.state.title || defaultRecordingTitle(this.state.startedAt, this.now())
      const episodeId = await this.handoff.createAndEnqueue(recording, title)
      this.backend.releaseFinalizedRecording?.()
      this.pendingFinalizedRecording = null
      this.stopMonitoring()
      this.state = idleState()
      this.emitState()
      return { episodeId, sessionDirectory: recording.sessionDirectory }
    } catch (error) {
      if (recording) {
        this.pendingFinalizedRecording = recording
        this.state = {
          ...this.state,
          phase: 'completion-required',
          completionIssue: { message: `The recording was finalized but could not be handed off. ${errorMessage(error)}`, canProcess: true },
        }
      } else {
        try { await this.backend.cancel() } catch { /* cleanup is retried by disposal */ }
        this.state = {
          ...this.state,
          phase: 'completion-required',
          completionIssue: { message: `The recording could not be finalized and unusable artifacts were removed. ${errorMessage(error)}`, canProcess: false },
        }
      }
      this.stopMonitoring()
      this.emitState()
      throw error
    }
  }

  waitUntilSettled(): Promise<RecordingSessionState> {
    if (this.state.phase !== 'finalizing') return Promise.resolve(this.snapshot())
    return new Promise((resolve) => {
      const unsubscribe = this.onStateChanged((state) => {
        if (state.phase === 'finalizing') return
        unsubscribe()
        resolve(state)
      })
    })
  }

  async dispose(): Promise<void> {
    this.stopMonitoring()
    await this.backend.dispose?.()
  }

  private startMonitoring(): void {
    if (this.monitorTimer) return
    this.monitorTimer = setInterval(() => { void this.refreshSources().catch(() => {}) }, 2_000)
    this.monitorTimer.unref?.()
  }

  private stopMonitoring(): void {
    if (!this.monitorTimer) return
    clearInterval(this.monitorTimer)
    this.monitorTimer = null
  }

  private showNextRecoveryCandidate(): void {
    const entry = this.recoveryEntries[0]
    if (!entry) {
      this.state = idleState()
      return
    }
    const manifest = entry.recording.manifest
    const candidate: RecordingRecoveryCandidate = {
      id: entry.id,
      startedAt: manifest.startedAt,
      activeDurationMs: manifest.activeDurationMs,
      sourceKinds: [...manifest.sourceKinds],
      correlatedEpisodeId: entry.correlatedEpisodeId,
    }
    this.state = { ...idleState(), phase: 'recovery', recoveryCandidate: candidate }
  }

  private emitState(): void {
    const state = this.snapshot()
    for (const listener of this.stateListeners) listener(state)
  }

  private snapshot(): RecordingSessionState {
    const activeDurationMs = this.activeStartedAt === null
      ? this.state.activeDurationMs
      : this.state.activeDurationMs + this.now() - this.activeStartedAt
    return {
      ...this.state,
      activeDurationMs,
      enabledSourceKinds: [...this.state.enabledSourceKinds],
      sources: this.state.sources.map((source) => ({ ...source })),
    }
  }
}

interface FakeBackendOptions {
  recordingsDirectory: string
  now?: () => number
  availableCapacityBytes?: () => number
  allowFakeCapture: boolean
}

export class DevelopmentFakeCaptureBackend implements RecordingCaptureBackend {
  private readonly recordingsDirectory: string
  private readonly now: () => number
  private readonly availableCapacityBytes: () => number
  private sessionId: string | null = null
  private sourceKinds: RecordingSourceKind[] = []
  private startedAt = 0
  private activeStartedAt: number | null = null
  private activeDurationMs = 0

  constructor(options: FakeBackendOptions) {
    if (!options.allowFakeCapture) throw new Error('Fake recording capture is development/test-only')
    this.recordingsDirectory = options.recordingsDirectory
    this.now = options.now ?? Date.now
    this.availableCapacityBytes = options.availableCapacityBytes ?? (() => Number.MAX_SAFE_INTEGER)
  }

  async getAvailableCapacityBytes(): Promise<number> {
    return this.availableCapacityBytes()
  }

  async getSources(): Promise<RecordingSource[]> {
    return [
      { id: 'system-audio', kind: 'system-audio', name: 'System Audio', detail: 'Audio playing on this Mac', readiness: 'ready', activity: 0.62 },
      { id: 'development-microphone', kind: 'microphone', name: 'Microphone Source', detail: 'Development microphone', readiness: 'ready', activity: 0.46 },
    ]
  }

  async start(sessionId: string, sourceKinds: RecordingSourceKind[], _selectedMicrophoneId: string | null): Promise<void> {
    if (this.sessionId) throw new Error('Fake capture already has an active Recording Session')
    this.sessionId = sessionId
    this.sourceKinds = [...sourceKinds]
    this.startedAt = this.now()
    this.activeStartedAt = this.startedAt
    this.activeDurationMs = 0
    mkdirSync(join(this.recordingsDirectory, sessionId), { recursive: true })
  }

  async pause(): Promise<void> {
    if (this.activeStartedAt === null) throw new Error('Fake capture is not recording')
    this.activeDurationMs += this.now() - this.activeStartedAt
    this.activeStartedAt = null
  }

  async resume(): Promise<void> {
    if (!this.sessionId || this.activeStartedAt !== null) throw new Error('Fake capture is not paused')
    this.activeStartedAt = this.now()
  }

  async cancel(): Promise<void> {
    if (!this.sessionId) return
    rmSync(join(this.recordingsDirectory, this.sessionId), { recursive: true, force: true })
    this.sessionId = null
    this.sourceKinds = []
    this.activeStartedAt = null
    this.activeDurationMs = 0
  }

  async finalize(): Promise<FinalizedRecording> {
    if (!this.sessionId) throw new Error('No fake capture is active')
    if (this.activeStartedAt !== null) {
      this.activeDurationMs += this.now() - this.activeStartedAt
      this.activeStartedAt = null
    }

    const sessionId = this.sessionId
    const sessionDirectory = join(this.recordingsDirectory, sessionId)
    const audioPath = join(sessionDirectory, 'capture.wav')
    writeSilentWave(audioPath, Math.max(100, this.activeDurationMs))
    const manifest: RecordingManifest = {
      version: 1,
      sessionId,
      startedAt: new Date(this.startedAt).toISOString(),
      stoppedAt: new Date(this.now()).toISOString(),
      activeDurationMs: this.activeDurationMs,
      sourceKinds: [...this.sourceKinds],
      segments: this.sourceKinds.map((sourceKind) => ({
        sourceKind,
        path: 'capture.wav',
        activeStartMs: 0,
        durationMs: this.activeDurationMs,
      })),
      finalized: true,
    }
    const manifestPath = join(sessionDirectory, 'manifest.json')
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
    this.sessionId = null
    this.sourceKinds = []
    return { manifestPath, sessionDirectory, manifest }
  }
}

interface HandoffOptions {
  db: DatabaseService
  enqueue: (episodeId: string) => Promise<void> | void
}

export class RecordedEpisodeHandoff implements RecordingEpisodeHandoff {
  private readonly db: DatabaseService
  private readonly enqueue: (episodeId: string) => Promise<void> | void

  constructor(options: HandoffOptions) {
    this.db = options.db
    this.enqueue = options.enqueue
  }

  async createAndEnqueue(
    recording: FinalizedRecording,
    title: string,
    options: { recovered?: boolean; correlatedEpisodeId?: string | null } = {},
  ): Promise<string> {
    validateFinalizedRecording(recording)
    const manifest = recording.manifest
    const existing = options.correlatedEpisodeId
      ? this.db.getEpisode(options.correlatedEpisodeId)
      : this.db.getEpisodes().find((episode) => episode.source_type === 'recorded' && (
          episode.file_path === recording.manifestPath || recordedCaptureMatches(episode.source_meta, manifest)
        ))
    if (existing) {
      if (!existing.transcript) {
        this.db.updateEpisode(existing.id, {
          file_path: recording.manifestPath,
          status: 'queued',
          error_message: null,
          source_meta: recoveredSourceMeta(existing.source_meta, options.recovered === true),
        })
        await this.enqueue(existing.id)
      }
      return existing.id
    }
    const episodeId = this.db.createEpisode({
      title,
      file_path: recording.manifestPath,
      duration_sec: Math.round(manifest.activeDurationMs / 1000),
      source_type: 'recorded',
      source_meta: JSON.stringify({
        schemaVersion: manifest.version,
        recordedAt: manifest.startedAt,
        stoppedAt: manifest.stoppedAt,
        activeDurationMs: manifest.activeDurationMs,
        wallDurationMs: Date.parse(manifest.stoppedAt) - Date.parse(manifest.startedAt),
        sources: {
          systemAudio: manifest.sourceKinds.includes('system-audio'),
          microphone: manifest.sourceKinds.includes('microphone'),
        },
        recovered: options.recovered === true,
        captureVersion: String(manifest.version),
      }),
      status: 'queued',
    })
    await this.enqueue(episodeId)

    const committed = this.db.getEpisode(episodeId)
    if (committed?.transcript && committed.file_path === null) {
      try { rmSync(recording.sessionDirectory, { recursive: true, force: true }) } catch { /* startup reconciliation retries housekeeping */ }
    }
    return episodeId
  }

  async discardRecovery(recording: FinalizedRecording, correlatedEpisodeId: string | null): Promise<void> {
    if (correlatedEpisodeId) {
      const episode = this.db.getEpisode(correlatedEpisodeId)
      this.db.updateEpisode(correlatedEpisodeId, {
        file_path: null,
        status: 'cancelled',
        error_message: 'Interrupted recording was discarded.',
        source_meta: discardedSourceMeta(episode?.source_meta ?? null),
      })
    }
    rmSync(recording.sessionDirectory, { recursive: true, force: true })
  }
}

export function readAndValidateRecordingManifest(manifestPath: string): FinalizedRecording {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RecordingManifest
  const recording = { manifestPath, sessionDirectory: dirname(manifestPath), manifest }
  validateFinalizedRecording(recording)
  return recording
}

export function validateFinalizedRecording(recording: FinalizedRecording): void {
  const { manifest, sessionDirectory, manifestPath } = recording
  if (manifest.version !== 1 || manifest.finalized !== true) throw new Error('Unsupported or unfinalized recording manifest')
  if (!manifest.sessionId || manifest.sourceKinds.length === 0 || manifest.segments.length === 0) {
    throw new Error('Recording manifest is incomplete')
  }
  const startedAt = Date.parse(manifest.startedAt)
  const stoppedAt = Date.parse(manifest.stoppedAt)
  if (!Number.isFinite(startedAt) || !Number.isFinite(stoppedAt) || stoppedAt < startedAt) {
    throw new Error('Recording timestamps are invalid')
  }
  if (!Number.isFinite(manifest.activeDurationMs) || manifest.activeDurationMs <= 0 || manifest.activeDurationMs > stoppedAt - startedAt + 1_000) {
    throw new Error('Recording duration is invalid')
  }
  assertContained(sessionDirectory, manifestPath)
  const sourceEnds = new Map<RecordingSourceKind, number>()
  for (const segment of manifest.segments) {
    if (isAbsolute(segment.path)) throw new Error('Recording segment path must be relative')
    assertContained(sessionDirectory, resolve(sessionDirectory, segment.path))
    if (!manifest.sourceKinds.includes(segment.sourceKind)) throw new Error('Recording segment source is invalid')
    const priorEnd = sourceEnds.get(segment.sourceKind) ?? 0
    const segmentEnd = segment.activeStartMs + segment.durationMs
    if (segment.activeStartMs < priorEnd || segment.durationMs <= 0 || segmentEnd > manifest.activeDurationMs + 1_000) {
      throw new Error('Recording segment timing is invalid')
    }
    sourceEnds.set(segment.sourceKind, segmentEnd)
    const segmentPath = resolve(sessionDirectory, segment.path)
    if (!existsSync(segmentPath) || statSync(segmentPath).size <= 44) {
      throw new Error('Recording segment is missing or corrupt')
    }
    const descriptor = openSync(segmentPath, 'r')
    const header = Buffer.alloc(4)
    try {
      readSync(descriptor, header, 0, header.length, 0)
    } finally {
      closeSync(descriptor)
    }
    const signature = header.toString('ascii')
    if (signature !== 'RIFF' && signature !== 'caff') throw new Error('Recording segment media is unsupported')
  }
  const capturedEnd = Math.max(...sourceEnds.values())
  if (Math.abs(capturedEnd - manifest.activeDurationMs) > 1_000) {
    throw new Error('Recording manifest duration does not match its segments')
  }
}

function recordedCaptureMatches(sourceMeta: string | null, manifest: RecordingManifest): boolean {
  if (!sourceMeta) return false
  try {
    const parsed = JSON.parse(sourceMeta) as { captureSessionId?: unknown; recordedAt?: unknown }
    if (typeof parsed.captureSessionId === 'string') return parsed.captureSessionId === manifest.sessionId
    return parsed.recordedAt === manifest.startedAt
  } catch {
    return false
  }
}

function discardedSourceMeta(sourceMeta: string | null): string | null {
  if (!sourceMeta) return sourceMeta
  try {
    const parsed = JSON.parse(sourceMeta) as Record<string, unknown>
    return JSON.stringify({ ...parsed, recordingDiscarded: true })
  } catch {
    return sourceMeta
  }
}

function recoveredSourceMeta(sourceMeta: string | null, recovered: boolean): string | null {
  if (!sourceMeta || !recovered) return sourceMeta
  try {
    const parsed = JSON.parse(sourceMeta) as Record<string, unknown>
    return JSON.stringify({ ...parsed, recovered: true })
  } catch {
    return sourceMeta
  }
}

function capacityBlockReasonFor(availableCapacityBytes: number | undefined): string | null {
  if (availableCapacityBytes === undefined || availableCapacityBytes >= MINIMUM_RECORDING_START_CAPACITY_BYTES) return null
  return 'Recording needs at least 1 GB of free temporary storage. Free space, then try again.'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isSourceRefreshPhase(phase: RecordingSessionPhase): boolean {
  return phase === 'setup' || phase === 'recording' || phase === 'paused'
}

function assertContained(directory: string, candidate: string): void {
  const pathFromDirectory = relative(resolve(directory), resolve(candidate))
  if (pathFromDirectory.startsWith('..') || isAbsolute(pathFromDirectory)) {
    throw new Error('Recording manifest path escapes its session directory')
  }
}

function defaultRecordingTitle(startedAt: string | null, now: number): string {
  return `Recording — ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(startedAt ?? now))}`
}

function writeSilentWave(path: string, durationMs: number): void {
  const sampleRate = 16_000
  const sampleCount = Math.ceil(sampleRate * durationMs / 1000)
  const dataSize = sampleCount * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  writeFileSync(path, buffer)
}
