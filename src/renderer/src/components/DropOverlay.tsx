export function DropOverlay({ visible }: { visible: boolean }): React.JSX.Element | null {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center transition-[opacity] duration-150">
      <div className="border-2 border-dashed border-[var(--accent)] rounded-[16px] px-12 py-10 flex flex-col items-center gap-4">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--accent)]"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <p className="text-[var(--text)] text-sm font-medium">Drop audio files to import</p>
        <p className="text-[var(--secondary)] text-xs">MP3, M4A, WAV, FLAC, MP4</p>
      </div>
    </div>
  )
}
