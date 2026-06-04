import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/unused' },
  screen: {
    getAllDisplays: () => [
      { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }
    ]
  },
  BrowserWindow: class {}
}))

import { screen } from 'electron'
import { DatabaseService } from '../src/main/database-service'
import { getSavedBounds, isOnScreen, getWindowOptions, WindowBounds } from '../src/main/window-state'

describe('window-state', () => {
  let db: DatabaseService

  beforeEach(() => {
    db = new DatabaseService(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  describe('getSavedBounds', () => {
    it('returns null when no saved state', () => {
      expect(getSavedBounds(db)).toBeNull()
    })

    it('returns parsed bounds when valid JSON is stored', () => {
      const bounds: WindowBounds = { x: 100, y: 200, width: 800, height: 600, isMaximized: false }
      db.setSetting('window_bounds', JSON.stringify(bounds))
      expect(getSavedBounds(db)).toEqual(bounds)
    })

    it('returns null for invalid JSON', () => {
      db.setSetting('window_bounds', 'not json')
      expect(getSavedBounds(db)).toBeNull()
    })

    it('returns null for JSON missing required fields', () => {
      db.setSetting('window_bounds', JSON.stringify({ x: 10, y: 20 }))
      expect(getSavedBounds(db)).toBeNull()
    })
  })

  describe('isOnScreen', () => {
    it('returns true when window overlaps a display', () => {
      vi.spyOn(screen, 'getAllDisplays').mockReturnValue([
        { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }
      ] as never)
      const bounds: WindowBounds = { x: 100, y: 100, width: 900, height: 670, isMaximized: false }
      expect(isOnScreen(bounds)).toBe(true)
    })

    it('returns false when window is completely off-screen', () => {
      vi.spyOn(screen, 'getAllDisplays').mockReturnValue([
        { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }
      ] as never)
      const bounds: WindowBounds = { x: 5000, y: 5000, width: 900, height: 670, isMaximized: false }
      expect(isOnScreen(bounds)).toBe(false)
    })

    it('returns false when overlap is too small (< 50px)', () => {
      vi.spyOn(screen, 'getAllDisplays').mockReturnValue([
        { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }
      ] as never)
      const bounds: WindowBounds = { x: -870, y: 0, width: 900, height: 670, isMaximized: false }
      expect(isOnScreen(bounds)).toBe(false)
    })

    it('returns true when window is on a secondary display', () => {
      vi.spyOn(screen, 'getAllDisplays').mockReturnValue([
        { workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
        { workArea: { x: 1920, y: 0, width: 2560, height: 1440 } }
      ] as never)
      const bounds: WindowBounds = { x: 2000, y: 200, width: 900, height: 670, isMaximized: false }
      expect(isOnScreen(bounds)).toBe(true)
    })
  })

  describe('getWindowOptions', () => {
    it('returns default dimensions when no saved state', () => {
      const opts = getWindowOptions(db)
      expect(opts).toEqual({ width: 900, height: 670 })
    })

    it('returns saved bounds when on-screen', () => {
      vi.spyOn(screen, 'getAllDisplays').mockReturnValue([
        { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }
      ] as never)
      const bounds: WindowBounds = { x: 200, y: 150, width: 1000, height: 700, isMaximized: false }
      db.setSetting('window_bounds', JSON.stringify(bounds))
      const opts = getWindowOptions(db)
      expect(opts).toEqual({ x: 200, y: 150, width: 1000, height: 700 })
    })

    it('falls back to defaults when saved position is off-screen', () => {
      vi.spyOn(screen, 'getAllDisplays').mockReturnValue([
        { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }
      ] as never)
      const bounds: WindowBounds = { x: 5000, y: 5000, width: 900, height: 670, isMaximized: false }
      db.setSetting('window_bounds', JSON.stringify(bounds))
      const opts = getWindowOptions(db)
      expect(opts).toEqual({ width: 900, height: 670 })
    })
  })
})
