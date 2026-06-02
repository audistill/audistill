import { ElectronAPI } from '@electron-toolkit/preload'

export interface DbEpisode {
  id: string
  title: string | null
  file_path: string
  folder_id: string | null
  duration_sec: number | null
  transcript: string | null
  summary: string | null
  status: string
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface DbFolder {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
}

export interface DbOpenTab {
  id: string
  episode_id: string
  position: number
  is_preview: number
}

interface PodCaptureApi {
  selectFile: () => Promise<string | null>
  startTranscription: (filePath: string) => void
  onTranscriptionProgress: (callback: (percent: number) => void) => () => void
  onTranscriptionSegment: (callback: (segment: { start: number; end: number; text: string }) => void) => () => void
  onTranscriptionComplete: (callback: () => void) => () => void
  onTranscriptionError: (callback: (message: string) => void) => () => void
  onModelDownloadProgress: (callback: (percent: number) => void) => () => void

  // Database API
  getEpisodes: (folderId?: string | null) => Promise<DbEpisode[]>
  getEpisode: (id: string) => Promise<DbEpisode | undefined>
  getFolders: () => Promise<DbFolder[]>
  getOpenTabs: () => Promise<DbOpenTab[]>
  saveOpenTabs: (tabs: { episode_id: string; position: number; is_preview: boolean }[]) => Promise<void>
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
  searchEpisodes: (query: string) => Promise<DbEpisode[]>
  validateApiKey: (key: string) => Promise<boolean>

  // Ingest pipeline
  selectFiles: () => Promise<string[] | null>
  addFiles: (filePaths: string[]) => Promise<string[]>
  retryEpisode: (id: string) => Promise<void>

  onEpisodeUpdated: (callback: (episode: DbEpisode) => void) => () => void
  onIngestProgress: (callback: (data: { episodeId: string; stage: string; percent: number }) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PodCaptureApi
  }
}
