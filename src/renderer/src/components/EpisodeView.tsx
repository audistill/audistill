import { useAppStore, Episode } from '../store/app-store'

export function EpisodeView({ episode }: { episode: Episode }): React.JSX.Element {
  if (episode.status === 'cancelled') {
    return <CancelledState episode={episode} />
  }
  return <ProcessingState episode={episode} />
}

function ProcessingState({ episode }: { episode: Episode }): React.JSX.Element {
  const fileName = episode.file_path?.split('/').pop() || episode.file_path || 'Untitled'
  const progressEntry = useAppStore((s) => s.progress[episode.id])
  const statusText =
    episode.status === 'queued'
      ? 'Waiting in queue...'
      : episode.status === 'transcribing'
        ? 'Transcribing...'
        : episode.status === 'summarizing'
          ? 'Generating summary...'
          : 'Error'

  const handleRetry = async (): Promise<void> => {
    await window.api.retryEpisode(episode.id)
  }

  const handleCancel = async (): Promise<void> => {
    await window.api.cancelEpisode(episode.id)
  }

  const showRichProgress = episode.status === 'transcribing' && progressEntry

  let speedText: string | null = null
  let etaText: string | null = null

  if (showRichProgress && episode.duration_sec && progressEntry.percent > 0) {
    const elapsedSeconds = (Date.now() - progressEntry.startedAt) / 1000
    if (elapsedSeconds > 0) {
      const processedAudioSec = (episode.duration_sec * progressEntry.percent) / 100
      const speed = processedAudioSec / elapsedSeconds
      speedText = `${Math.round(speed)}x listening speed`

      if (speed > 0) {
        const remainingAudioSec = episode.duration_sec - processedAudioSec
        const etaSec = Math.max(0, Math.round(remainingAudioSec / speed))
        etaText = etaSec >= 60
          ? `~${Math.ceil(etaSec / 60)} min remaining`
          : `~${etaSec} sec remaining`
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="w-full max-w-md text-center">
        <div className="w-12 h-12 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
          {episode.status === 'error' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--accent)] processing-dot"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          )}
        </div>
        <p className="font-heading text-sm font-medium text-[var(--text)] mb-2">{fileName}</p>
        <p className="text-sm text-[var(--secondary)] mb-4">{statusText}</p>

        {showRichProgress && (
          <div className="w-full mt-2 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                  style={{ width: `${progressEntry.percent}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text)] font-medium w-10 text-right">
                {Math.round(progressEntry.percent)}%
              </span>
            </div>
            {(speedText || etaText) && (
              <div className="flex items-center justify-center gap-3 text-xs text-[var(--secondary)]">
                {speedText && <span>{speedText}</span>}
                {speedText && etaText && <span className="w-1 h-1 rounded-full bg-[var(--secondary)]" />}
                {etaText && <span>{etaText}</span>}
              </div>
            )}
          </div>
        )}

        {episode.status === 'transcribing' && (
          <button
            onClick={handleCancel}
            className="mt-4 px-4 py-2 rounded-[12px] bg-[var(--surface)] text-[var(--secondary)] text-sm font-medium hover:text-[var(--text)] hover:bg-white/[0.08] transition-[background-color,color] duration-150"
          >
            Cancel
          </button>
        )}

        {episode.error_message && (
          <p className="text-sm text-red-400 mb-4">{episode.error_message}</p>
        )}
        {episode.status === 'error' && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 rounded-[12px] bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-[opacity] duration-150"
          >
            {episode.transcript ? 'Generate Summary' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  )
}

function CancelledState({ episode }: { episode: Episode }): React.JSX.Element {
  const fileName = episode.file_path?.split('/').pop() || episode.file_path || 'Untitled'

  const handleRestart = async (): Promise<void> => {
    await window.api.retryEpisode(episode.id)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="w-full max-w-md text-center">
        <div className="w-12 h-12 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--secondary)]">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
          </svg>
        </div>
        <p className="font-heading text-sm font-medium text-[var(--text)] mb-2">{fileName}</p>
        <p className="text-sm text-[var(--secondary)] mb-4">Transcription cancelled</p>
        <button
          onClick={handleRestart}
          className="px-4 py-2 rounded-[12px] bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-[opacity] duration-150"
        >
          Restart
        </button>
      </div>
    </div>
  )
}
