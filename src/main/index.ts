import { app, shell, BrowserWindow, nativeTheme, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { ModelManager } from './model-manager'
import { registerTranscriptionService } from './transcription-service'
import { DatabaseService } from './database-service'
import { SummarizationService } from './summarization-service'
import { RecipeService } from './recipe-service'
import { TabService } from './tab-service'
import { IngestPipeline } from './ingest-pipeline'
import { ChatService } from './chat-service'
import { ChatToolExecutor } from './chat-tool-executor'
import { MigrationService } from './migration-service'
import { YtdlpService } from './ytdlp-service'
import { getWindowOptions, trackWindowState, getSavedBounds } from './window-state'

nativeTheme.themeSource = 'system'

let db: DatabaseService
let summarizationService: SummarizationService
let recipeService: RecipeService
let tabService: TabService
let ingestPipeline: IngestPipeline
let chatService: ChatService
let ytdlpService: YtdlpService


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

function registerChatHandlers(): void {
  const chatToolExecutor = new ChatToolExecutor(db, tabService)

  ipcMain.handle('chat:fetch-models', async () => {
    const apiKey = db.getSetting('openrouter_api_key')
    if (!apiKey) return []
    try {
      const { net } = await import('electron')
      const response = await net.fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!response.ok) return []
      const data = await response.json() as { data?: { id: string; name: string }[] }
      if (!data.data) return []
      return data.data.map((m) => ({ id: m.id, name: m.name }))
    } catch {
      return []
    }
  })

  ipcMain.handle('chat:send-message', (_event, request) => {
    const episodeId = request.episodeId || ''
    chatService.setToolExecutor((toolName, args) =>
      chatToolExecutor.executeTool(toolName, args, { currentEpisodeId: episodeId })
    )
    return chatService.sendMessage(request)
  })

  ipcMain.handle('chat:abort', () => {
    chatService.abort()
  })

  ipcMain.handle('chat:get-messages', (_event, episodeId: string) => {
    return db.getChatMessages(episodeId)
  })

  ipcMain.handle('chat:save-message', (_event, episodeId: string, role: 'user' | 'assistant' | 'tool', content: string, toolCalls?: string | null) => {
    return db.saveChatMessage(episodeId, role, content, toolCalls)
  })

  ipcMain.handle('chat:clear-messages', (_event, episodeId: string) => {
    db.clearChatMessages(episodeId)
  })
}

function registerRecipeHandlers(): void {
  ipcMain.handle('recipe:get-all', () => {
    return recipeService.getRecipes()
  })

  ipcMain.handle('recipe:get', (_event, id: string) => {
    return recipeService.getRecipe(id)
  })

  ipcMain.handle('recipe:create', (_event, data: { name: string; prompt: string; model_override?: string }) => {
    return recipeService.createRecipe(data)
  })

  ipcMain.handle('recipe:update', (_event, id: string, fields: { name?: string; prompt?: string; model_override?: string }) => {
    recipeService.updateRecipe(id, fields)
  })

  ipcMain.handle('recipe:delete', (_event, id: string) => {
    recipeService.deleteRecipe(id)
  })

  ipcMain.handle('recipe:get-pipeline', () => {
    return recipeService.getPipelineRecipe()
  })

  ipcMain.handle('recipe:execute', async (event, recipeId: string, transcript: string) => {
    await recipeService.executeRecipe(recipeId, transcript, (token) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.webContents.send('recipe:stream-token', { recipeId, token })
      }
    })
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) {
      win.webContents.send('recipe:stream-end', { recipeId })
    }
  })
}

function registerYtdlpHandlers(): void {
  ipcMain.handle('ytdlp:detect', async () => {
    return ytdlpService.detect()
  })

  ipcMain.handle('ytdlp:set-path', async (_event, path: string) => {
    db.setSetting('ytdlp_path', path)
    return ytdlpService.detect()
  })

  ipcMain.handle('ytdlp:select-binary', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      message: 'Select yt-dlp binary',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('ytdlp:fetch-metadata', async (_event, url: string) => {
    return ytdlpService.fetchMetadata(url)
  })

  ipcMain.handle('ytdlp:check-duplicate', async (_event, url: string) => {
    return db.getEpisodeBySourceUrl(url) ?? null
  })
}

function registerTabHandlers(): void {
  ipcMain.handle('tabs:get', (_event, episodeId: string) => {
    return tabService.getTabs(episodeId)
  })

  ipcMain.handle('tabs:create', (_event, episodeId: string, options: { recipe_id?: string | null; tab_name?: string; is_pipeline?: boolean; content?: string }) => {
    return tabService.createTab(episodeId, options)
  })

  ipcMain.handle('tabs:update-content', (_event, tabId: string, content: string) => {
    tabService.updateTabContent(tabId, content)
  })

  ipcMain.handle('tabs:delete', (_event, tabId: string) => {
    tabService.deleteTab(tabId)
  })

  ipcMain.handle('tabs:rename', (_event, tabId: string, name: string) => {
    tabService.renameTab(tabId, name)
  })

  ipcMain.handle('tabs:reorder', (_event, episodeId: string, tabIds: string[]) => {
    tabService.reorderTabs(episodeId, tabIds)
  })
}

function createWindow(): void {
  const savedBounds = getWindowOptions(db)
  const mainWindow = new BrowserWindow({
    ...savedBounds,
    minWidth: 600,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    icon: join(__dirname, '../../build/icon.icns'),
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  const saved = getSavedBounds(db)
  if (saved?.isMaximized) {
    mainWindow.maximize()
  }

  trackWindowState(mainWindow, db)

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
  electronApp.setAppUserModelId('com.audistill.app')

  if (process.platform === 'darwin') {
    app.dock.setIcon(join(__dirname, '../../build/icon.png'))
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  db = new DatabaseService()
  summarizationService = new SummarizationService(db)
  recipeService = new RecipeService(db)
  tabService = new TabService(db)
  new MigrationService(db, recipeService, tabService).run()
  chatService = new ChatService(db)
  ytdlpService = new YtdlpService(db)
  registerDatabaseHandlers()
  registerChatHandlers()
  registerRecipeHandlers()
  registerTabHandlers()
  registerYtdlpHandlers()

  const modelManager = new ModelManager()
  modelManager.on('progress', (percent) => {
    const win = BrowserWindow.getFocusedWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('model-download-progress', percent)
    }
  })

  ingestPipeline = new IngestPipeline(db, modelManager, recipeService, tabService)
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
