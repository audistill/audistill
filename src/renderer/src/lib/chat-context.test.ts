import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, buildTabsContext } from './chat-context'

describe('Chat tab context', () => {
  const tabs = [
    { id: 'brief-id', tab_name: 'Brief', content: 'A concise active summary.' },
    { id: 'notes-id', tab_name: 'Detailed Notes', content: 'Longer notes' },
    { id: 'empty-id', tab_name: 'Scratchpad', content: '' },
  ]

  it('marks the active tab by name while listing every tab', () => {
    expect(buildTabsContext(tabs, 'brief-id')).toBe([
      '- Brief (active, 25 chars)',
      '- Detailed Notes (12 chars)',
      '- Scratchpad (empty)',
    ].join('\n'))
  })

  it('identifies the active tab by name above its full content', () => {
    const prompt = buildSystemPrompt({
      episodeTitle: 'Episode',
      fileName: 'episode.mp3',
      duration: '00:10:00',
      date: '2026-07-28',
      activeTabName: 'Brief',
      activeTabContent: 'A concise active summary.',
      tabsContext: buildTabsContext(tabs, 'brief-id'),
    })

    expect(prompt).toContain('## Tabs\n- Brief (active, 25 chars)')
    expect(prompt).toContain('## Active Tab: Brief\nA concise active summary.')
    expect(prompt).toContain('use the read_summary tool with the tab_name parameter')
  })
})
