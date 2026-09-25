import { useCallback, useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FeedItem, FeedItemFilter, FeedItemPage } from '../../../shared/feed-subscription'
import { useAppStore } from '../store/app-store'
import { useSelectionStore } from '../store/selection-store'
import { isLicenseError } from './LicenseBlockedPrompt'

const COLUMN = 'mx-auto w-full max-w-[820px] px-6'
const PAGE_SIZE = 60

type SeenUndo = { itemIds: string[]; loadedItems: FeedItem[] }

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  const diffMonth = Math.floor(diffDay / 30)
  if (diffMonth < 12) return `${diffMonth}mo ago`
  return `${Math.floor(diffMonth / 12)}y ago`
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

function mergeUnique(current: FeedItem[], incoming: FeedItem[]): FeedItem[] {
  const byId = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  const timestamp = (value: string | null): number => {
    const parsed = value ? Date.parse(value) : NaN
    return Number.isFinite(parsed) ? parsed : 0
  }
  return [...byId.values()].sort((a, b) =>
    timestamp(b.pub_date) - timestamp(a.pub_date)
    || timestamp(b.first_seen_at) - timestamp(a.first_seen_at)
    || a.id.localeCompare(b.id)
  )
}

export function FeedView({ feedId }: { feedId: string }): React.JSX.Element {
  const feeds = useAppStore((state) => state.feeds)
  const selectEpisode = useAppStore((state) => state.selectEpisode)
  const refreshFeed = useAppStore((state) => state.refreshFeed)
  const loadFeedNewCounts = useAppStore((state) => state.loadFeedNewCounts)
  const feedNewCount = useAppStore((state) => state.newFeedItemCounts[feedId] ?? 0)
  const refreshingFeedIds = useAppStore((state) => state.refreshingFeedIds)
  const feed = feeds.find((candidate) => candidate.id === feedId)

  const [view, setView] = useState<FeedItemFilter>('all')
  const [items, setItems] = useState<FeedItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [allCount, setAllCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(() => new Set())
  const [acknowledgingItemIds, setAcknowledgingItemIds] = useState<Set<string>>(() => new Set())
  const [clearingNew, setClearingNew] = useState(false)
  const [refreshingLocally, setRefreshingLocally] = useState(false)
  const [refreshFeedback, setRefreshFeedback] = useState<string | null>(null)
  const [seenUndo, setSeenUndo] = useState<SeenUndo | null>(null)
  const [exitingItemIds, setExitingItemIds] = useState<Set<string>>(() => new Set())
  const [newItemsAbove, setNewItemsAbove] = useState(0)
  const [selectMode, setSelectMode] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const requestVersionRef = useRef(0)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitTimerByItemIdRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const selectionContainer = `feed:${feedId}`
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const selectedContainer = useSelectionStore((state) => state.selectionContainer)
  const toggleSelection = useSelectionStore((state) => state.toggleSelection)
  const clearSelection = useSelectionStore((state) => state.clearSelection)
  const activeSelectedIds = selectedContainer === selectionContainer ? selectedIds : new Set<string>()

  const loadFirstPage = useCallback(async (filter: FeedItemFilter): Promise<FeedItemPage> => {
    const requestVersion = ++requestVersionRef.current
    setLoading(true)
    setLoadError(null)
    try {
      const page = await window.api.feedGetItems(feedId, { filter, cursor: null, limit: PAGE_SIZE })
      if (requestVersion === requestVersionRef.current) {
        setItems(page.items)
        setNextCursor(page.nextCursor)
        if (filter === 'all') setAllCount(page.total)
      }
      return page
    } catch (error) {
      if (requestVersion === requestVersionRef.current) setLoadError(String(error))
      throw error
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false)
    }
  }, [feedId])

  useEffect(() => {
    setView('all')
    setItems([])
    setAllCount(0)
    setNewItemsAbove(0)
    setSelectMode(false)
    for (const timer of exitTimerByItemIdRef.current.values()) clearTimeout(timer)
    exitTimerByItemIdRef.current.clear()
    clearSelection()
    void loadFirstPage('all').catch(() => undefined)
  }, [clearSelection, feedId, loadFirstPage])

  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    for (const timer of exitTimerByItemIdRef.current.values()) clearTimeout(timer)
  }, [])

  useEffect(() => window.api.onFeedsRefreshed((results) => {
    const refresh = results.find((result) => result.feedId === feedId)
    if (!refresh) return
    const scroller = scrollRef.current
    const preservePosition = (scroller?.scrollTop ?? 0) > 48
    const previousScrollHeight = scroller?.scrollHeight ?? 0
    const targetCount = items.length + refresh.newItemCount
    const refreshVisibleCatalogue = async (): Promise<void> => {
      try {
        const refreshed: FeedItem[] = []
        let cursor: string | null = null
        let total = 0
        do {
          const page = await window.api.feedGetItems(feedId, { filter: view, cursor, limit: PAGE_SIZE })
          refreshed.push(...page.items)
          cursor = page.nextCursor
          total = page.total
        } while (cursor && refreshed.length < targetCount)
        setItems(refreshed)
        setNextCursor(cursor)
        if (view === 'all') setAllCount(total)
        if (preservePosition && refresh.newItemCount > 0) {
          setNewItemsAbove((count) => count + refresh.newItemCount)
          requestAnimationFrame(() => requestAnimationFrame(() => {
            if (scroller) scroller.scrollTop += Math.max(0, scroller.scrollHeight - previousScrollHeight)
          }))
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : String(error))
      }
    }
    void refreshVisibleCatalogue()
  }), [feedId, items.length, view])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || !selectMode) return
      setSelectMode(false)
      clearSelection()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [clearSelection, selectMode])

  const loadMore = useCallback(async (): Promise<void> => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await window.api.feedGetItems(feedId, { filter: view, cursor: nextCursor, limit: PAGE_SIZE })
      setItems((current) => mergeUnique(current, page.items))
      setNextCursor(page.nextCursor)
      if (view === 'all') setAllCount(page.total)
    } catch (error) {
      setLoadError(String(error))
    } finally {
      setLoadingMore(false)
    }
  }, [feedId, loadingMore, nextCursor, view])

  const switchView = (filter: FeedItemFilter): void => {
    if (filter === view) return
    clearSelection()
    setSelectMode(false)
    setView(filter)
    void loadFirstPage(filter).catch(() => undefined)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const leaveSelectMode = (): void => {
    setSelectMode(false)
    clearSelection()
  }

  const offerSeenUndo = (itemIds: string[], loadedItems: FeedItem[]): void => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setSeenUndo((current) => ({
      itemIds: [...new Set([...(current?.itemIds ?? []), ...itemIds])],
      loadedItems: mergeUnique(current?.loadedItems ?? [], loadedItems),
    }))
    undoTimerRef.current = setTimeout(() => setSeenUndo(null), 6_000)
  }

  const acknowledgeItem = async (item: FeedItem): Promise<void> => {
    if (item.state !== 'new' || acknowledgingItemIds.has(item.id)) return
    setActionError(null)
    setAcknowledgingItemIds((current) => new Set(current).add(item.id))
    try {
      const result = await window.api.feedAcknowledgeItems(feedId, [item.id])
      if (!result.itemIds.includes(item.id)) return
      offerSeenUndo(result.itemIds, [item])
      if (view === 'new') {
        setExitingItemIds((current) => new Set(current).add(item.id))
        setItems((current) => current.map((candidate) =>
          candidate.id === item.id ? { ...candidate, state: 'seen' } : candidate
        ))
        const exitTimer = setTimeout(() => {
          setItems((current) => current.filter((candidate) => candidate.id !== item.id))
          setExitingItemIds((current) => {
            const next = new Set(current)
            next.delete(item.id)
            return next
          })
          exitTimerByItemIdRef.current.delete(item.id)
        }, 160)
        exitTimerByItemIdRef.current.set(item.id, exitTimer)
      } else {
        setItems((current) => current.map((candidate) =>
          candidate.id === item.id ? { ...candidate, state: 'seen' } : candidate
        ))
      }
      await loadFeedNewCounts()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setAcknowledgingItemIds((current) => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
    }
  }

  const clearNew = async (): Promise<void> => {
    setClearingNew(true)
    setActionError(null)
    try {
      const result = await window.api.feedClearNewItems(feedId)
      const loadedNewItems = items.filter((item) => result.itemIds.includes(item.id) && item.state === 'new')
      offerSeenUndo(result.itemIds, loadedNewItems)
      if (view === 'new') {
        setItems((current) => current.filter((item) => !result.itemIds.includes(item.id)))
      } else {
        setItems((current) => current.map((item) =>
          result.itemIds.includes(item.id) && item.state === 'new' ? { ...item, state: 'seen' } : item
        ))
      }
      await loadFeedNewCounts()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setClearingNew(false)
    }
  }

  const undoSeen = async (): Promise<void> => {
    const undo = seenUndo
    if (!undo) return
    setSeenUndo(null)
    setExitingItemIds(new Set())
    for (const itemId of undo.itemIds) {
      const timer = exitTimerByItemIdRef.current.get(itemId)
      if (timer) clearTimeout(timer)
      exitTimerByItemIdRef.current.delete(itemId)
    }
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    try {
      await window.api.feedRestoreNewItems(feedId, undo.itemIds)
      if (view === 'new') {
        setItems((current) => mergeUnique(current, undo.loadedItems.map((item) => ({ ...item, state: 'new' }))))
      } else {
        const restoredIds = new Set(undo.itemIds)
        setItems((current) => current.map((item) =>
          restoredIds.has(item.id) && item.state === 'seen' ? { ...item, state: 'new' } : item
        ))
      }
      await loadFeedNewCounts()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    }
  }

  const addItems = async (itemIds: string[]): Promise<void> => {
    if (itemIds.length === 0) return
    setActionError(null)
    setPendingItemIds((current) => new Set([...current, ...itemIds]))
    try {
      const results = await window.api.feedIngestItems(feedId, itemIds)
      const episodeByItemId = new Map(results.map((result) => [result.itemId, result.episodeId]))
      setItems((current) => current.map((item) => {
        const episodeId = episodeByItemId.get(item.id)
        return episodeId ? { ...item, state: 'ingested', episode_id: episodeId } : item
      }))
      if (selectMode) leaveSelectMode()
      await loadFeedNewCounts()
    } catch (error) {
      if (isLicenseError(error)) {
        useAppStore.getState().openLicenseGateModal('Ingesting new episodes')
      } else {
        setActionError(error instanceof Error ? error.message : String(error))
      }
    } finally {
      setPendingItemIds((current) => {
        const next = new Set(current)
        for (const itemId of itemIds) next.delete(itemId)
        return next
      })
    }
  }

  const refreshThisFeed = async (): Promise<void> => {
    setRefreshingLocally(true)
    setRefreshFeedback(null)
    setActionError(null)
    try {
      const result = await refreshFeed(feedId)
      await loadFirstPage(view)
      if (result) {
        setRefreshFeedback(result.newItemCount === 0
          ? 'Up to date'
          : `${result.newItemCount} new ${result.newItemCount === 1 ? 'item' : 'items'}`)
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setRefreshingLocally(false)
    }
  }

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 68,
    getItemKey: useCallback((index: number) => items[index]?.id ?? index, [items]),
    overscan: 8,
  })

  useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems()
    const last = virtualItems.at(-1)
    if (last && last.index >= items.length - 8 && nextCursor) void loadMore()
  }, [items.length, loadMore, nextCursor, virtualizer])

  if (!feed) {
    return <div className="flex flex-1 items-center justify-center text-sm text-[var(--secondary)]">Feed not found.</div>
  }

  const checkedLabel = feed.last_fetched_at
    ? `Checked ${formatRelativeTime(feed.last_fetched_at)}`
    : 'Never checked'
  const isRefreshing = refreshingLocally || refreshingFeedIds.includes(feedId)

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg)]">
      <div className="shrink-0 border-b border-[var(--border)]">
        <div className={`${COLUMN} flex items-center gap-4 py-5`}>
          {feed.image ? (
            <img src={feed.image} alt="" className="h-14 w-14 shrink-0 rounded-[10px] object-cover ring-1 ring-[var(--border)]" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface)] text-[var(--accent)] ring-1 ring-[var(--border)]">⌁</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-heading text-lg font-semibold tracking-[-0.01em] text-[var(--text)]">{feed.title}</h1>
              {feed.site_url ? (
                <button type="button" onClick={() => window.api.openExternal(feed.site_url!)} className="rounded-md p-1.5 text-[var(--secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]" aria-label="Open site">↗</button>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.06em] text-[var(--secondary)]">{isRefreshing ? 'Checking…' : (refreshFeedback ?? checkedLabel)}</p>
          </div>
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void refreshThisFeed()}
            className="rounded-lg p-2 text-[var(--secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] disabled:opacity-50"
            aria-label="Check for new episodes"
          >
            <span className={isRefreshing ? 'inline-block animate-spin' : ''}>↻</span>
          </button>
        </div>
        <div className={`${COLUMN} flex items-center gap-3 pb-3`}>
          <div role="radiogroup" aria-label="Feed items filter" className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5">
            <FilterTab label="New" count={feedNewCount} active={view === 'new'} onClick={() => switchView('new')} />
            <FilterTab label="All" count={allCount} active={view === 'all'} onClick={() => switchView('all')} />
          </div>
          <div className="flex-1" />
          {seenUndo ? (
            <div role="status" className="flex items-center gap-2 text-xs text-[var(--secondary)]">
              <span>Marked seen</span>
              <button type="button" aria-label="Undo mark seen" onClick={() => void undoSeen()} className="font-semibold text-[var(--accent)] hover:opacity-80">Undo</button>
            </div>
          ) : null}
          {feedNewCount > 0 ? (
            <button
              type="button"
              aria-label="Clear new"
              disabled={clearingNew}
              onClick={() => void clearNew()}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] disabled:opacity-60"
            >
              {clearingNew ? 'Clearing…' : 'Clear new'}
            </button>
          ) : null}
          <button
            type="button"
            aria-label={selectMode ? 'Done selecting Feed Items' : 'Select Feed Items'}
            onClick={() => selectMode ? leaveSelectMode() : setSelectMode(true)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${selectMode ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
          >
            {selectMode ? 'Done' : 'Select'}
          </button>
        </div>
      </div>

      <div ref={scrollRef} data-testid="feed-scroll" className="relative flex-1 overflow-y-auto" onScroll={(event) => {
        const element = event.currentTarget
        if (element.scrollTop < 48) setNewItemsAbove(0)
        if (element.scrollHeight - element.scrollTop - element.clientHeight < 240) void loadMore()
      }}>
        {newItemsAbove > 0 ? (
          <div className={`${COLUMN} sticky top-2 z-30 flex justify-center`}>
            <button
              type="button"
              aria-label={`Show ${newItemsAbove} new ${newItemsAbove === 1 ? 'item' : 'items'} above`}
              onClick={() => {
                scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                setNewItemsAbove(0)
              }}
              className="rounded-full border border-[var(--accent-ring)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] shadow-md"
            >
              ↑ {newItemsAbove} new {newItemsAbove === 1 ? 'item' : 'items'}
            </button>
          </div>
        ) : null}
        {loading ? (
          <div className="flex min-h-[55vh] items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>
        ) : loadError ? (
          <div className="flex min-h-[55vh] items-center justify-center px-8 text-center text-sm text-[var(--secondary)]">Could not load Feed Items: {loadError}</div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[55vh] items-center justify-center px-8 text-center text-sm text-[var(--secondary)]">{view === 'new' ? 'Nothing new.' : 'No Feed Items yet.'}</div>
        ) : (
          <div className={COLUMN}>
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = items[virtualItem.index]
                return (
                  <div
                    key={item.id}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    className="absolute left-0 top-0 w-full"
                    style={{ transform: `translateY(${virtualItem.start}px)` }}
                  >
                    <FeedItemRow
                      item={item}
                      selectMode={selectMode}
                      selected={activeSelectedIds.has(item.id)}
                      pending={pendingItemIds.has(item.id)}
                      acknowledging={acknowledgingItemIds.has(item.id)}
                      exiting={exitingItemIds.has(item.id)}
                      onAdd={() => void addItems([item.id])}
                      onActivate={() => {
                        if (selectMode) {
                          if (item.state !== 'ingested') toggleSelection(item.id, selectionContainer)
                        } else if (item.state === 'ingested' && item.episode_id) {
                          selectEpisode(item.episode_id)
                        } else {
                          void acknowledgeItem(item)
                        }
                      }}
                    />
                  </div>
                )
              })}
            </div>
            {loadingMore ? <p role="status" className="py-3 text-center text-xs text-[var(--secondary)]">Loading more…</p> : null}
          </div>
        )}
      </div>

      {actionError ? (
        <div role="alert" className={`${COLUMN} absolute inset-x-0 bottom-20 z-40`}>
          <div className="rounded-lg border border-red-500/30 bg-[var(--surface)] px-3 py-2 text-xs text-red-500">{actionError}</div>
        </div>
      ) : null}

      {selectMode && activeSelectedIds.size > 0 ? (
        <div className="absolute inset-x-0 bottom-4 z-40 px-6">
          <div className="mx-auto flex max-w-[820px] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
            <span className="text-xs font-medium text-[var(--text)]">{activeSelectedIds.size} {activeSelectedIds.size === 1 ? 'item' : 'items'} selected</span>
            <div className="flex-1" />
            <button
              type="button"
              aria-label={`${[...activeSelectedIds].some((id) => pendingItemIds.has(id)) ? 'Adding' : 'Add'} ${activeSelectedIds.size} ${activeSelectedIds.size === 1 ? 'episode' : 'episodes'}`}
              disabled={[...activeSelectedIds].some((id) => pendingItemIds.has(id))}
              onClick={() => void addItems([...activeSelectedIds])}
              className="rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {[...activeSelectedIds].some((id) => pendingItemIds.has(id)) ? 'Adding…' : 'Add'} {activeSelectedIds.size} {activeSelectedIds.size === 1 ? 'episode' : 'episodes'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-medium ${active ? 'bg-[var(--bg)] text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]' : 'text-[var(--secondary)] hover:text-[var(--text)]'}`}
    >
      {label}<span className="text-[10px] tabular-nums opacity-60">{count}</span>
    </button>
  )
}

