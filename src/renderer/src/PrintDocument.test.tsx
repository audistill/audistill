/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./components/RichMarkdown', () => ({
  RichMarkdown: ({ content, mermaidTheme }: { content: string; mermaidTheme: string }) => (
    <div data-testid="markdown" data-theme={mermaidTheme}>{content}</div>
  ),
}))

import { PrintDocument } from './PrintDocument'

describe('PrintDocument', () => {
  it('identifies the Tab and Episode and forces light rich-Markdown rendering', () => {
    render(<PrintDocument tabName="Key Findings" episodeTitle="Research Interview" content="# Finding" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Key Findings' })).toBeInTheDocument()
    expect(screen.getByText('Research Interview')).toBeInTheDocument()
    expect(screen.getByTestId('markdown')).toHaveAttribute('data-theme', 'light')
    expect(screen.getByTestId('markdown')).toHaveTextContent('# Finding')
  })
})
