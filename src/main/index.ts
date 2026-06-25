import { app, shell, BrowserWindow, nativeTheme, ipcMain, dialog, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { ModelManager } from './model-manager'
import { registerTranscriptionService } from './transcription-service'
import { DatabaseService } from './database-service'
import { RecipeService } from './recipe-service'
import { TabService } from './tab-service'
import { IngestPipeline } from './ingest-pipeline'
import { ChatService } from './chat-service'
import { ChatToolExecutor } from './chat-tool-executor'
import { MigrationService } from './migration-service'
import { YtdlpService } from './ytdlp-service'
import { fetchUrlHead } from './url-head-service'
import { FeedService } from './feed-service'
import { getWindowOptions, trackWindowState, getSavedBounds } from './window-state'
import { LicenseService } from './license-service'
import { PolarClient } from './polar-client'
import { requireLicense } from './license-guard'
import { UpdateService } from './update-service'
import { machineIdSync } from 'node-machine-id'

if (app.isPackaged && process.platform === 'darwin') {
  process.env.PATH = [process.env.PATH, '/opt/homebrew/bin', '/usr/local/bin'].filter(Boolean).join(':')
}

// Appearance is set after DB init, before window creation (see app.whenReady)

let db: DatabaseService
let recipeService: RecipeService
let tabService: TabService
let ingestPipeline: IngestPipeline
let chatService: ChatService
let ytdlpService: YtdlpService
let licenseService: LicenseService
let updateService: UpdateService

function getLicenseSnapshot(): { state: string; trialDaysRemaining?: number; maskedKey?: string; activationLabel?: string } {
  const state = licenseService.getState()
  const snapshot: { state: string; trialDaysRemaining?: number; maskedKey?: string; activationLabel?: string } = { state }
  if (state === 'trial') {
    snapshot.trialDaysRemaining = licenseService.getTrialDaysRemaining()
  }
  const record = db.getLicenseRecord()
  if (record?.license_key && (state === 'licensed' || state === 'license-invalid')) {
    snapshot.maskedKey = '****-' + record.license_key.slice(-6)
  }
  return snapshot
}

function registerLicenseHandlers(): void {
  ipcMain.handle('shell:open-external', (_event, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('license:open-checkout', () => {
    shell.openExternal('https://audistill.com/#pricing')
  })

  ipcMain.handle('license:get-state', () => {
    return getLicenseSnapshot()
  })

  ipcMain.handle('license:activate', async (_event, key: string) => {
    try {
      await licenseService.activate(key)
      return { success: true }
    } catch (err: unknown) {
      const error = err as { type?: string; message?: string }
      return { success: false, error: { type: error.type ?? 'unknown', message: error.message ?? 'Activation failed' } }
    }
  })

  ipcMain.handle('license:deactivate', async () => {
    await licenseService.deactivate()
  })

  licenseService.onStateChange(() => {
    const snapshot = getLicenseSnapshot()
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('license:state-changed', snapshot)
      }
    }
  })
}

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
    if (key === 'appearance') {
      nativeTheme.themeSource = (value as 'system' | 'light' | 'dark') || 'system'
    }
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

  ipcMain.handle('db:move-episodes', (_event, ids: string[], folderId: string | null) => {
    db.moveEpisodes(ids, folderId)
  })

  ipcMain.handle('db:delete-episodes', (_event, ids: string[]) => {
    for (const id of ids) {
      ingestPipeline.terminateWorkerForEpisode(id)
    }
    db.deleteEpisodes(ids)
  })

  ipcMain.handle('db:star-episode', (_event, id: string) => {
    db.starEpisode(id)
  })

  ipcMain.handle('db:unstar-episode', (_event, id: string) => {
    db.unstarEpisode(id)
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
    return recipeService.validateApiKey(key)
  })
}

