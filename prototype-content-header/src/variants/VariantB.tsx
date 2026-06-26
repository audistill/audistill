import { useState } from 'react'
import type { Episode } from '../App'
import { getSourceIcon, getSecondaryLabel, getFullPath } from '../source-utils'

/**
 * Variant B: Single-line inline
 * [SourceIcon] Episode Title  |  ● Brief  Detailed  Full  [+]  |  📄 Transcript ∧
 * Everything on one row, separated by subtle dividers.
 * Title truncates as needed to make room for tabs.
 */
export function VariantB({ episode }: { episode: Episode }) {
  const [activeTab, setActiveTab] = useState('Brief')
  const [hovered, setHovered] = useState(false)
  const source = getSourceIcon(episode.source_type)
  const Icon = source.icon
  const secondaryLabel = getSecondaryLabel(episode)
  const fullPath = getFullPath(episode)

  const tabs = ['Brief', 'Detailed', 'Full']

  return (
    <div
      className="flex items-center gap-2 px-4 min-h-[40px] border-b border-[var(--border)] shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Source icon */}
      <Icon
        size={14}
        style={{ color: source.color }}
        className="shrink-0 opacity-70"
      />

      {/* Title + secondary */}
      <div className="flex items-baseline gap-2 min-w-0 max-w-[40%]" title={fullPath ?? episode.title}>
        <span className="text-[13px] font-heading font-medium text-[var(--text)] truncate">
          {episode.title}
        </span>
        {secondaryLabel && hovered && (
          <span className="text-[10px] text-[var(--secondary)] shrink-0 opacity-50 whitespace-nowrap">
            {secondaryLabel}
          </span>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-[var(--border)] mx-1 shrink-0" />

      {/* Content tabs */}
      <div className="flex items-center gap-0.5 flex-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer select-none transition-colors shrink-0 ${
              activeTab === tab
                ? 'bg-[var(--surface)] text-[var(--text)]'
                : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
            }`}
          >
            {tab === 'Brief' && activeTab === tab && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--accent)] shrink-0">
                <circle cx="12" cy="12" r="6" />
              </svg>
            )}
            {tab}
          </button>
        ))}
        {/* Plus */}
        <button className="w-5 h-5 flex items-center justify-center rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Transcript toggle */}
      <button className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span>Transcript</span>
      </button>
    </div>
  )
}
