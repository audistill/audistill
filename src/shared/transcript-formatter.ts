export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface FormatOptions {
  timestamps: boolean
  durationSec: number
}

export function formatTranscript(segments: TranscriptSegment[], options: FormatOptions): string {
  if (segments.length === 0) return ''

  if (options.timestamps) {
    return formatWithTimestamps(segments, options.durationSec)
  }

  return formatWithoutTimestamps(segments)
}

function formatWithTimestamps(segments: TranscriptSegment[], durationSec: number): string {
  const useHours = durationSec >= 3600
  const lines: string[] = []
  let buffer = ''
  let lineStart = segments[0].start

  for (const seg of segments) {
    const trimmedText = seg.text.trim()
    if (buffer === '') {
      lineStart = seg.start
    }

    const wouldBe = buffer + trimmedText
    if (buffer && wouldBe.length >= 150) {
      lines.push(formatTimestamp(lineStart, useHours) + ' ' + buffer.trim())
      buffer = trimmedText + ' '
      lineStart = seg.start
    } else {
      buffer += trimmedText + ' '
      if (endsWithSentence(buffer)) {
        lines.push(formatTimestamp(lineStart, useHours) + ' ' + buffer.trim())
        buffer = ''
      }
    }
  }

  if (buffer.trim()) {
    lines.push(formatTimestamp(lineStart, useHours) + ' ' + buffer.trim())
  }

  return lines.join('\n')
}

function formatWithoutTimestamps(segments: TranscriptSegment[]): string {
  const paragraphs: string[] = []
  let current = ''

  for (let i = 0; i < segments.length; i++) {
    const gap = i > 0 ? segments[i].start - segments[i - 1].end : 0

    if (gap > 2 && current) {
      paragraphs.push(current.trim())
      current = ''
    }

    current += segments[i].text.trim() + ' '
  }

  if (current.trim()) {
    paragraphs.push(current.trim())
  }

  return paragraphs.join('\n\n')
}

function endsWithSentence(text: string): boolean {
  const trimmed = text.trimEnd()
  return /[.!?]$/.test(trimmed)
}

function formatTimestamp(seconds: number, useHours: boolean): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (useHours) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}
