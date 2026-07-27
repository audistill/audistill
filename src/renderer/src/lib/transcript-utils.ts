export interface TranscriptLine {
  timestamp: string
  text: string
}

export function parseTranscript(raw: string | null): TranscriptLine[] {
  if (!raw) return []

  const trimmed = raw.trim()
  if (trimmed.startsWith('[') && trimmed.includes('"start"')) {
    try {
      const segments = JSON.parse(trimmed) as { start: number; end: number; text: string }[]
      return segments.map((seg) => ({
        timestamp: formatTimestamp(seg.start),
        text: seg.text.trim(),
      }))
    } catch {
      // fall through to line-based parsing
    }
  }

  const lines = raw.split('\n').filter((l) => l.trim())
  return lines.map((line) => {
    const match = line.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]\s*(.*)$/)
    if (match) {
      return { timestamp: match[1], text: match[2] }
    }
    return { timestamp: '', text: line }
  })
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function clampRatio(ratio: number): number {
  return Math.max(0.25, Math.min(0.65, ratio))
}
