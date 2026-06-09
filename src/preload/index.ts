import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  selectFile: (): Promise<string | null> => ipcRenderer.invoke('select-file'),
  startTranscription: (filePath: string): void => {
    ipcRenderer.send('start-transcription', filePath)
  },
  onTranscriptionProgress: (callback: (percent: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, percent: number): void => callback(percent)
    ipcRenderer.on('transcription-progress', handler)
    return () => ipcRenderer.removeListener('transcription-progress', handler)
  },
  onTranscriptionSegment: (callback: (segment: { start: number; end: number; text: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, segment: { start: number; end: number; text: string }): void => callback(segment)
    ipcRenderer.on('transcription-segment', handler)
    return () => ipcRenderer.removeListener('transcription-segment', handler)
  },
  onTranscriptionComplete: (callback: () => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('transcription-complete', handler)
    return () => ipcRenderer.removeListener('transcription-complete', handler)
  },
  onTranscriptionError: (callback: (message: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string): void => callback(message)
    ipcRenderer.on('transcription-error', handler)
    return () => ipcRenderer.removeListener('transcription-error', handler)
  },
  onModelDownloadProgress: (callback: (percent: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, percent: number): void => callback(percent)
    ipcRenderer.on('model-download-progress', handler)
    return () => ipcRenderer.removeListener('model-download-progress', handler)
  },

  // Database API
  getEpisodes: (folderId?: string | null) => ipcRenderer.invoke('db:get-episodes', folderId),
  getEpisode: (id: string) => ipcRenderer.invoke('db:get-episode', id),
  getFolders: () => ipcRenderer.invoke('db:get-folders'),
  getOpenTabs: () => ipcRenderer.invoke('db:get-open-tabs'),
  saveOpenTabs: (tabs: { episode_id: string; position: number; is_preview: boolean }[]) =>
    ipcRenderer.invoke('db:save-open-tabs', tabs),
  getSetting: (key: string) => ipcRenderer.invoke('db:get-setting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('db:set-setting', key, value),
  searchEpisodes: (query: string) => ipcRenderer.invoke('db:search-episodes', query),
  createFolder: (name: string, parentId?: string | null): Promise<string> =>
    ipcRenderer.invoke('db:create-folder', name, parentId),
  renameFolder: (id: string, name: string): Promise<void> =>
    ipcRenderer.invoke('db:rename-folder', id, name),
  deleteFolder: (id: string): Promise<void> => ipcRenderer.invoke('db:delete-folder', id),
  renameEpisode: (id: string, title: string): Promise<void> =>
    ipcRenderer.invoke('db:rename-episode', id, title),
  moveEpisode: (id: string, folderId: string | null): Promise<void> =>
    ipcRenderer.invoke('db:move-episode', id, folderId),
  deleteEpisode: (id: string): Promise<void> => ipcRenderer.invoke('db:delete-episode', id),
  validateApiKey: (key: string): Promise<boolean> => ipcRenderer.invoke('validate-api-key', key),

  // File utilities
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  // Ingest pipeline
  selectFiles: (): Promise<string[] | null> => ipcRenderer.invoke('ingest:select-files'),
  addFiles: (filePaths: string[]): Promise<string[]> => ipcRenderer.invoke('ingest:add-files', filePaths),
  retryEpisode: (id: string): Promise<void> => ipcRenderer.invoke('ingest:retry', id),
  cancelEpisode: (id: string): Promise<void> => ipcRenderer.invoke('ingest:cancel', id),

  // Tab streaming events
  tabsExecuteRecipe: (episodeId: string, tabId: string) => ipcRenderer.invoke('tabs:execute-recipe', episodeId, tabId),

  onTabStreamStart: (callback: (data: { episodeId: string; tabId: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { episodeId: string; tabId: string }): void => callback(data)
    ipcRenderer.on('tab:stream-start', handler)
    return () => ipcRenderer.removeListener('tab:stream-start', handler)
  },
  onTabStreamToken: (callback: (data: { episodeId: string; tabId: string; token: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { episodeId: string; tabId: string; token: string }): void => callback(data)
    ipcRenderer.on('tab:stream-token', handler)
    return () => ipcRenderer.removeListener('tab:stream-token', handler)
  },
  onTabStreamEnd: (callback: (data: { episodeId: string; tabId: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { episodeId: string; tabId: string }): void => callback(data)
    ipcRenderer.on('tab:stream-end', handler)
    return () => ipcRenderer.removeListener('tab:stream-end', handler)
  },
  onTabStreamError: (callback: (data: { episodeId: string; tabId: string; error: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { episodeId: string; tabId: string; error: string }): void => callback(data)
    ipcRenderer.on('tab:stream-error', handler)
    return () => ipcRenderer.removeListener('tab:stream-error', handler)
  },

  // Canvas API
  canvasGetContent: (episodeId: string): Promise<string> => ipcRenderer.invoke('canvas:get-content', episodeId),
  canvasSaveContent: (episodeId: string, content: string): Promise<void> => ipcRenderer.invoke('canvas:save-content', episodeId, content),
  onCanvasStreamWrite: (callback: (data: { episodeId: string; content: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { episodeId: string; content: string }): void => callback(data)
    ipcRenderer.on('canvas:stream-write', handler)
    return () => ipcRenderer.removeListener('canvas:stream-write', handler)
  },
  onCanvasStreamDelta: (callback: (data: { content: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { content: string }): void => callback(data)
    ipcRenderer.on('canvas:stream-delta', handler)
    return () => ipcRenderer.removeListener('canvas:stream-delta', handler)
  },
  onCanvasStreamStart: (callback: () => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('canvas:stream-start', handler)
    return () => ipcRenderer.removeListener('canvas:stream-start', handler)
  },
  onCanvasEdit: (callback: (data: { episodeId: string; content: string; oldText: string; newText: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { episodeId: string; content: string; oldText: string; newText: string }): void => callback(data)
    ipcRenderer.on('canvas:edit', handler)
    return () => ipcRenderer.removeListener('canvas:edit', handler)
  },
  onCanvasNavigate: (callback: (data: { view: 'episode' | 'canvas' }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { view: 'episode' | 'canvas' }): void => callback(data)
    ipcRenderer.on('canvas:navigate', handler)
    return () => ipcRenderer.removeListener('canvas:navigate', handler)
  },

  // Recipes API
  recipesGetAll: () => ipcRenderer.invoke('recipe:get-all'),
  recipesGet: (id: string) => ipcRenderer.invoke('recipe:get', id),
  recipesCreate: (data: { name: string; prompt: string; model_override?: string }) =>
    ipcRenderer.invoke('recipe:create', data),
  recipesUpdate: (id: string, fields: { name?: string; prompt?: string; model_override?: string | null }) =>
    ipcRenderer.invoke('recipe:update', id, fields),
  recipesDelete: (id: string) => ipcRenderer.invoke('recipe:delete', id),
  recipesGetPipeline: () => ipcRenderer.invoke('recipe:get-pipeline'),

  // Tabs API
  tabsGet: (episodeId: string) => ipcRenderer.invoke('tabs:get', episodeId),
  tabsCreate: (episodeId: string, options: { recipe_id?: string | null; tab_name?: string; is_pipeline?: boolean; content?: string }) =>
    ipcRenderer.invoke('tabs:create', episodeId, options),
  tabsUpdateContent: (tabId: string, content: string) => ipcRenderer.invoke('tabs:update-content', tabId, content),
  tabsDelete: (tabId: string) => ipcRenderer.invoke('tabs:delete', tabId),
  tabsRename: (tabId: string, name: string) => ipcRenderer.invoke('tabs:rename', tabId, name),
  tabsReorder: (episodeId: string, tabIds: string[]) => ipcRenderer.invoke('tabs:reorder', episodeId, tabIds),

  // Chat API
  chatGetMessages: (episodeId: string) => ipcRenderer.invoke('chat:get-messages', episodeId),
  chatSaveMessage: (episodeId: string, role: string, content: string, toolCalls?: string | null) =>
    ipcRenderer.invoke('chat:save-message', episodeId, role, content, toolCalls),
  chatClearMessages: (episodeId: string) => ipcRenderer.invoke('chat:clear-messages', episodeId),
  chatSendMessage: (request: unknown) => ipcRenderer.invoke('chat:send-message', request),
  chatAbort: () => ipcRenderer.invoke('chat:abort'),
  chatFetchModels: (): Promise<{ id: string; name: string }[]> => ipcRenderer.invoke('chat:fetch-models'),
  onChatStreamToken: (callback: (token: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string): void => callback(token)
    ipcRenderer.on('chat:stream-token', handler)
    return () => ipcRenderer.removeListener('chat:stream-token', handler)
  },
  onChatStreamEnd: (callback: (data: { content: string; aborted: boolean }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { content: string; aborted: boolean }): void => callback(data)
    ipcRenderer.on('chat:stream-end', handler)
    return () => ipcRenderer.removeListener('chat:stream-end', handler)
  },
  onChatError: (callback: (message: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string): void => callback(message)
    ipcRenderer.on('chat:error', handler)
    return () => ipcRenderer.removeListener('chat:error', handler)
  },
  onChatToolCallStart: (callback: (data: { id: string; name: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; name: string }): void => callback(data)
    ipcRenderer.on('chat:tool-call-start', handler)
    return () => ipcRenderer.removeListener('chat:tool-call-start', handler)
  },
  onChatToolCallResult: (callback: (data: { id: string; name: string; result: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; name: string; result: string }): void => callback(data)
    ipcRenderer.on('chat:tool-call-result', handler)
    return () => ipcRenderer.removeListener('chat:tool-call-result', handler)
  },

  // Episode updated event from main process
  onEpisodeUpdated: (callback: (episode: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, episode: unknown): void => callback(episode)
    ipcRenderer.on('episode-updated', handler)
    return () => ipcRenderer.removeListener('episode-updated', handler)
  },

  // Ingest progress event
  onIngestProgress: (callback: (data: { episodeId: string; stage: string; percent: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { episodeId: string; stage: string; percent: number }): void => callback(data)
    ipcRenderer.on('ingest-progress', handler)
    return () => ipcRenderer.removeListener('ingest-progress', handler)
  },
}

export type Api = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
