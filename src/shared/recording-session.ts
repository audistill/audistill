export type RecordingSourceKind = 'system-audio' | 'microphone'
export type RecordingSourceReadiness = 'ready' | 'permission-not-determined' | 'denied' | 'unavailable' | 'disconnected'
export type RecordingSessionPhase = 'idle' | 'recovery' | 'setup' | 'recording' | 'paused' | 'finalizing' | 'completion-required'

export interface RecordingSource {
  id: string
  kind: RecordingSourceKind
  name: string
  detail: string
  readiness: RecordingSourceReadiness
  activity: number
}

export interface RecordingRecoveryCandidate {
  id: string
  startedAt: string
  activeDurationMs: number
  sourceKinds: RecordingSourceKind[]
  correlatedEpisodeId: string | null
}

export interface RecordingSessionState {
  phase: RecordingSessionPhase
  sessionId: string | null
  title: string
  enabledSourceKinds: RecordingSourceKind[]
  selectedMicrophoneId: string | null
  sources: RecordingSource[]
  activeDurationMs: number
  startedAt: string | null
  warnings: string[]
  startBlockedReason: string | null
  completionIssue: { message: string; canProcess: boolean } | null
  recoveryCandidate: RecordingRecoveryCandidate | null
}

export interface StartRecordingSessionInput {
  title: string
  enabledSourceKinds: RecordingSourceKind[]
  selectedMicrophoneId?: string | null
}

export interface RecordingManifestSegment {
  sourceKind: RecordingSourceKind
  path: string
  activeStartMs: number
  durationMs: number
}

export interface RecordingManifest {
  version: 1
  sessionId: string
  startedAt: string
  stoppedAt: string
  activeDurationMs: number
  sourceKinds: RecordingSourceKind[]
  segments: RecordingManifestSegment[]
  finalized: true
}

export interface StopRecordingSessionResult {
  episodeId: string
  sessionDirectory: string
}
