import { describe, it, expect } from 'vitest'
import { FORMATTING_INSTRUCTIONS } from './formatting-instructions'

describe('formatting-instructions', () => {
  it('exports a non-empty string constant', () => {
    expect(typeof FORMATTING_INSTRUCTIONS).toBe('string')
    expect(FORMATTING_INSTRUCTIONS.length).toBeGreaterThan(100)
  })

  it('mentions all supported markdown elements', () => {
    const required = [
      'heading', 'bold', 'italic', 'bullet', 'numbered',
      'blockquote', 'link', 'code', 'horizontal rule',
      'table', 'task list', 'footnote', 'strikethrough',
      'highlight', 'mermaid',
    ]
    const lower = FORMATTING_INSTRUCTIONS.toLowerCase()
    for (const term of required) {
      expect(lower, `should mention "${term}"`).toContain(term)
    }
  })

  it('lists the 5 supported Mermaid diagram types', () => {
    expect(FORMATTING_INSTRUCTIONS).toContain('graph TD')
    expect(FORMATTING_INSTRUCTIONS).toContain('sequenceDiagram')
    expect(FORMATTING_INSTRUCTIONS).toContain('mindmap')
    expect(FORMATTING_INSTRUCTIONS).toContain('timeline')
    expect(FORMATTING_INSTRUCTIONS).toContain('pie')
  })

  it('explicitly bans images', () => {
    const lower = FORMATTING_INSTRUCTIONS.toLowerCase()
    expect(lower).toMatch(/do not use.*image|image.*not supported|no.*image/i)
  })

  it('encourages usage for comprehension', () => {
    const lower = FORMATTING_INSTRUCTIONS.toLowerCase()
    expect(lower).toMatch(/comprehension|understanding|clarity/)
  })
})
