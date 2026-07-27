import { LoaderCircle } from 'lucide-react'
import { RecordingSourceRow } from './RecordingSourceRow'
import { useRecordingPrototypeStore } from './recording-panel-prototype-store'
import { formatElapsedTime } from './prototype-utils'

// PROTOTYPE — THROWAWAY

const phaseLabels = {
  setup: 'Ready to start',
  recording: 'Recording now',
  paused: 'Recording paused',
  disconnected: 'Recording · microphone disconnected',
  preparing: 'Preparing Episode'
} as const

export function VariantA(): React.JSX.Element {
  const state = useRecordingPrototypeStore()
  const canStart =
    (state.systemAudioEnabled && !state.systemAudioPermissionDenied) ||
    (state.microphoneEnabled && !state.microphonePermissionDenied && !state.microphoneDisconnected)
  const confirmCancel = (): void => {
    if (window.confirm('Cancel this recording? The simulated recording will be discarded.')) {
      state.cancel()
    }
  }

  return (
    <main className="flex h-full min-h-0 justify-center overflow-y-auto px-6 pb-32 pt-14">
      <section className="w-full max-w-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--secondary)]">
          Recording Session
        </p>
        {state.phase === 'setup' ? (
          <input
            value={state.title}
            onChange={(event) => state.setTitle(event.target.value)}
            aria-label="Meeting title"
            className="mt-2 w-full rounded-[5px] bg-transparent text-2xl font-semibold text-[var(--text)] outline-none placeholder:text-[var(--secondary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            placeholder="Untitled recording"
          />
        ) : (
          <h1 className="mt-2 truncate text-2xl font-semibold text-[var(--text)]">{state.title}</h1>
        )}

        <div className="py-10 text-center">
          <div className="font-mono text-[52px] font-medium leading-none tracking-[-0.06em] text-[var(--text)]">
            {formatElapsedTime(state.elapsedSeconds)}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-[var(--secondary)]">
            {state.phase === 'recording' && <span className="h-2 w-2 rounded-full bg-[var(--recording-danger)]" />}
            {phaseLabels[state.phase]}
          </div>
        </div>

        {state.phase === 'preparing' ? (
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)]/40 px-6 py-8 text-center">
            <LoaderCircle className="recording-spinner mx-auto text-[var(--accent)]" size={25} />
            <p className="mt-4 text-sm font-medium">Preparing your Recorded Episode…</p>
            <p className="mt-1 text-xs text-[var(--secondary)]">Audio captured · transcription will begin next</p>
          </div>
        ) : (
          <div className="space-y-3">
            <RecordingSourceRow
              kind="system"
              label="System Audio"
              detail="Audio playing on this Mac"
              enabled={state.systemAudioEnabled}
              phase={state.phase}
              systemLocked={state.microphoneDisconnected}
              permissionDenied={state.systemAudioPermissionDenied}
              onToggle={state.setSystemAudioEnabled}
              onCheckPermission={() => state.setPermissionDenied('system', false)}
            />
            <RecordingSourceRow
              kind="microphone"
              label="Microphone"
              detail={state.microphoneName}
              enabled={state.microphoneEnabled}
              phase={state.phase}
              disconnected={state.microphoneDisconnected}
              permissionDenied={state.microphonePermissionDenied}
              onToggle={state.setMicrophoneEnabled}
              onReplace={state.replaceMicrophone}
              onCheckPermission={() => state.setPermissionDenied('microphone', false)}
            />
          </div>
        )}

        {state.phase === 'setup' ? (
          <div className="mt-7 text-center">
            <button
              type="button"
              disabled={!canStart}
              onClick={state.start}
              className="rounded-[12px] bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start recording
            </button>
            <p className="mt-3 text-xs text-[var(--secondary)]">
              Make sure everyone knows this meeting is being recorded.
            </p>
          </div>
        ) : state.phase !== 'preparing' ? (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 border-t border-[var(--border)] pt-6">
            <button
              type="button"
              onClick={state.phase === 'paused' ? state.resume : state.pause}
              className="rounded-[12px] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium"
            >
              {state.phase === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={state.stop}
              className="rounded-[12px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Stop and process
            </button>
            <button
              type="button"
              onClick={confirmCancel}
              className="px-3 py-2.5 text-sm font-medium text-[var(--recording-danger)] hover:underline"
            >
              Cancel recording…
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
