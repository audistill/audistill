import { useState } from 'react'
import type { Episode } from '../App'
import { getSourceIcon, getSecondaryLabel, getFullPath, formatDuration } from '../source-utils'

/**
 * Variant C: Title-dominant with integrated tabs
 * Title is larger and more prominent, secondary info below it.
 * Tabs are right-aligned on the same row as the secondary info,
 * creating an asymmetric balance. One cohesive block.
 */
export function VariantC({ episode }: { episode: Episode }) {
  const [activeTab, setActiveTab] = useState('Brief')
  const source = getSourceIcon(episode.source_type)
  const Icon = source.icon
  const secondaryLabel = getSecondaryLabel(episode)
  const fullPath = getFullPath(episode)

  const tabs = ['Brief', 'Detailed', 'Full']

  return (
    <div className="border-b border-[var(--border)] shrink-0 px-4 pt-3 pb-0">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${source.color}15` }}
        >
          <Icon
            size={13}
            style={{ color: source.color }}
          />
        </div>
        <h1
          className="text-[15px] font-heading font-semibold text-[var(--text)] truncate flex-1 leading-tight"
          title={fullPath ?? episode.title}
        >
          {episode.title}
        </h1>
      </div>

      {/* Second row: metadata on left, tabs on right */}
      <div className="flex items-center justify-between gap-4">
        {/* Source info */}
        <div className="flex items-center gap-2 min-w-0">
          {secondaryLabel && (
            <span className="text-[11px] text-[var(--secondary)] truncate opacity-60">
              {secondaryLabel}
            </span>
          )}
          {secondaryLabel && episode.duration_sec && (
            <span className="w-0.5 h-0.5 rounded-full bg-[var(--secondary)] opacity-40 shrink-0" />
          )}
          {episode.duration_sec && (
            <span className="text-[11px] text-[var(--secondary)] opacity-60 shrink-0">
              {formatDuration(episode.duration_sec)}
            </span>
          )}
        </div>

        {/* Tabs + transcript, right-aligned */}
        <div className="flex items-center gap-0.5 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1.5 text-xs font-medium cursor-pointer select-none transition-colors ${
                activeTab === tab
                  ? 'text-[var(--text)] border-b-2 border-[var(--accent)]'
                  : 'text-[var(--secondary)] hover:text-[var(--text)]'
              }`}
            >
              {tab}
            </button>
          ))}
          <button className="w-5 h-5 flex items-center justify-center rounded text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors ml-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <div className="w-px h-4 bg-[var(--border)] mx-2" />
          <button className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Transcript</span>
          </button>
        </div>
      </div>
    </div>
  )
}
