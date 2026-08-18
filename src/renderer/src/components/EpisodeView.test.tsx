/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EpisodeView } from './EpisodeView'
import type { Episode } from '../store/app-store'

const failedEpisode: Episode = {
  id: 'failed-youtube',
  title: 'Failed YouTube Episode',
  file_path: null,
  folder_id: null,
  duration_sec: null,
  transcript: null,
  source_url: 'https://www.youtube.com/watch?v=failed',
  source_meta: null,
  source_type: 'youtube',
  status: 'error',
  error_message: 'YouTube refused the audio download. Try again later.',
  error_details: 'yt-dlp exited with code 1\nERROR: HTTP Error 403: Forbidden',
  is_starred: false,
  starred_at: null,
  created_at: '2026-08-18T00:00:00.000Z',
  updated_at: '2026-08-18T00:00:00.000Z',
}

describe('EpisodeView Ingest Failure details', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { retryEpisode: vi.fn(), cancelEpisode: vi.fn() },
    })
  })

  afterEach(cleanup)

  it('shows a concise explanation with collapsed Diagnostic Details', () => {
    render(<EpisodeView episode={failedEpisode} />)

    expect(screen.getByText(failedEpisode.error_message!)).toBeInTheDocument()
    const details = screen.getByText('Show details').closest('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
    expect(details).toHaveTextContent('yt-dlp exited with code 1')
  })

  it('expands Diagnostic Details from Show details', () => {
    render(<EpisodeView episode={failedEpisode} />)
    const summary = screen.getByText('Show details')

    fireEvent.click(summary)

    expect((summary.closest('details') as HTMLDetailsElement).open).toBe(true)
    expect(screen.getByText(/HTTP Error 403: Forbidden/)).toBeInTheDocument()
  })
})
