import type { TabExportRequest } from '../../shared/tab-export'

declare global {
  interface Window {
    tabPrint: {
      onDocument: (callback: (document: TabExportRequest) => void) => () => void
      ready: () => void
      failed: (error: string) => void
    }
  }
}

export {}
