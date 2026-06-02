export function EmptyLibraryState(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent)]">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-semibold text-[var(--text)] mb-2">Your knowledge base is empty</h2>
        <p className="text-sm text-[var(--secondary)] mb-6">
          Add an audio file to get started. It will be transcribed and summarized automatically.
        </p>
        <button
          onClick={() => alert('Native file dialog would open here.\nSelected files go to Inbox and start processing.')}
          className="px-5 py-2.5 rounded-[12px] bg-[var(--accent)] text-white font-heading text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Add Your First Audio File
        </button>
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
          </svg>
        </div>
        <h2 className="font-heading text-xl font-semibold text-[var(--text)] mb-2">This folder is empty</h2>
        <p className="text-sm text-[var(--secondary)]">
          Move episodes here from the Inbox or other folders to organize your library.
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
          All caught up! New audio files will appear here for processing.
        </p>
      </div>
    </div>
  )
}
