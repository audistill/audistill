import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FeedRefreshScheduler } from './feed-refresh-scheduler'
import type { FeedSubscriptionService } from './feed-subscription-service'

describe('FeedRefreshScheduler', () => {
  let refreshAllFeeds: ReturnType<typeof vi.fn>
  let service: FeedSubscriptionService

  beforeEach(() => {
    vi.useFakeTimers()
    refreshAllFeeds = vi.fn().mockResolvedValue([])
    service = { refreshAllFeeds } as unknown as FeedSubscriptionService
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to the documented cadence: a sweep every 30 minutes, feeds older than 4 hours', async () => {
    // ADR 0006 budgets one metadata check per few hours per feed. These
    // defaults are what keeps Audistill a good citizen of other people's servers.
    const scheduler = new FeedRefreshScheduler(service)
    scheduler.start()

    await vi.advanceTimersByTimeAsync(8_000)
    expect(refreshAllFeeds).toHaveBeenCalledTimes(1)
    expect(refreshAllFeeds).toHaveBeenLastCalledWith({ minAgeMs: 4 * 60 * 60 * 1000 })

    await vi.advanceTimersByTimeAsync(29 * 60 * 1000)
    expect(refreshAllFeeds).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60 * 1000)
    expect(refreshAllFeeds).toHaveBeenCalledTimes(2)

    scheduler.stop()
  })

  it('waits before the first sweep so it does not compete with first paint', async () => {
    const scheduler = new FeedRefreshScheduler(service, { startupDelayMs: 5000, intervalMs: 60_000 })
    scheduler.start()

    expect(refreshAllFeeds).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(4999)
    expect(refreshAllFeeds).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(refreshAllFeeds).toHaveBeenCalledTimes(1)

    scheduler.stop()
  })

  it('keeps sweeping on an interval, skipping feeds checked recently', async () => {
    const scheduler = new FeedRefreshScheduler(service, {
      startupDelayMs: 0,
      intervalMs: 60_000,
      minAgeMs: 300_000,
    })
    scheduler.start()

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(180_000)

    expect(refreshAllFeeds).toHaveBeenCalledTimes(4)
    expect(refreshAllFeeds).toHaveBeenLastCalledWith({ minAgeMs: 300_000 })

    scheduler.stop()
  })

  it('does not start a sweep while the previous one is still running', async () => {
    let release: () => void = () => {}
    refreshAllFeeds.mockImplementation(
      () => new Promise<[]>((resolve) => { release = () => resolve([]) })
    )
    const scheduler = new FeedRefreshScheduler(service, { startupDelayMs: 0, intervalMs: 10 })
    scheduler.start()

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(100)
    expect(refreshAllFeeds).toHaveBeenCalledTimes(1)

    release()
    await vi.advanceTimersByTimeAsync(10)
    expect(refreshAllFeeds).toHaveBeenCalledTimes(2)

    scheduler.stop()
  })

  it('reports each completed sweep so the app can refresh what it is showing', async () => {
    refreshAllFeeds.mockResolvedValue([{ feedId: 'a', newItemCount: 2 }])
    const onSweep = vi.fn()
    const scheduler = new FeedRefreshScheduler(service, {
      startupDelayMs: 0,
      intervalMs: 60_000,
      onSweepComplete: onSweep,
    })
    scheduler.start()

    await vi.advanceTimersByTimeAsync(0)

    expect(onSweep).toHaveBeenCalledWith([{ feedId: 'a', newItemCount: 2 }])
    scheduler.stop()
  })

  it('survives a sweep that rejects and keeps to its schedule', async () => {
    refreshAllFeeds.mockRejectedValueOnce(new Error('boom')).mockResolvedValue([])
    const scheduler = new FeedRefreshScheduler(service, { startupDelayMs: 0, intervalMs: 50 })
    scheduler.start()

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(50)

    expect(refreshAllFeeds).toHaveBeenCalledTimes(2)
    scheduler.stop()
  })

  it('stops scheduling once stopped', async () => {
    const scheduler = new FeedRefreshScheduler(service, { startupDelayMs: 0, intervalMs: 50 })
    scheduler.start()
    await vi.advanceTimersByTimeAsync(0)
    scheduler.stop()

    await vi.advanceTimersByTimeAsync(500)
    expect(refreshAllFeeds).toHaveBeenCalledTimes(1)
  })
})
