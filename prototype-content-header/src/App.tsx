import { useState, useEffect } from 'react'
import { VariantA } from './variants/VariantA'
import { VariantB } from './variants/VariantB'
import { VariantC } from './variants/VariantC'
import { VariantD } from './variants/VariantD'
import { AppShell } from './AppShell'

const VARIANTS = [
  { key: 'A', name: 'Two-line unified block', component: VariantA },
  { key: 'B', name: 'Single-line inline', component: VariantB },
  { key: 'C', name: 'Title-dominant split', component: VariantC },
  { key: 'D', name: 'Three-line hierarchy', component: VariantD },
] as const

// Example episodes representing different source types
const EPISODES = [
  {
    id: '1',
    title: 'WesMA Network Q3 Fiscal 2026 Results Conference Call',
    source_type: 'youtube' as const,
    source_url: 'https://www.youtube.com/watch?v=abc123',
    source_meta: JSON.stringify({ channel: 'WesMA Investor Relations', uploadDate: '2026-06-24', thumbnail: null }),
    duration_sec: 1440,
    created_at: '2026-06-24T14:00:00Z',
  },
  {
    id: '2',
    title: 'Strategic Programming, Harness Opportunities in AI Development',
    source_type: 'rss' as const,
    source_url: 'https://feeds.fireside.fm/podcast/rss',
    source_meta: JSON.stringify({ feedTitle: 'Lex Fridman Podcast', feedImage: null, feedUrl: 'https://lexfridman.com/feed/podcast' }),
    duration_sec: 3720,
    created_at: '2026-06-23T10:00:00Z',
  },
  {
    id: '3',
    title: 'Q2 Product Roadmap Discussion - Internal',
    source_type: 'local' as const,
    source_url: null,
    source_meta: null,
    file_path: '/Users/alex/Recordings/meetings/2026-06-20-roadmap.m4a',
    duration_sec: 3120,
    created_at: '2026-06-20T09:30:00Z',
  },
  {
    id: '4',
    title: 'Auto Research Explained: Karpathy\'s New Paper Deep Dive',
    source_type: 'direct' as const,
    source_url: 'https://media.fireside.fm/episodes/auto-research-karpathy.mp3',
    source_meta: JSON.stringify({ filename: 'auto-research-karpathy.mp3', contentType: 'audio/mpeg', fileSize: 45000000 }),
    duration_sec: 1140,
    created_at: '2026-06-22T16:00:00Z',
  },
]

export type Episode = typeof EPISODES[number]

function getVariantFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('variant') ?? 'A'
}

function getEpisodeFromUrl(): number {
  const params = new URLSearchParams(window.location.search)
  const idx = parseInt(params.get('episode') ?? '0')
  return idx >= 0 && idx < EPISODES.length ? idx : 0
}

export default function App() {
  const [variant, setVariant] = useState(getVariantFromUrl)
  const [episodeIdx, setEpisodeIdx] = useState(getEpisodeFromUrl)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('variant', variant)
    params.set('episode', String(episodeIdx))
    window.history.replaceState({}, '', `?${params}`)
  }, [variant, episodeIdx])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') {
        setVariant((v) => {
          const idx = VARIANTS.findIndex((x) => x.key === v)
          return VARIANTS[(idx - 1 + VARIANTS.length) % VARIANTS.length].key
        })
      }
      if (e.key === 'ArrowRight') {
        setVariant((v) => {
          const idx = VARIANTS.findIndex((x) => x.key === v)
          return VARIANTS[(idx + 1) % VARIANTS.length].key
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const current = VARIANTS.find((v) => v.key === variant) ?? VARIANTS[0]
  const CurrentComponent = current.component
  const episode = EPISODES[episodeIdx]

  return (
    <div className="h-screen flex flex-col">
      <AppShell episode={episode}>
        <CurrentComponent episode={episode} />
      </AppShell>

      {/* Floating switcher */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#2a2a28] border border-[#3a3a38] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {/* Episode switcher */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#3a3a38]">
          <span className="text-[10px] text-[var(--secondary)] uppercase tracking-wide">Episode:</span>
          <select
            value={episodeIdx}
            onChange={(e) => setEpisodeIdx(Number(e.target.value))}
            className="bg-[#1e1e1c] text-[var(--text)] text-xs px-2 py-1 rounded border border-[#3a3a38] outline-none"
          >
            {EPISODES.map((ep, i) => (
              <option key={i} value={i}>
                {ep.source_type}: {ep.title.slice(0, 30)}...
              </option>
            ))}
          </select>
        </div>

        {/* Variant switcher */}
        <button
          onClick={() => {
            const idx = VARIANTS.findIndex((v) => v.key === variant)
            setVariant(VARIANTS[(idx - 1 + VARIANTS.length) % VARIANTS.length].key)
          }}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--secondary)] hover:text-[var(--text)] hover:bg-white/10 transition-colors"
        >
          ←
        </button>
        <div className="text-sm text-[var(--text)] font-medium min-w-[200px] text-center">
          <span className="text-[var(--accent)]">{current.key}</span>
          <span className="text-[var(--secondary)]"> — </span>
          {current.name}
        </div>
        <button
          onClick={() => {
            const idx = VARIANTS.findIndex((v) => v.key === variant)
            setVariant(VARIANTS[(idx + 1) % VARIANTS.length].key)
          }}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--secondary)] hover:text-[var(--text)] hover:bg-white/10 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  )
}
