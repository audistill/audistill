import { useIngestGate } from '../lib/use-ingest-gate'

export function EmptyLibraryState(): React.JSX.Element {
  const ingestGate = useIngestGate()

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent)]">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-semibold text-[var(--text)] mb-2">Your knowledge base is empty</h2>
        <p className="text-sm text-[var(--secondary)] mb-6">
          {ingestGate.available
            ? 'Drop audio files here or click Add to get started.'
            : ingestGate.reason}
        </p>
        <button
          onClick={async () => {
            if (!ingestGate.available) return
            const filePaths = await window.api.selectFiles()
            if (filePaths && filePaths.length > 0) {
              await window.api.addFiles(filePaths)
            }
          }}
          disabled={!ingestGate.available}
          className={`px-5 py-2.5 rounded-[12px] font-heading text-sm font-medium transition-[opacity] duration-150 ${
            ingestGate.available
              ? 'bg-[var(--accent)] text-white hover:opacity-90 cursor-pointer'
              : 'bg-[var(--surface)] text-[var(--secondary)] cursor-not-allowed'
          }`}
        >
          Add Your First Audio File
        </button>
      </div>
    </div>
  )
}

export function NoTabsOpenState(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--secondary)]">
            <path d="M5 3l14 9-7 2-4 7-3-18z" />
            <path d="M12 14l5 5" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-semibold text-[var(--text)] mb-2">No episodes open</h2>
        <p className="text-sm text-[var(--secondary)]">
          Select an item from your Inbox to get started.
        </p>
      </div>
    </div>
  )
}

export function EmptyFolderState(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--secondary)]">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <path d="M12 11v6M9 14h6" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-semibold text-[var(--text)] mb-2">This folder is empty</h2>
        <p className="text-sm text-[var(--secondary)]">
          Move episodes here to organize them.
        </p>
      </div>
    </div>
  )
}

export function EmptyInboxState(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--secondary)]">
            <path d="M22 12h-6l-2 3H10l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-semibold text-[var(--text)] mb-2">Inbox is empty</h2>
        <p className="text-sm text-[var(--secondary)]">
          Add audio files to start building your knowledge base.
        </p>
      </div>
    </div>
  )
}
