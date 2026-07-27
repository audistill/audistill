import { LoaderCircle, Mic, MonitorSpeaker } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type {
  RecordingSessionState,
  RecordingSource,
  RecordingSourceKind,
} from '../../../shared/recording-session'
import { useAppStore, type Episode } from '../store/app-store'
import { formatElapsed } from '../lib/format-elapsed'

const EMPTY_STATE: RecordingSessionState = {
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
}

export function RecordingWorkspace(): React.JSX.Element {
  const [state, setState] = useState(EMPTY_STATE)
  const [title, setTitle] = useState('')
  const [enabledKinds, setEnabledKinds] = useState<RecordingSourceKind[]>(['system-audio', 'microphone'])
  const [error, setError] = useState<string | null>(null)
  const replaceWorkspace = useAppStore((store) => store.replaceRecordingWorkspace)
  const closeWorkspace = useAppStore((store) => store.closeRecordingWorkspace)

  useEffect(() => {
    let mounted = true
    const applyState = (next: RecordingSessionState): void => {
      if (!mounted) return
      setState(next)
      if (next.phase !== 'setup') {
        setTitle(next.title)
        setEnabledKinds(next.enabledSourceKinds)
      }
    }
    window.api.recordingSession.getState().then(applyState)
    const unsubscribe = window.api.recordingSession.onStateChanged(applyState)
    const timer = window.setInterval(() => {
      window.api.recordingSession.refreshSources().then(applyState).catch(() => {
        window.api.recordingSession.getState().then(applyState).catch(() => {})
      })
    }, 1_000)
    return () => {
      mounted = false
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (state.phase === 'setup') {
      setEnabledKinds([...new Set(
        state.sources.filter((source) => source.readiness === 'ready').map((source) => source.kind),
      )])
    }
  }, [state.phase])

  const microphoneSources = state.sources.filter((source) => source.kind === 'microphone')
  const visibleSources = state.sources.filter((source) =>
    source.kind === 'system-audio' || source.id === state.selectedMicrophoneId,
  )
  const canStart = useMemo(() => !state.startBlockedReason && enabledKinds.length > 0 && enabledKinds.every((kind) =>
    state.sources.some((source) => source.kind === kind && source.readiness === 'ready' && (
      kind !== 'microphone' || source.id === state.selectedMicrophoneId
    )),
  ), [enabledKinds, state.selectedMicrophoneId, state.sources, state.startBlockedReason])

  const toggleSource = (kind: RecordingSourceKind): void => {
    setEnabledKinds((current) => {
      if (!current.includes(kind)) return [...current, kind]
      if (current.length === 1) return current
      return current.filter((item) => item !== kind)
    })
  }

  const run = async (action: () => Promise<RecordingSessionState>): Promise<void> => {
    setError(null)
    try {
      setState(await action())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const cancel = async (): Promise<void> => {
    const needsConfirmation = state.completionIssue?.canProcess !== false
    if (needsConfirmation) {
      const confirmed = window.confirm('Discard this recording? Captured audio will be permanently deleted and no Episode will be created.')
      if (!confirmed) return
    }
    setError(null)
    try {
      await window.api.recordingSession.cancel()
      closeWorkspace()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const recover = async (): Promise<void> => {
    setError(null)
    try {
      const result = await window.api.recordingSession.recover()
      const episode = await window.api.getEpisode(result.episodeId)
      if (!episode) throw new Error('Recovered Episode was not created')
      const next = await window.api.recordingSession.getState()
      if (next.phase === 'recovery') setState(next)
      else replaceWorkspace({ ...episode, is_starred: episode.is_starred === 1 } as Episode)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const discardRecovery = async (): Promise<void> => {
    const confirmed = window.confirm('Discard this interrupted recording? Captured audio will be permanently deleted.')
    if (!confirmed) return
    setError(null)
    try {
      const next = await window.api.recordingSession.discardRecovery()
      setState(next)
      if (next.phase === 'idle') closeWorkspace()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const stop = async (): Promise<void> => {
    setError(null)
    try {
      const result = await window.api.recordingSession.stop()
      const episode = await window.api.getEpisode(result.episodeId)
      if (!episode) throw new Error('Recorded Episode was not created')
      replaceWorkspace({ ...episode, is_starred: episode.is_starred === 1 } as Episode)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const phaseLabel = state.phase === 'recovery'
    ? 'Recovery available'
    : state.phase === 'setup'
    ? 'Ready to start'
    : state.phase === 'recording'
      ? 'Recording now'
      : state.phase === 'paused'
        ? 'Recording paused'
        : state.phase === 'completion-required'
          ? 'Action required'
          : 'Preparing Episode'

  return (
    <main className="recording-workspace flex h-full min-h-0 flex-1 justify-center overflow-y-auto px-6 pb-32 pt-14">
      <section className="w-full max-w-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--secondary)]">Recording Session</p>
        {state.recoveryCandidate ? (
          <h1 className="mt-2 truncate text-2xl font-semibold text-[var(--text)]">Interrupted recording</h1>
        ) : state.phase === 'setup' ? (
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Recording title"
            className="mt-2 w-full rounded-[5px] bg-transparent text-2xl font-semibold text-[var(--text)] outline-none placeholder:text-[var(--secondary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            placeholder="Optional title"
          />
        ) : (
          <h1 className="mt-2 truncate text-2xl font-semibold text-[var(--text)]">{title || 'Untitled recording'}</h1>
        )}

        <div className="py-10 text-center">
          <div className="font-mono text-[52px] font-medium leading-none tracking-[-0.06em] text-[var(--text)]">
            {formatElapsed(state.recoveryCandidate?.activeDurationMs ?? state.activeDurationMs)}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-[var(--secondary)]">
            {state.phase === 'recording' && <span className="h-2 w-2 rounded-full bg-[#dc5a55]" />}
            {phaseLabel}
          </div>
        </div>

        {state.phase === 'recovery' && state.recoveryCandidate ? (
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)]/40 px-6 py-6 text-sm">
            <p className="font-medium">Captured {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.recoveryCandidate.startedAt))}</p>
            <p className="mt-2 text-[var(--secondary)]">
              Sources: {state.recoveryCandidate.sourceKinds.map(sourceKindLabel).join(' and ')}
            </p>
            <p className="mt-3 text-[var(--secondary)]">AudiStill found usable temporary audio from an interrupted Recording Session.</p>
          </div>
        ) : state.phase === 'finalizing' ? (
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)]/40 px-6 py-8 text-center">
            <LoaderCircle className="recording-spinner mx-auto text-[var(--accent)]" size={25} />
            <p className="mt-4 text-sm font-medium">Preparing your Recorded Episode…</p>
          </div>
        ) : state.phase === 'completion-required' ? (
          <div role="alert" className="rounded-[16px] border border-amber-500/30 bg-amber-500/10 px-6 py-6 text-center text-sm text-amber-700 dark:text-amber-300">
            {state.completionIssue?.message}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleSources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                microphoneSources={source.kind === 'microphone' ? microphoneSources : []}
                enabled={enabledKinds.includes(source.kind)}
                locked={state.phase !== 'setup'}
                selectionLocked={state.phase !== 'setup' && source.readiness !== 'disconnected'}
                active={state.phase === 'setup' || state.phase === 'recording'}
                onMicrophoneSelect={(sourceId) => run(() => window.api.recordingSession.selectMicrophone(sourceId))}
                onRequestPermission={() => run(() => window.api.recordingSession.requestPermission(source.kind))}
                onOpenSettings={() => window.api.recordingSession.openSettings(source.kind)}
                onToggle={() => toggleSource(source.kind)}
              />
            ))}
          </div>
        )}

        {state.warnings.map((warning) => (
          <p key={warning} role="status" className="mt-4 rounded-[10px] bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-600 dark:text-amber-400">{warning}</p>
        ))}
        {state.startBlockedReason && state.phase === 'setup' && (
          <p role="alert" className="mt-4 text-center text-sm text-[#dc5a55]">{state.startBlockedReason}</p>
        )}
        {error && <p role="alert" className="mt-4 text-center text-sm text-[#dc5a55]">{error}</p>}
        {state.phase === 'recovery' ? (
          <div className="mt-7 flex items-center justify-center gap-3 border-t border-[var(--border)] pt-6">
            <button type="button" onClick={discardRecovery} className="rounded-[12px] px-4 py-2.5 text-sm font-medium text-[var(--secondary)] hover:bg-[var(--surface)]">
              Discard
            </button>
            <button type="button" onClick={recover} className="rounded-[12px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white">
              Recover and process
            </button>
          </div>
        ) : state.phase === 'setup' ? (
          <div className="mt-7 text-center">
            <button
              type="button"
              disabled={!canStart}
              onClick={() => run(() => window.api.recordingSession.start({
                title,
                enabledSourceKinds: enabledKinds,
                selectedMicrophoneId: state.selectedMicrophoneId,
              }))}
              className="rounded-[12px] bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start recording
            </button>
            <p className="mt-3 text-xs text-[var(--secondary)]">Make sure everyone knows this meeting is being recorded.</p>
          </div>
        ) : state.phase === 'completion-required' ? (
          <div className="mt-7 flex items-center justify-center gap-3 border-t border-[var(--border)] pt-6">
            <button type="button" onClick={cancel} className="rounded-[12px] px-4 py-2.5 text-sm font-medium text-[var(--secondary)] hover:bg-[var(--surface)]">
              {state.completionIssue?.canProcess ? 'Discard' : 'Close'}
            </button>
            {state.completionIssue?.canProcess && (
              <button type="button" onClick={stop} className="rounded-[12px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white">
                Process captured audio
              </button>
            )}
          </div>
        ) : (state.phase === 'recording' || state.phase === 'paused') ? (
          <div className="mt-7 flex items-center justify-center gap-3 border-t border-[var(--border)] pt-6">
            <button
              type="button"
              onClick={cancel}
              className="rounded-[12px] px-4 py-2.5 text-sm font-medium text-[var(--secondary)] hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => run(state.phase === 'paused' ? window.api.recordingSession.resume : window.api.recordingSession.pause)}
              className="rounded-[12px] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium"
            >
              {state.phase === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={stop} className="rounded-[12px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white">
              Stop and process
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}

function SourceRow({
  source,
  enabled,
  locked,
  selectionLocked,
  active,
  microphoneSources,
  onMicrophoneSelect,
  onRequestPermission,
  onOpenSettings,
  onToggle,
}: {
  source: RecordingSource
  enabled: boolean
  locked: boolean
  selectionLocked: boolean
  active: boolean
  microphoneSources: RecordingSource[]
  onMicrophoneSelect: (sourceId: string) => void
  onRequestPermission: () => void
  onOpenSettings: () => void
  onToggle: () => void
}): React.JSX.Element {
  const Icon = source.kind === 'system-audio' ? MonitorSpeaker : Mic
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface)] text-[var(--secondary)]">
        <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {microphoneSources.length > 0 && !selectionLocked ? (
            <select
              aria-label="Microphone Source"
              value={source.id}
              onChange={(event) => onMicrophoneSelect(event.target.value)}
              className="min-w-0 max-w-[260px] truncate rounded bg-transparent text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              {microphoneSources.map((microphone) => <option key={microphone.id} value={microphone.id}>{microphone.name}</option>)}
            </select>
          ) : (
            <span className="truncate text-sm font-medium">{source.name}</span>
          )}
          <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${source.readiness === 'ready' && enabled ? 'text-emerald-500' : 'text-[var(--secondary)]'}`}>
            {source.readiness === 'ready' ? (enabled ? 'Ready' : 'Off') : readinessLabel(source.readiness)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--secondary)]">{source.detail}</p>
      </div>
      {enabled && source.readiness === 'permission-not-determined' && !locked && (
        <button type="button" onClick={onRequestPermission} className="shrink-0 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium">Allow access</button>
      )}
      {source.readiness === 'denied' && (
        <button type="button" onClick={onOpenSettings} className="shrink-0 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium">Open Settings</button>
      )}
      <div className={`recording-meter flex h-7 w-12 shrink-0 items-end justify-center gap-[3px] ${active && enabled && source.readiness === 'ready' ? '' : 'recording-meter-idle'}`} aria-label={active && enabled ? 'Signal active' : 'Signal inactive'}>
        {[45, 75, 100, 65, 40].map((height, index) => (
          <span
            key={`${height}-${index}`}
            className="recording-meter-bar w-[3px] rounded-full bg-[var(--accent)]"
            style={{ height: `${height * Math.max(0.12, source.activity)}%` }}
          />
        ))}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${enabled ? 'Turn off' : 'Turn on'} ${source.name}`}
        disabled={locked}
        onClick={onToggle}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
      >
        <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function sourceKindLabel(kind: RecordingSourceKind): string {
  return kind === 'system-audio' ? 'System Audio' : 'Microphone'
}

function readinessLabel(readiness: RecordingSource['readiness']): string {
  switch (readiness) {
    case 'ready': return 'Ready'
    case 'permission-not-determined': return 'Permission needed'
    case 'denied': return 'Access denied'
    case 'disconnected': return 'Disconnected'
    case 'unavailable': return 'Unavailable'
  }
}
