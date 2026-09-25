import { contextBridge, ipcRenderer } from 'electron'
import type { TabExportRequest } from '../shared/tab-export'

const jobArgument = process.argv.find((argument) => argument.startsWith('--tab-print-job='))
const jobId = jobArgument?.slice('--tab-print-job='.length)

if (!jobId) throw new Error('Missing Tab print job identifier')

contextBridge.exposeInMainWorld('tabPrint', {
  onDocument(callback: (document: TabExportRequest) => void): () => void {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { jobId: string; document: TabExportRequest }
    ): void => {
      if (payload.jobId === jobId) callback(payload.document)
    }
    ipcRenderer.once('tab-print:document', handler)
    ipcRenderer.send('tab-print:loaded', { jobId })
    return () => ipcRenderer.removeListener('tab-print:document', handler)
  },
  ready(): void {
    ipcRenderer.send('tab-print:ready', { jobId })
  },
  failed(error: string): void {
    ipcRenderer.send('tab-print:failed', { jobId, error })
  },
})
