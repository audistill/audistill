/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UrlImportPopover } from './UrlImportPopover'

const { appState } = vi.hoisted(() => ({
  appState: {
    feeds: [] as Array<{ url: string }>,
    loadFeeds: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../store/app-store', () => ({
  useAppStore: (selector: (state: typeof appState) => unknown) => selector(appState),
}))

const youtubeFeed = {
  title: 'Audistill Channel',
  image: 'https://example.com/channel.jpg',
  feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCexample',
  siteUrl: 'https://youtube.com/@audistill',
  items: [{
    title: 'Latest upload',
    enclosureUrl: 'https://www.youtube.com/watch?v=upload12345',
    guid: 'yt:video:upload12345',
    pubDate: '2026-09-03T10:00:00Z',
    duration: null,
    description: 'Upload description',
  }],
}

const feedResolveYouTube = vi.fn()
const feedSubscribe = vi.fn().mockResolvedValue(undefined)
const ytdlpDetect = vi.fn()
const ytdlpFetchMetadata = vi.fn()

;(window as any).api = {
  feedResolveYouTube,
  feedSubscribe,
  checkDuplicates: vi.fn().mockResolvedValue([]),
  ytdlpDetect,
  ytdlpFetchMetadata,
  ytdlpCheckDuplicate: vi.fn().mockResolvedValue(null),
}

describe('UrlImportPopover YouTube Subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appState.feeds = []
    feedResolveYouTube.mockResolvedValue(youtubeFeed)
  })

  afterEach(cleanup)

  it('subscribes to a channel handle using yt-dlp metadata', async () => {
    ytdlpDetect.mockResolvedValue('/opt/homebrew/bin/yt-dlp')
    render(<UrlImportPopover onClose={vi.fn()} onImport={vi.fn()} />)

    const input = await screen.findByPlaceholderText('YouTube, RSS feed, or audio/video URL')
    fireEvent.change(input, { target: { value: 'https://youtube.com/@audistill' } })
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(await screen.findByText('Audistill Channel')).toBeInTheDocument()
    expect(ytdlpDetect).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Import/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }))
    await waitFor(() => {
      expect(feedSubscribe).toHaveBeenCalledWith(youtubeFeed.feedUrl, {
        ...youtubeFeed,
        kind: 'youtube',
      })
    })
  })

  it('shows installation guidance when a channel needs yt-dlp', async () => {
    ytdlpDetect.mockResolvedValue(null)
    render(<UrlImportPopover onClose={vi.fn()} onImport={vi.fn()} />)

    fireEvent.change(await screen.findByPlaceholderText('YouTube, RSS feed, or audio/video URL'), {
      target: { value: 'https://youtube.com/@audistill' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(await screen.findByText('yt-dlp required')).toBeInTheDocument()
    expect(feedResolveYouTube).not.toHaveBeenCalled()
  })

  it('offers channel subscription beside the normal preview for a video URL', async () => {
    ytdlpDetect.mockResolvedValue('/opt/homebrew/bin/yt-dlp')
    ytdlpFetchMetadata.mockResolvedValue({
      title: 'One video',
      channel: 'Audistill Channel',
      duration: 90,
      thumbnail: '',
      uploadDate: '20260903',
    })
    render(<UrlImportPopover onClose={vi.fn()} onImport={vi.fn()} />)

    fireEvent.change(await screen.findByPlaceholderText('YouTube, RSS feed, or audio/video URL'), {
      target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(await screen.findByRole('button', { name: 'Subscribe to channel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
  })
})
