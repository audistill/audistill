import { useCallback, useEffect, useRef, useState } from 'react'

interface Segment {
  start: number
  end: number
  text: string
}

type ViewState = 'idle' | 'processing' | 'complete' | 'error'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function App(): React.JSX.Element {
  const [viewState, setViewState] = useState<ViewState>('idle')
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState(0)
  const [segments, setSegments] = useState<Segment[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [modelDownloading, setModelDownloading] = useState(false)
  const [modelProgress, setModelProgress] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubProgress = window.api.onTranscriptionProgress((percent) => {
      setProgress(percent)
    })

    const unsubSegment = window.api.onTranscriptionSegment((segment) => {
      setSegments((prev) => [...prev, segment])
    })

    const unsubComplete = window.api.onTranscriptionComplete(() => {
      setViewState('complete')
    })

    const unsubError = window.api.onTranscriptionError((message) => {
      setErrorMessage(message)
      setViewState('error')
    })

    const unsubModelProgress = window.api.onModelDownloadProgress((percent) => {
      setModelDownloading(true)
      setModelProgress(percent)
      if (percent >= 100) {
        setModelDownloading(false)
      }
    })

    return () => {
      unsubProgress()
      unsubSegment()
      unsubComplete()
      unsubError()
      unsubModelProgress()
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [segments])

  const handleSelectFile = useCallback(async () => {
    const filePath = await window.api.selectFile()
    if (filePath) {
      const name = filePath.split('/').pop() || filePath
      setFileName(name)
      setSegments([])
      setProgress(0)
      setErrorMessage('')
      setViewState('processing')
      window.api.startTranscription(filePath)
    }
  }, [])

  const handleCopyTranscript = useCallback(() => {
    const text = segments.map((s) => `[${formatTime(s.start)}] ${s.text}`).join('\n')
    navigator.clipboard.writeText(text)
  }, [segments])

  const handleReset = useCallback(() => {
    setViewState('idle')
    setFileName('')
    setProgress(0)
    setSegments([])
    setErrorMessage('')
  }, [])

  return (
    <div className="flex h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <div className="app-drag-region absolute top-0 left-0 right-0 h-8" />

      <div className="flex flex-1 flex-col items-center justify-center px-8 pt-12 pb-8">
        {viewState === 'idle' && <IdleView modelDownloading={modelDownloading} modelProgress={modelProgress} onSelectFile={handleSelectFile} />}
        {viewState === 'processing' && <ProcessingView fileName={fileName} progress={progress} segments={segments} scrollRef={scrollRef} />}
        {viewState === 'complete' && <CompleteView segments={segments} scrollRef={scrollRef} onCopy={handleCopyTranscript} onReset={handleReset} />}
        {viewState === 'error' && <ErrorView message={errorMessage} onReset={handleReset} />}
      </div>
    </div>
  )
}

function IdleView({ modelDownloading, modelProgress, onSelectFile }: { modelDownloading: boolean; modelProgress: number; onSelectFile: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="font-heading text-3xl font-semibold text-[var(--accent)]">PodCapture</h1>
      <p className="max-w-sm text-[var(--secondary)]">
        Transcribe audio files locally on your Mac. No cloud, no cost per minute.
      </p>

      {modelDownloading ? (
        <div className="w-full max-w-xs">
          <p className="mb-2 text-sm text-[var(--secondary)]">Downloading model… {Math.round(modelProgress)}%</p>
          <ProgressBar percent={modelProgress} />
        </div>
      ) : (
        <button
          onClick={onSelectFile}
          className="rounded bg-[var(--accent)] px-6 py-3 font-heading text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          Select Audio File
        </button>
      )}
    </div>
  )
}

function ProcessingView({ fileName, progress, segments, scrollRef }: { fileName: string; progress: number; segments: Segment[]; scrollRef: React.RefObject<HTMLDivElement | null> }): React.JSX.Element {
  return (
    <div className="flex w-full max-w-2xl flex-1 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="truncate font-heading text-sm font-medium text-[var(--text)]">{fileName}</p>
        <div className="flex items-center gap-3">
          <ProgressBar percent={progress} />
          <span className="shrink-0 text-xs text-[var(--secondary)]">{Math.round(progress)}%</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded bg-[var(--surface)] p-4">
        {segments.length === 0 ? (
          <p className="animate-pulse text-sm text-[var(--secondary)]">Transcribing…</p>
        ) : (
          <SegmentList segments={segments} />
        )}
      </div>
    </div>
  )
}

function CompleteView({ segments, scrollRef, onCopy, onReset }: { segments: Segment[]; scrollRef: React.RefObject<HTMLDivElement | null>; onCopy: () => void; onReset: () => void }): React.JSX.Element {
  return (
    <div className="flex w-full max-w-2xl flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-heading text-sm font-medium text-[var(--accent)]">Transcription complete</p>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className="rounded bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={onReset}
            className="rounded bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--text)] transition-opacity hover:opacity-90 active:opacity-80"
          >
            Transcribe Another
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded bg-[var(--surface)] p-4">
        <SegmentList segments={segments} />
      </div>
    </div>
  )
}

function ErrorView({ message, onReset }: { message: string; onReset: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded bg-[var(--surface)] p-6">
        <p className="font-heading text-sm font-medium text-red-500">Something went wrong</p>
        <p className="mt-2 text-sm text-[var(--secondary)]">{message}</p>
      </div>
      <button
        onClick={onReset}
        className="rounded bg-[var(--accent)] px-6 py-3 font-heading text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
      >
        Try Again
      </button>
    </div>
  )
}

function SegmentList({ segments }: { segments: Segment[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {segments.map((segment, i) => (
        <div key={i} className="flex gap-3 text-sm">
          <span className="shrink-0 font-mono text-xs text-[var(--secondary)]">
            [{formatTime(segment.start)}]
          </span>
          <span className="text-[var(--text)]">{segment.text}</span>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ percent }: { percent: number }): React.JSX.Element {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]">
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  )
}

export default App
