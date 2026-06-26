import type { ReactNode } from 'react'
import type { Episode } from './App'

/**
 * Minimal app shell that simulates the real Audistill layout.
 * Just enough structure to give context to the ContentBar prototypes.
 */
export function AppShell({ episode, children }: { episode: Episode; children: ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      {/* Title bar + Workspace Tabs */}
      <div className="flex items-center h-12 px-4 bg-[var(--bg)] border-b border-[var(--surface)] shrink-0">
        <div className="w-[70px] shrink-0" />
        <div className="flex items-center gap-1 flex-1">
          {/* Left sidebar toggle */}
          <button className="flex items-center justify-center w-[36px] h-[28px] shrink-0 rounded-md hover:bg-[var(--surface)]/50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent)]">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>

          {/* Workspace tab */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[var(--surface)] text-[var(--text)]">
            <span className="truncate max-w-[160px]">{episode.title}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>

          <div className="flex-1" />

          {/* Right sidebar toggle */}
          <button className="flex items-center justify-center w-[36px] h-[28px] shrink-0 rounded-md hover:bg-[var(--surface)]/50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent)]">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M15 3v18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar (collapsed indicator) */}
        <div className="w-[260px] shrink-0 border-r border-[var(--surface)] bg-[var(--bg)] flex flex-col overflow-hidden opacity-40">
          <div className="p-3 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 100 100" className="shrink-0">
              <defs>
                <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#e89b7f' }} />
                  <stop offset="100%" style={{ stopColor: '#d97757' }} />
                </linearGradient>
              </defs>
              <path d="M50,8 C50,8 80,45 80,62 C80,78.5 66.5,92 50,92 C33.5,92 20,78.5 20,62 C20,45 50,8 50,8 Z" fill="url(#sg)" />
            </svg>
            <span className="font-heading text-sm font-semibold text-[var(--text)]">Audistill</span>
          </div>
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-[12px] bg-[var(--surface)] text-[var(--secondary)] text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <span>Search episodes...</span>
            </div>
          </div>
          <div className="px-3 space-y-1">
            <div className="px-3 py-1.5 rounded-lg text-xs text-[var(--secondary)] font-heading font-medium uppercase tracking-wide">★ Starred 4</div>
            <div className="px-3 py-2 rounded-lg text-sm text-[var(--text)] bg-[var(--surface)]">{episode.title?.slice(0, 35)}...</div>
            <div className="px-3 py-2 rounded-lg text-sm text-[var(--secondary)]">Benchmarking Local LLMs on Apple...</div>
            <div className="px-3 py-2 rounded-lg text-sm text-[var(--secondary)]">The Future of Self-Modifying Softwa...</div>
          </div>
        </div>

        {/* Content pane */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
          {children}

          {/* Content body (placeholder) */}
          <div className="flex-1 overflow-y-auto px-10 py-6">
            <h2 className="text-xl font-heading font-semibold mb-4 text-[var(--text)]">Rundown</h2>
            <p className="text-sm text-[var(--secondary)] leading-relaxed mb-6">
              This is a summary of the WesMA Network's third quarter fiscal year 2026 earnings conference call,
              highlighting financial and operational performance, updated outlook, and future growth prospects.
            </p>
            <h3 className="text-base font-heading font-medium mb-3 text-[var(--text)]">Key details</h3>
            <ul className="space-y-3 text-sm text-[var(--secondary)] leading-relaxed list-disc pl-5">
              <li><strong className="text-[var(--text)]">Revised Outlook for Calendar 2026:</strong> WesMA now anticipates year-over-year revenue growth of 22.5% to 30%</li>
              <li><strong className="text-[var(--text)]">Key Customer Contracts:</strong> Significant multi-year agreements are in place with major customers like Charter Communications</li>
              <li><strong className="text-[var(--text)]">Broadband Growth Drivers:</strong> Growth is fueled by Charter's DAA network expansion</li>
              <li><strong className="text-[var(--text)]">Financial Performance (Q3 FY26):</strong> Consolidated revenue was $64.8 million, with a gross margin of 47.3%</li>
            </ul>
          </div>
        </div>

        {/* Right sidebar (collapsed indicator) */}
        <div className="w-[300px] shrink-0 border-l border-[var(--surface)] bg-[var(--bg)] flex flex-col opacity-40">
          <div className="p-3 flex items-center justify-between border-b border-[var(--surface)]">
            <span className="text-xs text-[var(--secondary)]">MiniMax: MiniMax M3 ∨</span>
          </div>
          <div className="flex-1" />
          <div className="p-3 border-t border-[var(--surface)]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-[12px] bg-[var(--surface)] text-[var(--secondary)] text-xs">
              Ask about this episode...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
