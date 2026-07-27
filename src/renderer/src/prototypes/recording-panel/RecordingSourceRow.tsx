import { LockKeyhole, Mic, MonitorSpeaker } from 'lucide-react'
import { useState } from 'react'
import type { RecordingPrototypePhase } from './recording-panel-prototype-store'

// PROTOTYPE — THROWAWAY

interface RecordingSourceRowProps {
  kind: 'system' | 'microphone'
  label: string
  detail: string
  enabled: boolean
  phase: RecordingPrototypePhase
  disconnected?: boolean
  systemLocked?: boolean
  permissionDenied?: boolean
  compact?: boolean
  onToggle: (enabled: boolean) => void
  onReplace?: () => void
  onCheckPermission?: () => void
}

export function RecordingSourceRow({
  kind,
  label,
  detail,
  enabled,
  phase,
  disconnected = false,
  systemLocked = false,
  permissionDenied = false,
  compact = false,
  onToggle,
  onReplace,
  onCheckPermission
}: RecordingSourceRowProps): React.JSX.Element {
  const Icon = kind === 'system' ? MonitorSpeaker : Mic
  const [settingsSimulated, setSettingsSimulated] = useState(false)
  const permissionBlocked = enabled && permissionDenied
  const hasMotion = enabled && phase !== 'paused' && phase !== 'preparing' && !disconnected && !permissionBlocked
  const readiness = permissionBlocked
    ? 'Permission denied'
    : systemLocked
      ? phase === 'paused' ? 'Paused' : 'Continuing · signal detected'
      : disconnected
        ? 'Needs attention'
        : !enabled
          ? 'Off'
          : phase === 'paused'
            ? 'Paused'
            : phase === 'preparing'
              ? 'Capture complete'
              : 'Ready · signal detected'

  return (
    <div
      className={`flex items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--bg)] ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface)] text-[var(--secondary)]">
        <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--text)]">{label}</span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
              disconnected || permissionBlocked
                ? 'text-[var(--recording-warning)]'
                : enabled
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-[var(--secondary)]'
            }`}
          >
            {readiness}
          </span>
        </div>
        {permissionBlocked ? (
          <div className="mt-1 text-xs leading-relaxed text-[var(--secondary)]">
            <p>{kind === 'system' ? 'System Audio access is required for this source.' : 'Microphone access is required for this source.'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={() => setSettingsSimulated(true)}
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Open System Settings
              </button>
              <button
                type="button"
                onClick={onCheckPermission}
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Check again
              </button>
              {settingsSimulated && <span aria-live="polite">System Settings opening simulated.</span>}
            </div>
          </div>
        ) : (
          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--secondary)]">
            <span className="truncate">{detail}</span>
            {disconnected && onReplace && (
              <button
                type="button"
                onClick={onReplace}
                className="shrink-0 font-medium text-[var(--accent)] hover:underline"
              >
                Choose microphone…
              </button>
            )}
          </div>
        )}
      </div>

      {permissionBlocked ? null : disconnected ? (
        <span className="shrink-0 text-xs font-medium text-[var(--recording-warning)]">
          Disconnected
        </span>
      ) : (
        <div
          className={`flex h-7 w-12 shrink-0 items-end justify-center gap-[3px] ${
            hasMotion ? '' : 'recording-meter-idle'
          }`}
          aria-label={hasMotion ? 'Signal active' : 'Signal inactive'}
        >
          {[45, 75, 100, 65, 40].map((height, index) => (
            <span
              key={height + index}
              className="recording-meter-bar w-[3px] rounded-full bg-[var(--accent)]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      )}

      {systemLocked && (
        <LockKeyhole
          size={13}
          className="shrink-0 text-[var(--secondary)]"
          aria-label="System Audio stays on while the microphone is disconnected"
        />
      )}

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={
          systemLocked
            ? 'System Audio stays on while the microphone is disconnected'
            : `${enabled ? 'Turn off' : 'Turn on'} ${label}`
        }
        disabled={disconnected || systemLocked}
        onClick={() => onToggle(!enabled)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          enabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
        }`}
      >
        <span
          className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
