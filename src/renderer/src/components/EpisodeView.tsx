import { useState } from 'react'
import { Episode } from '../store/mock-data'
import { useAppStore } from '../store/app-store'

export function EpisodeView({ episode }: { episode: Episode }): React.JSX.Element {
  if (episode.status !== 'complete') {
    return <ProcessingState episode={episode} />
  }
  return <EpisodeDetail episode={episode} />
}

function ProcessingState({ episode }: { episode: Episode }): React.JSX.Element {
  const statusText =
    episode.status === 'queued'
      ? 'Waiting in queue...'
      : episode.status === 'transcribing'
        ? `Transcribing... ${episode.progress}%`
        : 'Generating summary...'

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="w-full max-w-md text-center">
        <div className="w-12 h-12 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
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
        </div>
        <p className="font-heading text-sm font-medium text-[var(--text)] mb-2">{episode.file}</p>
        <p className="text-sm text-[var(--secondary)] mb-4">{statusText}</p>
        {episode.status === 'transcribing' && (
          <div className="w-full h-2 rounded-full bg-[var(--surface)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${episode.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function EpisodeDetail({ episode }: { episode: Episode }): React.JSX.Element {
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(episode.title || '')
  const updateEpisode = useAppStore((s) => s.updateEpisode)

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      updateEpisode(episode.id, { title: editTitle.trim() })
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
              <h1 className="font-heading text-2xl font-semibold text-[var(--text)]">{episode.title}</h1>
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
          <span>{episode.file}</span>
          <span className="w-1 h-1 rounded-full bg-[var(--secondary)]" />
          <span>{episode.duration}</span>
          <span className="w-1 h-1 rounded-full bg-[var(--secondary)]" />
          <span>{episode.date}</span>
        </div>

        {/* Summary */}
        {episode.summary && (
          <>
            <div className="mb-8">
              <h2 className="font-heading text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-3">
                The Rundown
              </h2>
              <p className="text-[var(--text)] leading-relaxed text-[15px]">{episode.summary.rundown}</p>
            </div>

            <div className="mb-8">
              <h2 className="font-heading text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-3">
                The Details
              </h2>
              <ul className="list-disc list-outside pl-5 space-y-2 text-[15px]">
                {episode.summary.details.map((d, i) => (
                  <li key={i} className="text-[var(--text)] leading-relaxed">
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-8">
              <h2 className="font-heading text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-3">
                Why It Matters
              </h2>
              <p className="text-[var(--text)] leading-relaxed text-[15px]">{episode.summary.whyItMatters}</p>
            </div>
          </>
        )}

        {/* Transcript */}
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
              className={`text-[var(--secondary)] transition-transform ${transcriptExpanded ? 'rotate-90' : ''}`}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            <h2 className="font-heading text-sm font-semibold text-[var(--secondary)]">Transcript</h2>
            <span className="text-[10px] text-[var(--secondary)] ml-1">{episode.transcript.length} segments</span>
          </div>
          <div
            className={`mt-3 pl-5 overflow-hidden transition-all duration-300 ${transcriptExpanded ? 'max-h-[600px] overflow-y-auto' : 'max-h-0'}`}
          >
            {episode.transcript.map((t, i) => (
              <div key={i} className="flex gap-3 text-sm py-1">
                <span className="shrink-0 font-mono text-xs text-[var(--secondary)]">{t.time}</span>
                <span className="text-[var(--text)]">{t.text}</span>
              </div>
            ))}
          </div>
        </div>
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
