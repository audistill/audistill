import { app, shell, BrowserWindow, nativeTheme, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { ModelManager } from './model-manager'
import { registerTranscriptionService } from './transcription-service'
import { DatabaseService } from './database-service'
import { SummarizationService } from './summarization-service'
import { IngestPipeline } from './ingest-pipeline'

nativeTheme.themeSource = 'system'

let db: DatabaseService
let summarizationService: SummarizationService
let ingestPipeline: IngestPipeline

function registerDatabaseHandlers(): void {
  ipcMain.handle('db:get-episodes', (_event, folderId?: string | null) => {
    return db.getEpisodes(folderId)
  })

  ipcMain.handle('db:get-episode', (_event, id: string) => {
    return db.getEpisode(id)
  })

  ipcMain.handle('db:get-folders', () => {
    return db.getFolders()
  })

  ipcMain.handle('db:get-open-tabs', () => {
    return db.getOpenTabs()
  })

  ipcMain.handle('db:save-open-tabs', (_event, tabs: { episode_id: string; position: number; is_preview: boolean }[]) => {
    db.saveOpenTabs(tabs)
  })

  ipcMain.handle('db:get-setting', (_event, key: string) => {
    return db.getSetting(key)
  })

  ipcMain.handle('db:set-setting', (_event, key: string, value: string) => {
    db.setSetting(key, value)
  })

  ipcMain.handle('db:search-episodes', (_event, query: string) => {
    return db.searchEpisodes(query)
  })

  ipcMain.handle('db:rename-episode', (_event, id: string, title: string) => {
    db.updateEpisode(id, { title })
  })

  ipcMain.handle('db:move-episode', (_event, id: string, folderId: string | null) => {
    db.updateEpisode(id, { folder_id: folderId })
  })

  ipcMain.handle('db:delete-episode', (_event, id: string) => {
    ingestPipeline.terminateWorkerForEpisode(id)
    db.deleteEpisode(id)
  })

  ipcMain.handle('db:create-folder', (_event, name: string, parentId?: string | null) => {
    return db.createFolder(name, parentId)
  })

  ipcMain.handle('db:rename-folder', (_event, id: string, name: string) => {
    db.updateFolder(id, { name })
  })

  ipcMain.handle('db:delete-folder', (_event, id: string) => {
    db.deleteFolder(id)
  })

  ipcMain.handle('validate-api-key', (_event, key: string) => {
    return summarizationService.validateApiKey(key)
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 600,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.podcapture.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  db = new DatabaseService()
  summarizationService = new SummarizationService(db)
  registerDatabaseHandlers()

  const modelManager = new ModelManager()
  modelManager.on('progress', (percent) => {
    const win = BrowserWindow.getFocusedWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('model-download-progress', percent)
    }
  })

  ingestPipeline = new IngestPipeline(db, modelManager, summarizationService)
  ingestPipeline.recoverOrphanedEpisodes()
  ingestPipeline.registerIPC()

  registerTranscriptionService(modelManager)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
