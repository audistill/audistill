export type TabExportFormat = 'markdown' | 'pdf'

export interface TabExportRequest {
  format: TabExportFormat
  content: string
  episodeTitle: string
  tabName: string
}

export type TabExportResult = { status: 'saved' } | { status: 'cancelled' }
