import { FileAudio, LoaderCircle } from 'lucide-react'
import { RecordingSourceRow } from './RecordingSourceRow'
import { useRecordingPrototypeStore } from './recording-panel-prototype-store'
import { formatElapsedTime } from './prototype-utils'

// PROTOTYPE — THROWAWAY

export function VariantB(): React.JSX.Element {
  const state = useRecordingPrototypeStore()
  const canStart =
    (state.systemAudioEnabled && !state.systemAudioPermissionDenied) ||
    (state.microphoneEnabled && !state.microphonePermissionDenied && !state.microphoneDisconnected)
  const phaseLabel = state.phase === 'disconnected' ? 'Microphone disconnected' : state.phase
  const cancel = (): void => {
    if (window.confirm('Cancel this recording? The simulated recording will be discarded.')) state.cancel()
  }

  return (
    <main className="h-full min-h-0 overflow-y-auto pb-32">
      <header className="border-b border-[var(--border)] bg-[var(--bg)] px-7 py-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--accent-bg)] text-[var(--accent)]">
              <FileAudio size={18} />
            </span>
            <div className="min-w-0">
              {state.phase === 'setup' ? (
                <input
                  value={state.title}
                  onChange={(event) => state.setTitle(event.target.value)}
                  aria-label="Meeting title"
                  className="w-full rounded-[5px] bg-transparent text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                />
              ) : (
                <h1 className="truncate text-lg font-semibold">{state.title}</h1>
              )}
              <span className="mt-1 inline-flex rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--secondary)]">
                Recorded
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-xl font-medium">{formatElapsedTime(state.elapsedSeconds)}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--secondary)]">
              {phaseLabel}
            </p>
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--border)] bg-[var(--surface)]/20">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-8 py-3">
          <p className="text-xs text-[var(--secondary)]">
            {state.phase === 'setup'
              ? 'Choose what this Episode will capture.'
              : state.phase === 'preparing'
                ? 'Capture is complete and handing off to the Episode.'
                : 'Capture stays active while you move around AudiStill.'}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {state.phase === 'setup' ? (
              <button disabled={!canStart} onClick={state.start} className="rounded-[10px] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                Start recording
              </button>
            ) : state.phase !== 'preparing' ? (
              <>
                <button onClick={state.phase === 'paused' ? state.resume : state.pause} className="rounded-[10px] bg-[var(--surface)] px-3 py-2 text-xs font-medium">
                  {state.phase === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button onClick={state.stop} className="rounded-[10px] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white">Stop and process</button>
                <button onClick={cancel} className="px-2 py-2 text-xs font-medium text-[var(--recording-danger)]">Cancel recording…</button>
              </>
            ) : (
              <span className="flex items-center gap-2 text-xs font-medium text-[var(--accent)]"><LoaderCircle className="recording-spinner" size={15} /> Preparing Episode</span>
            )}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-4xl px-8 py-12">
        {state.phase === 'preparing' ? (
          <div className="max-w-2xl rounded-[16px] border border-[var(--border)] bg-[var(--surface)]/30 px-8 py-10 text-center">
            <LoaderCircle className="recording-spinner mx-auto text-[var(--accent)]" size={25} />
            <h2 className="mt-4 text-sm font-semibold">Preparing Recorded Episode…</h2>
            <p className="mt-2 text-xs text-[var(--secondary)]">
              Capture is complete. The Episode is ready to enter the transcription pipeline.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold">Recording sources</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--secondary)]">Each enabled source is combined into this Recorded Episode after you stop.</p>
            <div className="mt-7 space-y-2">
              <RecordingSourceRow kind="system" label="System Audio" detail="Audio playing on this Mac" enabled={state.systemAudioEnabled} phase={state.phase} compact systemLocked={state.microphoneDisconnected} permissionDenied={state.systemAudioPermissionDenied} onToggle={state.setSystemAudioEnabled} onCheckPermission={() => state.setPermissionDenied('system', false)} />
              <RecordingSourceRow kind="microphone" label="Microphone" detail={state.microphoneName} enabled={state.microphoneEnabled} phase={state.phase} compact disconnected={state.microphoneDisconnected} permissionDenied={state.microphonePermissionDenied} onToggle={state.setMicrophoneEnabled} onReplace={state.replaceMicrophone} onCheckPermission={() => state.setPermissionDenied('microphone', false)} />
            </div>
            {state.phase === 'setup' && <p className="mt-6 text-xs text-[var(--secondary)]">By starting, you confirm everyone knows the session is being recorded.</p>}
          </div>
        )}
      </section>
    </main>
  )
}
