import { ipcMain } from 'electron'
import type { FeedSubscriptionService } from './feed-subscription-service'
import type { FeedResult } from './feed-service'
import type { FeedItemPageRequest } from '../shared/feed-subscription'

export function registerFeedSubscriptionIPC(
  service: FeedSubscriptionService,
  onRendererHydrated: () => void = () => undefined,
  resolveYouTubeFeed?: (url: string) => Promise<FeedResult>
): void {
  ipcMain.handle('feed:subscribe', async (_event, url: string, previewData?: FeedResult) => {
    return service.subscribe(url, previewData)
  })

  ipcMain.handle('feed:resolve-youtube', async (_event, url: string) => {
    if (!resolveYouTubeFeed) throw new Error('YouTube Subscription resolution is unavailable')
    return resolveYouTubeFeed(url)
  })

  ipcMain.handle('feed:unsubscribe', async (_event, id: string) => {
    service.unsubscribe(id)
  })

  ipcMain.handle('feed:list', async () => {
    return service.getSubscriptions()
  })

  ipcMain.handle('feed:reorder', async (_event, feedIds: string[]) => {
    service.reorderFeeds(feedIds)
  })

  ipcMain.handle('feed:get-items', async (_event, feedId: string, request: FeedItemPageRequest) => {
    return service.getFeedItemPage(feedId, request)
  })

  ipcMain.handle('feed:ingest-items', async (_event, feedId: string, itemIds: string[]) => {
    return service.ingestItems(feedId, itemIds)
  })

  ipcMain.handle('feed:refresh', async (_event, feedId: string) => {
    return service.refreshFeed(feedId)
  })

  ipcMain.handle('feed:refresh-all', async () => {
    return service.refreshAllFeeds()
  })

  ipcMain.handle('feed:acknowledge-items', async (_event, feedId: string, itemIds: string[]) => {
    return service.acknowledgeItems(feedId, itemIds)
  })

  ipcMain.handle('feed:clear-new-items', async (_event, feedId: string) => {
    return service.clearNewItems(feedId)
  })

  ipcMain.handle('feed:restore-new-items', async (_event, feedId: string, itemIds: string[]) => {
    service.restoreNewItems(feedId, itemIds)
  })

  ipcMain.handle('feed:new-counts', async () => {
    return service.getNewItemCounts()
  })

  ipcMain.handle('feed:start-scheduler', async () => {
    onRendererHydrated()
  })
}
