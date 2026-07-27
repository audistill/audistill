export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildTabFilename(episodeTitle: string, tabName: string): string {
  return `${slugify(episodeTitle)}--${slugify(tabName)}.md`
}

export interface AssembleEpisodeInput {
  title: string
  sourceUrl: string | null
  durationSec: number
  createdAt: string
  tabs: { name: string; content: string }[]
  transcript: string
}

export interface AssembleEpisodeOutput {
  content: string
  suggestedFilename: string
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function assembleEpisode(input: AssembleEpisodeInput): AssembleEpisodeOutput {
  const lines: string[] = ['---']
  lines.push(`title: "${input.title}"`)
  if (input.sourceUrl) {
    lines.push(`source_url: ${input.sourceUrl}`)
  }
  lines.push(`duration: "${formatDuration(input.durationSec)}"`)
  lines.push(`created_at: "${input.createdAt}"`)
  lines.push('---')
  lines.push('')

  for (const tab of input.tabs) {
    lines.push(`## ${tab.name}`)
    lines.push('')
    lines.push(tab.content)
    lines.push('')
  }

  if (input.transcript) {
    lines.push('## Transcript')
    lines.push('')
    lines.push(input.transcript)
    lines.push('')
  }

  return {
    content: lines.join('\n'),
    suggestedFilename: `${slugify(input.title)}.md`,
  }
}
