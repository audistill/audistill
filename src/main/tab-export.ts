import { buildTabFilename } from '../shared/export-assembler'
import type { TabExportRequest, TabExportResult } from '../shared/tab-export'

export interface TabExportDialogOptions {
  defaultPath: string
  filters: { name: string; extensions: string[] }[]
}

export interface TabExportAdapters {
  showSaveDialog: (
    options: TabExportDialogOptions
  ) => Promise<{ canceled: boolean; filePath?: string }>
  writeFile: (path: string, content: string | Uint8Array, encoding?: 'utf-8') => Promise<void>
  createPrintSurface?: () => TabPrintSurface
}

export interface TabPrintSurface {
  render: (request: TabExportRequest) => Promise<void>
  printToPDF: (options: Electron.PrintToPDFOptions) => Promise<Uint8Array>
  destroy: () => void
}

export const TAB_PDF_OPTIONS: Electron.PrintToPDFOptions = {
  pageSize: 'A4',
  landscape: false,
  printBackground: true,
  displayHeaderFooter: true,
  margins: { marginType: 'custom', top: 0.71, bottom: 0.71, left: 0.71, right: 0.71 },
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;font-size:9px;color:#7a7870;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
}

let tabExportActive = false

export async function exportTab(
  request: TabExportRequest,
  adapters: TabExportAdapters
): Promise<TabExportResult> {
  if (tabExportActive) throw new Error('Another Tab export is already in progress')
  tabExportActive = true
  try {
    return await performTabExport(request, adapters)
  } finally {
    tabExportActive = false
  }
}

async function performTabExport(
  request: TabExportRequest,
  adapters: TabExportAdapters
): Promise<TabExportResult> {
  const result = await adapters.showSaveDialog({
    defaultPath: buildTabFilename(
      request.episodeTitle,
      request.tabName,
      request.format === 'pdf' ? 'pdf' : 'md'
    ),
    filters: request.format === 'pdf'
      ? [{ name: 'PDF', extensions: ['pdf'] }]
      : [{ name: 'Markdown', extensions: ['md'] }],
  })

  if (result.canceled || !result.filePath) return { status: 'cancelled' }

  if (request.format === 'markdown') {
    await adapters.writeFile(result.filePath, request.content, 'utf-8')
    return { status: 'saved' }
  }

  if (!adapters.createPrintSurface) throw new Error('PDF print surface is unavailable')
  const surface = adapters.createPrintSurface()
  try {
    await surface.render(request)
    const pdf = await surface.printToPDF(TAB_PDF_OPTIONS)
    await adapters.writeFile(result.filePath, pdf)
  } finally {
    surface.destroy()
  }
  return { status: 'saved' }
}
