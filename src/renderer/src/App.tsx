function App(): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)]">
      <div className="app-drag-region absolute top-0 left-0 right-0 h-8" />
      <h1 className="font-heading text-3xl font-semibold text-[var(--accent)]">PodCapture</h1>
      <p className="mt-3 text-[var(--secondary)]">Local-first podcast transcription</p>
    </div>
  )
}

export default App
