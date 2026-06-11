import { describe, it, expect } from 'vitest'
import { slugify, buildTabFilename, assembleEpisode } from './export-assembler'

describe('slugify', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(slugify('My Great Podcast')).toBe('my-great-podcast')
  })

  it('collapses consecutive hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('handles special characters', () => {
    expect(slugify("What's Up? (Episode #3)")).toBe('what-s-up-episode-3')
  })
})

describe('buildTabFilename', () => {
  it('creates filename from episode title and tab name', () => {
    expect(buildTabFilename('My Podcast', 'Brief')).toBe('my-podcast--brief.md')
  })

  it('handles special characters in both parts', () => {
    expect(buildTabFilename('Episode #1: The Beginning', 'Full Notes')).toBe(
      'episode-1-the-beginning--full-notes.md'
    )
  })
})

describe('assembleEpisode', () => {
  it('produces valid YAML front-matter with all fields present', () => {
    const result = assembleEpisode({
      title: 'My Great Podcast',
      sourceUrl: 'https://youtube.com/watch?v=abc',
      durationSec: 4980,
      createdAt: '2026-06-10T14:30:00',
      tabs: [
        { name: 'Brief', content: 'A short summary.' },
        { name: 'Full Notes', content: 'Detailed notes here.' },
      ],
      transcript: 'Formatted transcript content.',
    })

    expect(result.content).toContain('---\n')
    expect(result.content).toContain('title: "My Great Podcast"')
    expect(result.content).toContain('source_url: https://youtube.com/watch?v=abc')
    expect(result.content).toContain('duration: "1h 23m"')
    expect(result.content).toContain('created_at: "2026-06-10T14:30:00"')
    expect(result.content).toContain('## Brief\n\nA short summary.')
    expect(result.content).toContain('## Full Notes\n\nDetailed notes here.')
    expect(result.content).toContain('## Transcript\n\nFormatted transcript content.')
    expect(result.suggestedFilename).toBe('my-great-podcast.md')
  })

  it('omits source_url when null', () => {
    const result = assembleEpisode({
      title: 'Local File Episode',
      sourceUrl: null,
      durationSec: 120,
      createdAt: '2026-06-10T14:30:00',
      tabs: [{ name: 'Brief', content: 'Content.' }],
      transcript: '',
    })

    expect(result.content).not.toContain('source_url')
  })

  it('formats duration human-readably', () => {
    const cases = [
      { sec: 120, expected: '2m' },
      { sec: 2700, expected: '45m' },
      { sec: 4980, expected: '1h 23m' },
      { sec: 7200, expected: '2h 0m' },
    ]

    for (const { sec, expected } of cases) {
      const result = assembleEpisode({
        title: 'Test',
        sourceUrl: null,
        durationSec: sec,
        createdAt: '2026-06-10T14:30:00',
        tabs: [],
        transcript: '',
      })
      expect(result.content).toContain(`duration: "${expected}"`)
    }
  })

  it('concatenates tabs in position order with H2 headers', () => {
    const result = assembleEpisode({
      title: 'Multi Tab',
      sourceUrl: null,
      durationSec: 300,
      createdAt: '2026-06-10T14:30:00',
      tabs: [
        { name: 'First', content: 'Content 1' },
        { name: 'Second', content: 'Content 2' },
        { name: 'Third', content: 'Content 3' },
      ],
      transcript: 'The transcript.',
    })

    const firstIdx = result.content.indexOf('## First')
    const secondIdx = result.content.indexOf('## Second')
    const thirdIdx = result.content.indexOf('## Third')
    const transcriptIdx = result.content.indexOf('## Transcript')

    expect(firstIdx).toBeLessThan(secondIdx)
    expect(secondIdx).toBeLessThan(thirdIdx)
    expect(thirdIdx).toBeLessThan(transcriptIdx)
  })

  it('appends transcript as final section', () => {
    const result = assembleEpisode({
      title: 'Test',
      sourceUrl: null,
      durationSec: 60,
      createdAt: '2026-06-10T14:30:00',
      tabs: [{ name: 'Brief', content: 'Summary' }],
      transcript: '0:00 Hello world.',
    })

    const lines = result.content.split('\n')
    const transcriptHeaderIdx = lines.findIndex((l) => l === '## Transcript')
    expect(transcriptHeaderIdx).toBeGreaterThan(-1)
    expect(lines[transcriptHeaderIdx + 2]).toBe('0:00 Hello world.')
  })

  it('generates slugified filename without tab suffix', () => {
    const result = assembleEpisode({
      title: "What's Up? (Episode #3)",
      sourceUrl: null,
      durationSec: 60,
      createdAt: '2026-06-10T14:30:00',
      tabs: [],
      transcript: '',
    })

    expect(result.suggestedFilename).toBe('what-s-up-episode-3.md')
  })

  it('omits transcript section when transcript is empty', () => {
    const result = assembleEpisode({
      title: 'No Transcript',
      sourceUrl: null,
      durationSec: 60,
      createdAt: '2026-06-10T14:30:00',
      tabs: [{ name: 'Brief', content: 'Summary' }],
      transcript: '',
    })

    expect(result.content).not.toContain('## Transcript')
  })
})
