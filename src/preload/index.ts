import { contextBridge, ipcRenderer } from 'electron'
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

  // Episode updated event from main process
  onEpisodeUpdated: (callback: (episode: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, episode: unknown): void => callback(episode)
    ipcRenderer.on('episode-updated', handler)
    return () => ipcRenderer.removeListener('episode-updated', handler)
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
