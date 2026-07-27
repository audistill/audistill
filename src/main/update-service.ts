import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'
import type { UpdateStatus } from '../shared/update-types'
import type { DatabaseService } from './database-service'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours
const INITIAL_DELAY_MS = 10_000 // 10 seconds after launch

export class UpdateService {
  private db: DatabaseService
  private status: UpdateStatus
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(db: DatabaseService) {
    this.db = db
    this.status = { state: 'idle', currentVersion: app.getVersion() }

    if (!app.isPackaged) return

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      this.setStatus({ state: 'checking', currentVersion: app.getVersion() })
    })

    autoUpdater.on('update-available', () => {
      // downloading starts automatically since autoDownload is true
    })

    autoUpdater.on('download-progress', (progress) => {
      this.setStatus({
        state: 'downloading',
        percent: Math.round(progress.percent),
        currentVersion: app.getVersion(),
      })
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.setStatus({
        state: 'ready',
        version: info.version,
        currentVersion: app.getVersion(),
      })
    })

    autoUpdater.on('update-not-available', () => {
      this.setStatus({ state: 'idle', currentVersion: app.getVersion() })
    })

    autoUpdater.on('error', () => {
      this.setStatus({ state: 'error', currentVersion: app.getVersion() })
      // Silently recover — will retry next cycle
      setTimeout(() => {
        if (this.status.state === 'error') {
          this.setStatus({ state: 'idle', currentVersion: app.getVersion() })
        }
      }, 5000)
    })
  }

  init(): void {
    if (!app.isPackaged) return

    // Check after initial delay, then every 24h
    setTimeout(() => {
      this.check()
      this.intervalId = setInterval(() => this.check(), CHECK_INTERVAL_MS)
    }, INITIAL_DELAY_MS)
  }

  registerIPC(): void {
    ipcMain.handle('update:get-status', () => {
      return this.status
    })

    ipcMain.handle('update:check', async () => {
      await this.check()
      return this.status
    })

    ipcMain.handle('update:install', () => {
      if (!app.isPackaged) return
      autoUpdater.quitAndInstall()
    })

    ipcMain.handle('update:dismiss', (_event, version: string) => {
      this.db.setSetting('update_dismissed_version', version)
    })
  }

  getStatus(): UpdateStatus {
    return this.status
  }

  dispose(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async check(): Promise<void> {
    if (!app.isPackaged) return
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // Silently ignore — error event handler will manage state
    }
  }

  private setStatus(status: UpdateStatus): void {
    this.status = status
    this.broadcast()
  }

  private broadcast(): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('update:status-changed', this.status)
      }
    }
  }
}
