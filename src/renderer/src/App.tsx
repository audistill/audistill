import { useEffect, useState, useRef, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { ContentPane } from './components/ContentPane'
import { ChatSidebar } from './components/ChatSidebar'
import { OnboardingView } from './components/OnboardingView'
import { DropOverlay } from './components/DropOverlay'
import { useAppStore, Episode } from './store/app-store'

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.wav', '.flac', '.mp4'])

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

function App(): React.JSX.Element {
  const hydrate = useAppStore((s) => s.hydrate)
  const hydrated = useAppStore((s) => s.hydrated)
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar)
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const dragCounter = useRef(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1) setDropActive(true)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setDropActive(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setDropActive(false)

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    const validPaths: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (SUPPORTED_EXTENSIONS.has(getExtension(file.name))) {
        const filePath = window.api.getPathForFile(file)
        if (filePath) validPaths.push(filePath)
      }
    }

    if (validPaths.length === 0) {
      showToast('No supported audio files found')
      return
    }

    window.api.addFiles(validPaths)
  }, [showToast])

  useEffect(() => {
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)
    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    window.api.getSetting('openrouter_api_key').then((key) => {
      setNeedsOnboarding(!key)
    })
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    const unsubscribe = window.api.onEpisodeUpdated((episode) => {
      useAppStore.getState().updateEpisode(episode.id, {
        ...episode,
        status: episode.status as Episode['status'],
      })
    })
    return unsubscribe
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    const unsubscribe = window.api.onIngestProgress((data) => {
      useAppStore.getState().setProgress(data.episodeId, data.percent)
    })
    return unsubscribe
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    const unsubscribe = window.api.onSummaryUpdated((data) => {
      useAppStore.getState().handleSummaryUpdated(data)
    })
    return unsubscribe
  }, [hydrated])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.metaKey && e.key === 'b' && !e.shiftKey) {
        e.preventDefault()
        toggleLeftSidebar()
      }
      if (e.metaKey && e.shiftKey && e.key === 'l') {
        e.preventDefault()
        toggleRightSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleLeftSidebar, toggleRightSidebar])

  if (!hydrated || needsOnboarding === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <p className="text-[var(--secondary)] text-sm">Loading...</p>
      </div>
    )
  }

  if (needsOnboarding) {
    return (
      <div className="flex flex-col h-screen bg-[var(--bg)]">
        <div
          className="h-10 shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        <OnboardingView onComplete={() => setNeedsOnboarding(false)} />
        <DropOverlay visible={dropActive} />
        {toast && <Toast message={toast} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div
        className="flex items-center h-10 px-4 bg-[var(--bg)] border-b border-[var(--surface)] select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="w-[70px] shrink-0" />
        <div className="flex-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <TabBar />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {leftSidebarOpen && <Sidebar />}
        <ContentPane />
        {rightSidebarOpen && (
          <div className="w-[360px] shrink-0 bg-[var(--bg)] border-l border-[var(--surface)] flex flex-col overflow-hidden">
            <ChatSidebar />
          </div>
        )}
      </div>

      <DropOverlay visible={dropActive} />
      {toast && <Toast message={toast} />}
    </div>
  )
}

function Toast({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-[12px] bg-[var(--surface)] text-[var(--text)] text-sm shadow-[0_4px_16px_rgba(0,0,0,0.3)] animate-[fadeIn_150ms_ease-out]">
      {message}
    </div>
  )
}

export default App