function FeedItemRow({ item, selectMode, selected, pending, acknowledging, exiting, onActivate, onAdd }: { item: FeedItem; selectMode: boolean; selected: boolean; pending: boolean; acknowledging: boolean; exiting: boolean; onActivate: () => void; onAdd: () => void }): React.JSX.Element {
  const isNew = item.state === 'new'
  const isIngested = item.state === 'ingested' || item.episode_id != null
  const excerpt = item.description?.replace(/\s+/g, ' ').trim()
  const metadata = [
    isIngested ? 'In Library' : null,
    item.duration_sec == null ? null : formatDuration(item.duration_sec),
    item.pub_date ? formatRelativeTime(item.pub_date) : null,
    excerpt,
  ].filter(Boolean)

  return (
    <div
      role="button"
      aria-label={item.title}
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onActivate()
        }
      }}
      aria-pressed={selectMode ? selected : undefined}
      aria-busy={pending || acknowledging || undefined}
      className={`group relative flex min-h-[64px] cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${exiting ? '-translate-y-1 opacity-0' : ''} ${selected ? 'bg-[var(--accent-bg)] ring-1 ring-inset ring-[var(--accent-ring)]' : 'hover:bg-[var(--surface-hover)]'}`}
    >
      {selectMode ? (
        <span aria-hidden className={`mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border ${selected ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)]'}`}>{selected ? '✓' : ''}</span>
      ) : (
        <div className="flex h-5 w-4 shrink-0 items-center justify-center">
          {isNew ? <span aria-label="New" className="h-[7px] w-[7px] rounded-full bg-[var(--accent)]" /> : null}
          {isIngested ? <span aria-label="In Library" className="text-[var(--accent)]">✓</span> : null}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm leading-5 text-[var(--text)] ${isNew ? 'font-semibold' : ''}`}>{item.title}</p>
        <p className="mt-1 truncate text-[11px] text-[var(--secondary)]">{metadata.join(' · ')}</p>
      </div>
      {!selectMode && !isIngested ? (
        <button
          type="button"
          disabled={pending || acknowledging}
          aria-label={`${pending ? 'Adding' : 'Add'} ${item.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onAdd()
          }}
          className="self-center rounded-[6px] bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add'}
        </button>
      ) : null}
    </div>
  )
}
