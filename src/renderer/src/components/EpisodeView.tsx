import { useState } from 'react'
import { useAppStore, Episode } from '../store/app-store'
import Markdown from 'react-markdown'

export function EpisodeView({ episode }: { episode: Episode }): React.JSX.Element {
  if (episode.status === 'cancelled') {
    return <CancelledState episode={episode} />
  }
  if (episode.status !== 'complete') {
    return <ProcessingState episode={episode} />
  }
  return <EpisodeDetail episode={episode} />
}

function ProcessingState({ episode }: { episode: Episode }): React.JSX.Element {
  const fileName = episode.file_path.split('/').pop() || episode.file_path
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
  const fileName = episode.file_path.split('/').pop() || episode.file_path

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

interface TranscriptSegment {
  start: number
  end: number
  text: string
}

function parseTranscript(transcript: string): TranscriptSegment[] | null {
  try {
    const parsed = JSON.parse(transcript)
    if (Array.isArray(parsed) && parsed.length > 0 && 'start' in parsed[0]) {
      return parsed
    }
  } catch {
    // not JSON — legacy plain text
  }
  return null
}

function formatTimestamp(seconds: number): string {
  const totalSec = Math.floor(seconds)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function EpisodeDetail({ episode }: { episode: Episode }): React.JSX.Element {
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(episode.title || '')
  const renameEpisode = useAppStore((s) => s.renameEpisode)

  const fileName = episode.file_path.split('/').pop() || episode.file_path

  const handleSaveTitle = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== episode.title) {
      renameEpisode(episode.id, trimmed)
    }
    setEditing(false)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-12 py-8">
        {/* Title */}
        <div className="editable-title flex items-center gap-2 mb-2 group">
          {editing ? (
            <input
              className="font-heading text-2xl font-semibold text-[var(--text)] bg-transparent outline-none border-b border-[var(--accent)] w-full"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              autoFocus
            />
          ) : (
            <>
              <h1 className="font-heading text-2xl font-semibold text-[var(--text)]">
                {episode.title || fileName}
              </h1>
              <svg
                className="pencil-icon text-[var(--secondary)] cursor-pointer"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                onClick={() => {
                  setEditTitle(episode.title || '')
                  setEditing(true)
                }}
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-[var(--secondary)] mb-8">
          <span>{fileName}</span>
          {episode.duration_sec && (
            <>
              <span className="w-1 h-1 rounded-full bg-[var(--secondary)]" />
              <span>{formatDuration(episode.duration_sec)}</span>
            </>
          )}
          <span className="w-1 h-1 rounded-full bg-[var(--secondary)]" />
          <span>{formatDate(episode.created_at)}</span>
        </div>

        {/* Summary with markdown rendering */}
        {episode.summary && (
          <div className="mb-8">
            <h2 className="font-heading text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-3">
              Summary
            </h2>
            <div className="border-l-[3px] border-[var(--accent)] pl-4">
              <Markdown
                components={{
                  p: ({ children }) => (
                    <p className="text-[var(--text)] leading-relaxed text-[15px] mb-3 last:mb-0">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-[var(--text)]">{children}</strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 mb-3 last:mb-0 space-y-1">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-[var(--text)] leading-relaxed text-[15px]">{children}</li>
                  ),
                  h2: ({ children }) => (
                    <h2 className="font-heading text-base font-semibold text-[var(--text)] mb-2 mt-4 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="font-heading text-sm font-semibold text-[var(--text)] mb-2 mt-3 first:mt-0">{children}</h3>
                  ),
                }}
              >
                {episode.summary}
              </Markdown>
            </div>
          </div>
        )}

        {/* Transcript */}
        {episode.transcript && (
          <div className="mb-8 border-t border-[var(--surface)] pt-6">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setTranscriptExpanded(!transcriptExpanded)}
              aria-expanded={transcriptExpanded}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-[var(--secondary)] transition-[transform] duration-200 ${transcriptExpanded ? 'rotate-90' : ''}`}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              <h2 className="font-heading text-sm font-semibold text-[var(--secondary)]">Transcript</h2>
            </div>
            <div
              className={`mt-3 pl-5 overflow-hidden transition-[max-height] duration-200 ${transcriptExpanded ? 'max-h-[600px] overflow-y-auto' : 'max-h-0'}`}
            >
              {(() => {
                const segments = parseTranscript(episode.transcript!)
                if (segments) {
                  return (
                    <div className="space-y-3">
                      {segments.map((seg, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="shrink-0 text-xs text-[var(--secondary)] font-mono pt-0.5 w-12 text-right">
                            {formatTimestamp(seg.start)}
                          </span>
                          <p className="text-sm text-[var(--text)] leading-relaxed">{seg.text}</p>
                        </div>
                      ))}
                    </div>
                  )
                }
                return (
                  <p className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                    {episode.transcript}
                  </p>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Chat placeholder */}
      <div className="shrink-0 px-12 py-4 border-t border-[var(--surface)]">
        <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-[var(--surface)] text-[var(--secondary)] text-sm cursor-not-allowed opacity-60">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          <span>Ask about this episode... (coming soon)</span>
        </div>
      </div>
    </>
  )
}
