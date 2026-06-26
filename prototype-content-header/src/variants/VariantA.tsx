import { useState } from 'react'
import type { Episode } from '../App'
import { getSourceIcon, getSecondaryLabel, getFullPath } from '../source-utils'

/**
 * Variant A: Two-line unified block
 * Line 1: [SourceIcon] Episode Title ............ secondary label
 * Line 2: ● Brief  [+]                        📄 Transcript ∧
 * Both lines share one background region — no border between them.
 */
export function VariantA({ episode }: { episode: Episode }) {
  const [activeTab, setActiveTab] = useState('Brief')
  const source = getSourceIcon(episode.source_type)
  const Icon = source.icon
  const secondaryLabel = getSecondaryLabel(episode)
  const fullPath = getFullPath(episode)

  const tabs = ['Brief', 'Detailed', 'Full']

  return (
    <div className="border-b border-[var(--border)] shrink-0">
      {/* Line 1: Episode identity */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-1.5">
        <Icon
          size={14}
          style={{ color: source.color }}
          className="shrink-0 opacity-70"
        />
        <h1
          className="text-sm font-heading font-medium text-[var(--text)] truncate flex-1"
          title={fullPath ?? episode.title}
        >
          {episode.title}
        </h1>
        {secondaryLabel && (
          <span className="text-[11px] text-[var(--secondary)] shrink-0 opacity-60">
            {secondaryLabel}
          </span>
        )}
      </div>

      {/* Line 2: Content tabs */}
      <div className="flex items-center gap-0.5 px-4 pb-0">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-t-[8px] text-sm font-medium cursor-pointer select-none transition-colors shrink-0 ${
                activeTab === tab
                  ? 'bg-[var(--bg)] text-[var(--text)] border-b-2 border-[var(--accent)]'
                  : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
            >
              {tab === 'Brief' && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--accent)] opacity-70 shrink-0">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                </svg>
              )}
              {tab}
            </button>
          ))}
          {/* Plus button */}
          <button className="w-6 h-6 flex items-center justify-center rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Transcript toggle */}
        <button className="ml-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Transcript</span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
