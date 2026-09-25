import type { FeedRefreshResult } from '../shared/feed-subscription'
import type { FeedSubscriptionService } from './feed-subscription-service'

export interface FeedRefreshSchedulerOptions {
  /** Delay before the first sweep, so refreshing does not compete with first paint. */
  startupDelayMs?: number
  /** Gap between sweeps while the app is open. */
  intervalMs?: number
  /** Feeds checked more recently than this are skipped by a sweep. */
  minAgeMs?: number
  onSweepComplete?: (results: FeedRefreshResult[]) => void
}

// Cadence is set by .scratch/feed-subscriptions/issue.md and ADR 0006: a sweep
// every 30 minutes that only checks feeds older than 4 hours. RSS checks use a
// conditional GET; YouTube checks use one flat-playlist metadata lookup.
const DEFAULT_STARTUP_DELAY_MS = 8_000
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000
const DEFAULT_MIN_AGE_MS = 4 * 60 * 60 * 1000

/**
 * Drives periodic feed checks for the lifetime of the app.
 *
 * Sweeps never overlap: a slow sweep delays the next one rather than stacking
 * on top of it, so a feed that takes a long time cannot multiply into
 * concurrent network work.
 */
export class FeedRefreshScheduler {
  private timer: NodeJS.Timeout | null = null
  private running = false
  private stopped = true

  private readonly startupDelayMs: number
  private readonly intervalMs: number
  private readonly minAgeMs: number

  private readonly onSweepComplete?: (results: FeedRefreshResult[]) => void

  constructor(
    private readonly service: FeedSubscriptionService,
    options: FeedRefreshSchedulerOptions = {}
  ) {
    this.startupDelayMs = options.startupDelayMs ?? DEFAULT_STARTUP_DELAY_MS
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
    this.minAgeMs = options.minAgeMs ?? DEFAULT_MIN_AGE_MS
    this.onSweepComplete = options.onSweepComplete
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    this.schedule(this.startupDelayMs)
  }

  stop(): void {
    this.stopped = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private schedule(delayMs: number): void {
    if (this.stopped) return
    this.timer = setTimeout(() => {
      void this.tick()
    }, delayMs)
  }

  private async tick(): Promise<void> {
    if (!this.running) {
      await this.runSweep(this.minAgeMs)
    }
    this.schedule(this.intervalMs)
  }

  private async runSweep(minAgeMs: number): Promise<FeedRefreshResult[]> {
    this.running = true
    try {
      const results = await this.service.refreshAllFeeds({ minAgeMs })
      this.onSweepComplete?.(results)
      return results
    } catch {
      // A sweep that blows up must not take the schedule with it.
      return []
    } finally {
      this.running = false
    }
  }
}
