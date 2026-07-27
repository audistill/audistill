import { BrowserWindow, screen } from 'electron'
import { DatabaseService } from './database-service'

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}

const SETTINGS_KEY = 'window_bounds'
const DEBOUNCE_MS = 500
const DEFAULT_WIDTH = 900
const DEFAULT_HEIGHT = 670

export function getSavedBounds(db: DatabaseService): WindowBounds | null {
  const raw = db.getSetting(SETTINGS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number' &&
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number' &&
      typeof parsed.isMaximized === 'boolean'
    ) {
      return parsed as WindowBounds
    }
  } catch {
    // corrupted data — fall through
  }
  return null
}

export function isOnScreen(bounds: WindowBounds): boolean {
  const displays = screen.getAllDisplays()
  for (const display of displays) {
    const { x, y, width, height } = display.workArea
    const overlapX = Math.max(0, Math.min(bounds.x + bounds.width, x + width) - Math.max(bounds.x, x))
    const overlapY = Math.max(0, Math.min(bounds.y + bounds.height, y + height) - Math.max(bounds.y, y))
    if (overlapX > 50 && overlapY > 50) return true
  }
  return false
}

export function getWindowOptions(db: DatabaseService): Partial<Electron.BrowserWindowConstructorOptions> {
  const saved = getSavedBounds(db)
  if (saved && isOnScreen(saved)) {
    return {
      x: saved.x,
      y: saved.y,
      width: saved.width,
      height: saved.height,
    }
  }
  return {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  }
}

export function trackWindowState(win: BrowserWindow, db: DatabaseService): void {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  function saveBounds(): void {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      if (win.isDestroyed()) return
      const isMaximized = win.isMaximized()
      const bounds = isMaximized ? win.getNormalBounds() : win.getBounds()
      const state: WindowBounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      }
      db.setSetting(SETTINGS_KEY, JSON.stringify(state))
    }, DEBOUNCE_MS)
  }

  win.on('resize', saveBounds)
  win.on('move', saveBounds)
  win.on('close', () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    if (win.isDestroyed()) return
    const isMaximized = win.isMaximized()
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds()
    const state: WindowBounds = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    }
    db.setSetting(SETTINGS_KEY, JSON.stringify(state))
  })
}
