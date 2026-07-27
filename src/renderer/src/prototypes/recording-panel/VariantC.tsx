import { CheckCircle2, CircleAlert, ShieldCheck } from 'lucide-react'
import { RecordingSourceRow } from './RecordingSourceRow'
import { useRecordingPrototypeStore } from './recording-panel-prototype-store'
import { formatElapsedTime } from './prototype-utils'

// PROTOTYPE — THROWAWAY

interface ReadinessStatus {
  badge: string
  heading: string
  detail: string
  warning: boolean
}

function getReadinessStatus(
  phase: ReturnType<typeof useRecordingPrototypeStore.getState>['phase'],
  hasEnabledSource: boolean
): ReadinessStatus {
  if (phase === 'preparing') {
    return {
      badge: 'Capture complete',
      heading: 'Preparing Episode',
      detail: 'Source controls are closed while the Recorded Episode handoff begins.',
      warning: false
    }
  }
  if (phase === 'disconnected') {
    return {
      badge: 'Action needed',
      heading: 'Microphone unavailable',
      detail: 'System Audio continues while you choose another microphone.',
      warning: true
    }
  }
  if (phase === 'paused') {
    return {
      badge: 'Paused',
      heading: hasEnabledSource ? 'Capture paused' : 'No sources enabled',
      detail: hasEnabledSource
        ? 'Enabled sources and meter activity will resume with the session.'
        : 'Enable a source before resuming if you want audio to continue.',
      warning: !hasEnabledSource
    }
  }
  if (phase === 'recording') {
    return hasEnabledSource
      ? {
          badge: 'Recording',
          heading: 'Sources responding',
          detail: 'Enabled sources are active; levels indicate simulated activity.',
          warning: false
        }
      : {
          badge: 'No active source',
          heading: 'Capture has no audio source',
          detail: 'Enable System Audio or Microphone to continue capturing audio.',
          warning: true
        }
  }
  return hasEnabledSource
    ? {
        badge: 'Ready',
        heading: 'Sources ready',
        detail: 'At least one source is enabled and ready to start.',
        warning: false
      }
    : {
        badge: 'Not ready',
        heading: 'Choose a source',
        detail: 'Enable System Audio or Microphone before starting.',
        warning: true
      }
}

export function VariantC(): React.JSX.Element {
  const state = useRecordingPrototypeStore()
  const canStart =
    (state.systemAudioEnabled && !state.systemAudioPermissionDenied) ||
    (state.microphoneEnabled && !state.microphonePermissionDenied && !state.microphoneDisconnected)
  const readiness = getReadinessStatus(state.phase, canStart)
  const cancel = (): void => {
    if (window.confirm('Cancel this recording? The simulated recording will be discarded.')) state.cancel()
  }

  return (
    <main className="h-full min-h-0 overflow-y-auto px-7 pb-32 pt-8">
      <div className="recording-control-desk mx-auto grid max-w-6xl grid-cols-[minmax(250px,0.72fr)_minmax(420px,1.28fr)] gap-6">
        <section className="flex min-h-[500px] flex-col rounded-[18px] bg-[var(--surface)]/45 p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--secondary)]">Control Desk</p>
          {state.phase === 'setup' ? (
            <input value={state.title} onChange={(event) => state.setTitle(event.target.value)} aria-label="Meeting title" className="mt-3 w-full rounded-[5px] bg-transparent text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]" />
          ) : (
            <h1 className="mt-3 truncate text-xl font-semibold">{state.title}</h1>
          )}
          <div className="mt-12 font-mono text-[46px] font-medium tracking-[-0.06em]">{formatElapsedTime(state.elapsedSeconds)}</div>
          <p className="mt-2 text-sm font-medium capitalize text-[var(--secondary)]">{state.phase === 'disconnected' ? 'Recording with an issue' : state.phase}</p>

          <div className="mt-auto space-y-2 pt-10">
            {state.phase === 'setup' ? (
              <button disabled={!canStart} onClick={state.start} className="w-full rounded-[12px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Start recording</button>
            ) : state.phase !== 'preparing' ? (
              <>
                <button onClick={state.stop} className="w-full rounded-[12px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">Stop and process</button>
                <button onClick={state.phase === 'paused' ? state.resume : state.pause} className="w-full rounded-[12px] bg-[var(--bg)] px-5 py-3 text-sm font-medium">{state.phase === 'paused' ? 'Resume' : 'Pause'}</button>
                <button onClick={cancel} className="w-full px-5 py-2 text-xs font-medium text-[var(--recording-danger)]">Cancel recording…</button>
              </>
            ) : (
              <div className="rounded-[12px] bg-[var(--bg)] p-4 text-sm font-medium text-[var(--accent)]">Preparing Recorded Episode…</div>
            )}
          </div>
        </section>

        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">{state.phase === 'preparing' ? 'Episode handoff' : 'Capture controls'}</h2>
              <p className="mt-1 text-xs text-[var(--secondary)]">
                {state.phase === 'preparing'
                  ? 'Capture controls are no longer available.'
                  : 'Monitor source readiness and replace a disconnected microphone inline.'}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${readiness.warning ? 'bg-amber-500/10 text-[var(--recording-warning)]' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
              {readiness.badge}
            </span>
          </div>

          {state.phase === 'preparing' ? (
            <div className="mt-10 rounded-[16px] bg-[var(--surface)]/35 px-7 py-12 text-center">
              <CheckCircle2 className="mx-auto text-[var(--accent)]" size={26} />
              <h3 className="mt-4 text-sm font-semibold">{readiness.heading}</h3>
              <p className="mt-2 text-xs text-[var(--secondary)]">{readiness.detail}</p>
            </div>
          ) : (
            <>
              <div className="mt-8 space-y-3">
                <RecordingSourceRow kind="system" label="System Audio" detail="All eligible audio playing on this Mac" enabled={state.systemAudioEnabled} phase={state.phase} systemLocked={state.microphoneDisconnected} permissionDenied={state.systemAudioPermissionDenied} onToggle={state.setSystemAudioEnabled} onCheckPermission={() => state.setPermissionDenied('system', false)} />
                <RecordingSourceRow kind="microphone" label="Microphone Source" detail={state.microphoneName} enabled={state.microphoneEnabled} phase={state.phase} disconnected={state.microphoneDisconnected} permissionDenied={state.microphonePermissionDenied} onToggle={state.setMicrophoneEnabled} onReplace={state.replaceMicrophone} onCheckPermission={() => state.setPermissionDenied('microphone', false)} />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[12px] bg-[var(--surface)]/45 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {state.systemAudioPermissionDenied || state.microphonePermissionDenied ? <CircleAlert size={15} className="text-[var(--recording-warning)]" /> : <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />}
                    {state.systemAudioPermissionDenied || state.microphonePermissionDenied ? 'Permission attention needed' : 'Permissions granted'}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--secondary)]">Permission recovery is simulated independently in each enabled source row.</p>
                </div>
                <div className="rounded-[12px] bg-[var(--surface)]/45 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {readiness.warning ? <CircleAlert size={15} className="text-[var(--recording-warning)]" /> : <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />}
                    {readiness.heading}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--secondary)]">{readiness.detail}</p>
                </div>
              </div>

              {state.phase === 'setup' && <p className="mt-6 text-xs text-[var(--secondary)]">Consent check: tell everyone before starting the Recording Session.</p>}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
