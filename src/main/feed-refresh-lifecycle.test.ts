import { describe, expect, it, vi } from 'vitest'
import { stopFeedRefreshForCommittedQuit } from './feed-refresh-lifecycle'

describe('feed refresh quit lifecycle', () => {
  it('preserves scheduling while a recording quit decision can keep the app open', () => {
    const scheduler = { stop: vi.fn() }

    stopFeedRefreshForCommittedQuit(scheduler, {
      quitCommitted: false,
      hasRecordingCoordinator: true,
    })

    expect(scheduler.stop).not.toHaveBeenCalled()
  })

  it.each([
    { quitCommitted: true, hasRecordingCoordinator: true },
    { quitCommitted: false, hasRecordingCoordinator: false },
  ])('stops scheduling once quitting cannot be cancelled: %o', (options) => {
    const scheduler = { stop: vi.fn() }

    stopFeedRefreshForCommittedQuit(scheduler, options)

    expect(scheduler.stop).toHaveBeenCalledTimes(1)
  })
})
