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
  }
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
