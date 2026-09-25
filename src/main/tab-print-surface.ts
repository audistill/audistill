import { BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import type { TabPrintSurface } from './tab-export'

const RENDER_TIMEOUT_MS = 15_000

interface PrintSurfacePaths {
  preloadPath: string
  rendererHtmlPath: string
  rendererUrl?: string
}

interface PrintEventPayload {
  jobId: string
  error?: string
}

export function createTabPrintSurface(paths: PrintSurfacePaths): TabPrintSurface {
  const jobId = randomUUID()
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: paths.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
      additionalArguments: [`--tab-print-job=${jobId}`],
    },
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.webContents.on('will-redirect', (event) => event.preventDefault())

  return {
    async render(request): Promise<void> {
      const senderId = window.webContents.id
      await new Promise<void>((resolve, reject) => {
        const cleanup = (): void => {
          clearTimeout(timeout)
          ipcMain.removeListener('tab-print:loaded', handleLoaded)
          ipcMain.removeListener('tab-print:ready', handleReady)
          ipcMain.removeListener('tab-print:failed', handleFailed)
          window.removeListener('closed', handleClosed)
        }
        const matches = (event: Electron.IpcMainEvent, payload: PrintEventPayload): boolean =>
          event.sender.id === senderId && payload?.jobId === jobId
        const handleLoaded = (event: Electron.IpcMainEvent, payload: PrintEventPayload): void => {
          if (!matches(event, payload)) return
          event.sender.send('tab-print:document', { jobId, document: request })
        }
        const handleReady = (event: Electron.IpcMainEvent, payload: PrintEventPayload): void => {
          if (!matches(event, payload)) return
          cleanup()
          resolve()
        }
        const handleFailed = (event: Electron.IpcMainEvent, payload: PrintEventPayload): void => {
          if (!matches(event, payload)) return
          cleanup()
          reject(new Error(payload.error || 'PDF print renderer failed'))
        }
        const handleClosed = (): void => {
          cleanup()
          reject(new Error('PDF print renderer closed before it was ready'))
        }
        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error('PDF print renderer timed out'))
        }, RENDER_TIMEOUT_MS)

        ipcMain.on('tab-print:loaded', handleLoaded)
        ipcMain.on('tab-print:ready', handleReady)
        ipcMain.on('tab-print:failed', handleFailed)
        window.once('closed', handleClosed)

        const navigation = paths.rendererUrl
          ? window.loadURL(new URL('print.html', `${paths.rendererUrl.replace(/\/$/, '')}/`).toString())
          : window.loadFile(paths.rendererHtmlPath)
        navigation.catch((error) => {
          cleanup()
          reject(error)
        })
      })
    },
    printToPDF(options) {
      return window.webContents.printToPDF(options)
    },
    destroy(): void {
      if (!window.isDestroyed()) window.destroy()
    },
  }
}