function registerChatHandlers(): void {
  const chatToolExecutor = new ChatToolExecutor({ db, tabs: tabService, recipes: recipeService })

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
    requireLicense(licenseService)
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
    requireLicense(licenseService)
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

function registerUrlHandlers(): void {
  const feedService = new FeedService()

  ipcMain.handle('url:head', async (_event, url: string) => {
    return fetchUrlHead(url)
  })

  ipcMain.handle('ingest:check-duplicates', async (_event, urls: string[]) => {
    const episodes = db.getEpisodesBySourceUrls(urls)
    return episodes.map((e) => e.source_url)
  })

  ipcMain.handle('feed:fetch-metadata', async (_event, url: string) => {
    return feedService.fetchFeed(url)
  })
}

function registerExportHandlers(): void {
  ipcMain.handle('export:copy-tab', async (_event, markdown: string) => {
    const { marked } = await import('marked')
    const html = await marked(markdown)
    clipboard.write({ text: markdown, html })
  })

  ipcMain.handle('export:copy-transcript', async (_event, episodeId: string, withTimestamps: boolean) => {
    const { formatTranscript } = await import('../shared/transcript-formatter')
    const { marked } = await import('marked')
    const episode = db.getEpisode(episodeId)
    if (!episode || !episode.transcript) return

    let segments: { start: number; end: number; text: string }[]
    try {
      segments = JSON.parse(episode.transcript)
    } catch {
      return
    }

    const text = formatTranscript(segments, {
      timestamps: withTimestamps,
      durationSec: episode.duration_sec ?? 0,
    })
    const html = await marked(text)
    clipboard.write({ text, html })
  })

  ipcMain.handle('export:save-tab', async (_event, content: string, episodeTitle: string, tabName: string) => {
    const { buildTabFilename } = await import('../shared/export-assembler')
    const { writeFile } = await import('fs/promises')
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return

    const suggestedFilename = buildTabFilename(episodeTitle, tabName)
    const result = await dialog.showSaveDialog(win, {
      defaultPath: suggestedFilename,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })

    if (result.canceled || !result.filePath) return
    await writeFile(result.filePath, content, 'utf-8')
  })

  ipcMain.handle('export:save-episode', async (_event, episodeId: string) => {
    const { assembleEpisode } = await import('../shared/export-assembler')
    const { formatTranscript } = await import('../shared/transcript-formatter')
    const { writeFile } = await import('fs/promises')
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return

    const episode = db.getEpisode(episodeId)
    if (!episode) return

    const tabs = tabService.getTabs(episodeId)

    let transcript = ''
    if (episode.transcript) {
      try {
        const segments = JSON.parse(episode.transcript)
        transcript = formatTranscript(segments, {
          timestamps: true,
          durationSec: episode.duration_sec ?? 0,
        })
      } catch {
        // skip transcript if unparseable
      }
    }

    const { content, suggestedFilename } = assembleEpisode({
      title: episode.title || 'Untitled',
      sourceUrl: episode.source_url ?? null,
      durationSec: episode.duration_sec ?? 0,
      createdAt: episode.created_at,
      tabs: tabs.map((t) => ({ name: t.tab_name, content: t.content })),
      transcript,
    })

    const result = await dialog.showSaveDialog(win, {
      defaultPath: suggestedFilename,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })

    if (result.canceled || !result.filePath) return
    await writeFile(result.filePath, content, 'utf-8')
  })

  ipcMain.handle('export:save-episodes', async (_event, episodeIds: string[]) => {
    const { assembleEpisode } = await import('../shared/export-assembler')
    const { formatTranscript } = await import('../shared/transcript-formatter')
    const { writeFile } = await import('fs/promises')
    const { join: joinPath } = await import('path')
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return false

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Export episodes to folder',
    })

    if (result.canceled || !result.filePaths[0]) return false
    const dir = result.filePaths[0]

    for (const episodeId of episodeIds) {
      const episode = db.getEpisode(episodeId)
      if (!episode) continue

      const tabs = tabService.getTabs(episodeId)

      let transcript = ''
      if (episode.transcript) {
        try {
          const segments = JSON.parse(episode.transcript)
          transcript = formatTranscript(segments, {
            timestamps: true,
            durationSec: episode.duration_sec ?? 0,
          })
        } catch {
          // skip transcript if unparseable
        }
      }

      const { content, suggestedFilename } = assembleEpisode({
        title: episode.title || 'Untitled',
        sourceUrl: episode.source_url ?? null,
        durationSec: episode.duration_sec ?? 0,
        createdAt: episode.created_at,
        tabs: tabs.map((t) => ({ name: t.tab_name, content: t.content })),
        transcript,
      })

      await writeFile(joinPath(dir, suggestedFilename), content, 'utf-8')
    }
    return true
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
    icon: app.isPackaged
      ? join(process.resourcesPath, 'icon.icns')
      : join(__dirname, '../../build/icon.icns'),
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

  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock.setIcon(join(__dirname, '../../build/icon.png'))
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  db = new DatabaseService()
  recipeService = new RecipeService(db)
  tabService = new TabService(db)
  new MigrationService(db, recipeService, tabService).run()

  // Apply saved appearance before window creation to avoid theme flash
  const savedAppearance = db.getSetting('appearance') as 'system' | 'light' | 'dark' | null
  nativeTheme.themeSource = savedAppearance || 'system'
  chatService = new ChatService(db)
  ytdlpService = new YtdlpService(db)

  const polarBaseUrl = process.env.POLAR_SANDBOX
    ? 'https://sandbox-api.polar.sh'
    : 'https://api.polar.sh'
  const polarOrgId = process.env.POLAR_SANDBOX
    ? (process.env.POLAR_SANDBOX_ORG_ID ?? '')
    : '35976264-5788-49be-8f65-1e7cf950c958'
  const polar = new PolarClient({ baseUrl: polarBaseUrl, organizationId: polarOrgId })

  let machineId = 'unknown'
  try {
    machineId = machineIdSync()
  } catch {
    // machineIdSync can fail with EPIPE in some environments
  }

  licenseService = new LicenseService({
    db,
    polar,
    clock: () => Date.now(),
    machineId,
    officialBuild: typeof __OFFICIAL_BUILD__ !== 'undefined' ? __OFFICIAL_BUILD__ : false,
  })

  registerDatabaseHandlers()
  registerChatHandlers()
  registerRecipeHandlers()
  registerTabHandlers()
  registerExportHandlers()
  registerYtdlpHandlers()
  registerUrlHandlers()
  registerLicenseHandlers()

  updateService = new UpdateService(db)
  updateService.registerIPC()
  updateService.init()

  const modelManager = new ModelManager()
  let lastProgressSent = 0
  modelManager.on('progress', (percent) => {
    const now = Date.now()
    // Throttle: send at most every 500ms, or on 100%
    if (now - lastProgressSent < 500 && percent < 100) return
    lastProgressSent = now
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('model-download-progress', percent)
      }
    }
  })
  modelManager.on('status-changed', (status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('model:status-changed', status)
      }
    }
  })

  // Model IPC handlers
  ipcMain.handle('model:get-status', async () => {
    return modelManager.getStatusWithSize()
  })
  ipcMain.handle('model:delete', async () => {
    return modelManager.delete()
  })
  ipcMain.handle('model:download', () => {
    modelManager.download()
  })

  // Initialize model state and trigger eager download on first launch
  modelManager.init().then(() => {
    const status = modelManager.getStatus()
    if (status.state === 'not-downloaded') {
      modelManager.download()
    }
  })

  ingestPipeline = new IngestPipeline(db, modelManager, recipeService, tabService, ytdlpService)
  ingestPipeline.setLicenseService(licenseService)
  ingestPipeline.recoverOrphanedEpisodes()
  ingestPipeline.registerIPC()

  registerTranscriptionService(modelManager)

  licenseService.init().catch(() => {})

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
