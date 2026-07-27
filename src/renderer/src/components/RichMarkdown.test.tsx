/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RichMarkdown } from './RichMarkdown'

describe('RichMarkdown', () => {
  it('renders standard markdown (headings, bold, paragraphs)', () => {
    render(<RichMarkdown content={'# Hello\n\nThis is **bold** text.'} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello')
    expect(screen.getByText('bold')).toBeInTheDocument()
  })

  it('renders GFM tables as <table> elements', () => {
    const table = `| Name | Age |
| --- | --- |
| Alice | 30 |
| Bob | 25 |`
    render(<RichMarkdown content={table} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 data rows
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders task lists with checkbox inputs', () => {
    const taskList = `- [ ] Unchecked item\n- [x] Checked item`
    const { container } = render(<RichMarkdown content={taskList} />)

    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('renders ==text== as <mark> elements', () => {
    const { container } = render(<RichMarkdown content={'This is ==highlighted== text.'} />)

    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0]).toHaveTextContent('highlighted')
  })

  it('renders footnotes as superscript references', () => {
    const content = `Here is a claim[^1].\n\n[^1]: Source for this claim.`
    const { container } = render(<RichMarkdown content={content} />)

    // GFM footnotes produce <sup> elements for references
    const sups = container.querySelectorAll('sup')
    expect(sups.length).toBeGreaterThan(0)
    // And a footnotes section at the end
    const footnoteSection = container.querySelector('[data-footnotes]') || container.querySelector('.footnotes')
    expect(footnoteSection).toBeInTheDocument()
  })

  it('renders nested blockquotes as nested <blockquote> elements', () => {
    const content = `> Outer quote\n> > Inner quote`
    const { container } = render(<RichMarkdown content={content} />)

    const blockquotes = container.querySelectorAll('blockquote')
    expect(blockquotes.length).toBeGreaterThanOrEqual(2)
    // Inner blockquote is nested inside outer
    expect(blockquotes[0].querySelector('blockquote')).toBeInTheDocument()
  })

  it('renders fenced code blocks as <pre><code>', () => {
    const content = '```javascript\nconsole.log("hello")\n```'
    const { container } = render(<RichMarkdown content={content} />)

    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    const code = pre!.querySelector('code')
    expect(code).toBeInTheDocument()
    expect(code).toHaveTextContent('console.log("hello")')
  })

  it('renders strikethrough text with <del> element', () => {
    const { container } = render(<RichMarkdown content={'This is ~~deleted~~ text.'} />)

    const del = container.querySelector('del')
    expect(del).toBeInTheDocument()
    expect(del).toHaveTextContent('deleted')
  })
})

describe('RichMarkdown - Mermaid diagrams', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('renders valid mermaid code blocks as SVG', async () => {
    const mockSvg = '<svg><text>Mock diagram</text></svg>'
    vi.doMock('mermaid', () => ({
      default: {
        initialize: vi.fn(),
        render: vi.fn().mockResolvedValue({ svg: mockSvg }),
      },
    }))
    const { RichMarkdown: RM } = await import('./RichMarkdown')

    const content = '```mermaid\ngraph TD\n  A --> B\n```'
    const { container } = render(<RM content={content} />)

    await waitFor(() => {
      const svgContainer = container.querySelector('[data-mermaid]')
      expect(svgContainer).toBeInTheDocument()
      expect(svgContainer!.innerHTML).toContain('<svg')
    })
  })

  it('falls back to code block with error indicator on invalid mermaid', async () => {
    vi.doMock('mermaid', () => ({
      default: {
        initialize: vi.fn(),
        render: vi.fn().mockRejectedValue(new Error('Parse error')),
      },
    }))
    const { RichMarkdown: RM } = await import('./RichMarkdown')

    const content = '```mermaid\ninvalid diagram syntax\n```'
    const { container } = render(<RM content={content} />)

    await waitFor(() => {
      const errorIndicator = container.querySelector('[data-mermaid-error]')
      expect(errorIndicator).toBeInTheDocument()
    })
    // Should show the raw code
    expect(container.querySelector('code')).toBeInTheDocument()
  })

  it('does not affect non-mermaid code blocks', () => {
    const content = '```python\nprint("hello")\n```'
    const { container } = render(<RichMarkdown content={content} />)

    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(container.querySelector('[data-mermaid]')).not.toBeInTheDocument()
  })
})
