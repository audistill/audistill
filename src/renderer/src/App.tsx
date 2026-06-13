import { useEffect, useState, useRef, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { ContentPane } from './components/ContentPane'
import { ChatSidebar } from './components/ChatSidebar'
import { OnboardingView } from './components/OnboardingView'
import { DropOverlay } from './components/DropOverlay'
import { TrialBanner } from './components/TrialBanner'
import { isLicenseError } from './components/LicenseBlockedPrompt'
import {
  ResizeHandle,
  LEFT_SIDEBAR_MIN,
  LEFT_SIDEBAR_MAX,
  RIGHT_SIDEBAR_MIN,
  RIGHT_SIDEBAR_MAX,
} from './components/ResizeHandle'
import { useAppStore, Episode } from './store/app-store'
import { useContentTabStore } from './store/content-tab-store'
import { SUPPORTED_EXTENSIONS } from '../../shared/supported-formats'

const SIDEBAR_TRANSITION_MS = 200

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

function App(): React.JSX.Element {
  const hydrate = useAppStore((s) => s.hydrate)
  const hydrated = useAppStore((s) => s.hydrated)
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)
  const leftSidebarWidth = useAppStore((s) => s.leftSidebarWidth)
  const rightSidebarWidth = useAppStore((s) => s.rightSidebarWidth)
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar)
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar)
  const setLeftSidebarWidth = useAppStore((s) => s.setLeftSidebarWidth)
  const setRightSidebarWidth = useAppStore((s) => s.setRightSidebarWidth)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [resizing, setResizing] = useState(false)
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
    const skippedNames: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (SUPPORTED_EXTENSIONS.has(getExtension(file.name))) {
        const filePath = window.api.getPathForFile(file)
        if (filePath) validPaths.push(filePath)
      } else {
        skippedNames.push(file.name)
      }
    }

    if (validPaths.length === 0) {
      showToast('No supported audio files found')
      return
    }

    window.api.addFiles(validPaths).catch((err: unknown) => {
      if (isLicenseError(err)) {
        showToast('Trial ended — purchase a license to ingest new files')
      }
    })

    if (skippedNames.length > 0) {
      if (skippedNames.length <= 3) {
        showToast(`${skippedNames.length} file${skippedNames.length > 1 ? 's' : ''} skipped (unsupported format): ${skippedNames.join(', ')}`)
      } else {
        showToast(`${skippedNames.length} files skipped (unsupported format)`)
      }
    }
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
    const unsubStart = window.api.onTabStreamStart((data) => {
      useContentTabStore.getState().startStreaming(data.tabId)
    })
    const unsubToken = window.api.onTabStreamToken((data) => {
      useContentTabStore.getState().appendStreamToken(data.tabId, data.token)
    })
    const unsubEnd = window.api.onTabStreamEnd((data) => {
      useContentTabStore.getState().endStreaming(data.tabId)
    })
    const unsubError = window.api.onTabStreamError((data) => {
      useContentTabStore.getState().restoreSnapshot(data.tabId)
    })
    return () => {
      unsubStart()
      unsubToken()
      unsubEnd()
      unsubError()
    }
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    const unsubContentUpdated = window.api.onTabContentUpdated((data) => {
      const activeEpisode = useAppStore.getState().activeTabId
      if (data.episodeId !== activeEpisode) return
      useContentTabStore.getState().setContentFromMain(data.tabId, data.content)
    })
    const unsubCreated = window.api.onTabCreated((data) => {
      const activeEpisode = useAppStore.getState().activeTabId
      if (data.episodeId !== activeEpisode) return
      useContentTabStore.getState().loadTabs(data.episodeId)
    })
    const unsubNavigate = window.api.onTabNavigate((data) => {
      const activeEpisode = useAppStore.getState().activeTabId
      if (data.episodeId !== activeEpisode) return
      useContentTabStore.getState().setActiveTab(data.tabId)
    })
    return () => {
      unsubContentUpdated()
      unsubCreated()
      unsubNavigate()
    }
  }, [hydrated])


  const toggleTranscriptPanel = useAppStore((s) => s.toggleTranscriptPanel)

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
      if (e.metaKey && e.shiftKey && e.key === 't') {
        e.preventDefault()
        toggleTranscriptPanel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleLeftSidebar, toggleRightSidebar, toggleTranscriptPanel])

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
          className="h-12 shrink-0"
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
      <TrialBanner />
      <div
        className="flex items-center h-12 px-4 bg-[var(--bg)] border-b border-[var(--surface)] select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="w-[70px] shrink-0" />
        <div className="flex-1">
          <TabBar />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          style={{
            width: leftSidebarOpen ? leftSidebarWidth : 0,
            transition: resizing ? 'none' : `width ${SIDEBAR_TRANSITION_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`,
          }}
          className="shrink-0 overflow-hidden"
        >
          <div style={{ width: leftSidebarWidth }} className="h-full">
            <Sidebar />
          </div>
        </div>
        {leftSidebarOpen && (
          <ResizeHandle
            side="left"
            currentWidth={leftSidebarWidth}
            min={LEFT_SIDEBAR_MIN}
            max={LEFT_SIDEBAR_MAX}
            onResize={setLeftSidebarWidth}
            onSnap={toggleLeftSidebar}
            onDragStart={() => setResizing(true)}
            onDragEnd={() => setResizing(false)}
          />
        )}
        <ContentPane />
        {rightSidebarOpen && (
          <ResizeHandle
            side="right"
            currentWidth={rightSidebarWidth}
            min={RIGHT_SIDEBAR_MIN}
            max={RIGHT_SIDEBAR_MAX}
            onResize={setRightSidebarWidth}
            onSnap={toggleRightSidebar}
            onDragStart={() => setResizing(true)}
            onDragEnd={() => setResizing(false)}
          />
        )}
        <div
          style={{
            width: rightSidebarOpen ? rightSidebarWidth : 0,
            transition: resizing ? 'none' : `width ${SIDEBAR_TRANSITION_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`,
          }}
          className="shrink-0 overflow-hidden"
        >
          <div style={{ width: rightSidebarWidth }} className="h-full bg-[var(--bg)] border-l border-[var(--surface)] flex flex-col overflow-hidden">
            <ChatSidebar />
          </div>
        </div>
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
