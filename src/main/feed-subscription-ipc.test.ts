import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeedSubscriptionService } from './feed-subscription-service'
import { registerFeedSubscriptionIPC } from './feed-subscription-ipc'

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => unknown>(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: any[]) => unknown) => {
      handlers.set(channel, handler)
    }),
  },
}))

describe('Feed Subscription IPC', () => {
  beforeEach(() => {
    handlers.clear()
  })

  it('exposes paged catalogue queries and explicit acknowledgement results', async () => {
    const page = { items: [], nextCursor: 'next', total: 201 }
    const service = {
      getFeedItemPage: vi.fn().mockReturnValue(page),
      acknowledgeItems: vi.fn().mockReturnValue({ itemIds: ['item-1'] }),
      clearNewItems: vi.fn().mockReturnValue({ itemIds: ['item-1', 'item-2'] }),
    } as unknown as FeedSubscriptionService
    registerFeedSubscriptionIPC(service)

    await expect(handlers.get('feed:get-items')!({}, 'feed-1', {
      filter: 'all',
      cursor: null,
      limit: 50,
    })).resolves.toEqual(page)
    await expect(handlers.get('feed:acknowledge-items')!({}, 'feed-1', ['item-1']))
      .resolves.toEqual({ itemIds: ['item-1'] })
    await expect(handlers.get('feed:clear-new-items')!({}, 'feed-1'))
      .resolves.toEqual({ itemIds: ['item-1', 'item-2'] })

    expect(service.getFeedItemPage).toHaveBeenCalledWith('feed-1', {
      filter: 'all',
      cursor: null,
      limit: 50,
    })
  })
})
