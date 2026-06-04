import { ElectronAPI } from '@electron-toolkit/preload'

export interface DbEpisode {
  id: string
  title: string | null
  file_path: string
  folder_id: string | null
  duration_sec: number | null
  transcript: string | null
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

export interface DbEpisodeSummary {
  id: string
  episode_id: string
  view_type: 'brief' | 'detailed' | 'full'
  content: string
  status: 'generating' | 'complete' | 'error'
  error_message: string | null
  created_at: string
}

export interface SummaryUpdatedPayload {
  episodeId: string
  viewType: string
  status: string
  content?: string
  errorMessage?: string
}

export interface DbChatMessage {
  id: string
  episode_id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_calls: string | null
  created_at: string
}

interface AudistillApi {
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
  renameEpisode: (id: string, title: string) => Promise<void>
  moveEpisode: (id: string, folderId: string | null) => Promise<void>
  deleteEpisode: (id: string) => Promise<void>
  createFolder: (name: string, parentId?: string | null) => Promise<string>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  validateApiKey: (key: string) => Promise<boolean>

  // Canvas API
  canvasGetContent: (episodeId: string) => Promise<string>
  canvasSaveContent: (episodeId: string, content: string) => Promise<void>

  // Summary API
  getSummaries: (episodeId: string) => Promise<DbEpisodeSummary[]>
  generateSummary: (episodeId: string, viewType: string) => Promise<void>
  regenerateSummary: (episodeId: string, viewType: string) => Promise<void>
  onSummaryUpdated: (callback: (data: SummaryUpdatedPayload) => void) => () => void

  // Chat API
  chatGetMessages: (episodeId: string) => Promise<DbChatMessage[]>
  chatSaveMessage: (episodeId: string, role: string, content: string, toolCalls?: string | null) => Promise<string>
  chatClearMessages: (episodeId: string) => Promise<void>
  chatSendMessage: (request: unknown) => Promise<unknown>
  chatAbort: () => Promise<void>
  chatFetchModels: () => Promise<{ id: string; name: string }[]>
  onChatStreamToken: (callback: (token: string) => void) => () => void
  onChatStreamEnd: (callback: (data: { content: string; aborted: boolean }) => void) => () => void
  onChatError: (callback: (message: string) => void) => () => void
  onChatToolCallStart: (callback: (data: { id: string; name: string }) => void) => () => void
  onChatToolCallResult: (callback: (data: { id: string; name: string; result: string }) => void) => () => void

  // File utilities
  getPathForFile: (file: File) => string

  // Ingest pipeline
  selectFiles: () => Promise<string[] | null>
  addFiles: (filePaths: string[]) => Promise<string[]>
  retryEpisode: (id: string) => Promise<void>
  cancelEpisode: (id: string) => Promise<void>

  onEpisodeUpdated: (callback: (episode: DbEpisode) => void) => () => void
  onIngestProgress: (callback: (data: { episodeId: string; stage: string; percent: number }) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AudistillApi
  }
}
