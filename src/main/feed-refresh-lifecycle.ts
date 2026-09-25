export interface FeedRefreshSchedulerControl {
  stop: () => void
}

/**
 * Stop feed checks only when this before-quit event cannot be cancelled.
 *
 * An active Recording Session makes the first quit attempt provisional: the
 * user may choose to keep the app open, in which case scheduling must continue.
 */
export function stopFeedRefreshForCommittedQuit(
  scheduler: FeedRefreshSchedulerControl | null,
  options: { quitCommitted: boolean; hasRecordingCoordinator: boolean }
): void {
  if (options.quitCommitted || !options.hasRecordingCoordinator) {
    scheduler?.stop()
  }
}
