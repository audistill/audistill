import { describe, expect, it, vi } from 'vitest'
import { exportTab } from './tab-export'

describe('exportTab', () => {
  it('saves the exact current Markdown with the existing suggested filename', async () => {
    const showSaveDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePath: '/chosen/custom-name.md',
    })
    const writeFile = vi.fn().mockResolvedValue(undefined)

    const result = await exportTab(
      {
        format: 'markdown',
        content: '# Current edit\n\nStill inside the debounce.',
        episodeTitle: 'Episode #1: The Beginning',
        tabName: 'Full Notes',
      },
      { showSaveDialog, writeFile }
    )

    expect(result).toEqual({ status: 'saved' })
    expect(showSaveDialog).toHaveBeenCalledWith({
      defaultPath: 'episode-1-the-beginning--full-notes.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    expect(writeFile).toHaveBeenCalledWith(
      '/chosen/custom-name.md',
      '# Current edit\n\nStill inside the debounce.',
      'utf-8'
    )
  })

  it('returns cancellation without writing a file', async () => {
    const showSaveDialog = vi.fn().mockResolvedValue({ canceled: true })
    const writeFile = vi.fn().mockResolvedValue(undefined)

    const result = await exportTab(
      {
        format: 'markdown',
        content: 'Unwritten content',
        episodeTitle: 'Episode',
        tabName: 'Brief',
      },
      { showSaveDialog, writeFile }
    )

    expect(result).toEqual({ status: 'cancelled' })
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('waits for a PDF print surface, writes its buffer, and always destroys it', async () => {
    const order: string[] = []
    const showSaveDialog = vi.fn().mockImplementation(async () => {
      order.push('dialog')
      return { canceled: false, filePath: '/chosen/notes.pdf' }
    })
    const surface = {
      render: vi.fn().mockImplementation(async () => order.push('ready')),
      printToPDF: vi.fn().mockImplementation(async () => {
        order.push('print')
        return Buffer.from('%PDF fixture')
      }),
      destroy: vi.fn().mockImplementation(() => order.push('destroy')),
    }
    const createPrintSurface = vi.fn().mockImplementation(() => {
      order.push('create')
      return surface
    })
    const writeFile = vi.fn().mockImplementation(async () => order.push('write'))

    const request = {
      format: 'pdf' as const,
      content: '# Current renderer content',
      episodeTitle: 'Episode #1',
      tabName: 'Full Notes',
    }
    const result = await exportTab(request, { showSaveDialog, writeFile, createPrintSurface })

    expect(result).toEqual({ status: 'saved' })
    expect(showSaveDialog).toHaveBeenCalledWith({
      defaultPath: 'episode-1--full-notes.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    expect(surface.render).toHaveBeenCalledWith(request)
    expect(surface.printToPDF).toHaveBeenCalledWith(expect.objectContaining({
      pageSize: 'A4',
      landscape: false,
      printBackground: true,
      displayHeaderFooter: true,
      margins: { marginType: 'custom', top: 0.71, bottom: 0.71, left: 0.71, right: 0.71 },
    }))
    expect(writeFile).toHaveBeenCalledWith('/chosen/notes.pdf', Buffer.from('%PDF fixture'))
    expect(order).toEqual(['dialog', 'create', 'ready', 'print', 'write', 'destroy'])
  })

  it('cancels PDF export before creating a print surface', async () => {
    const createPrintSurface = vi.fn()
    const writeFile = vi.fn()

    const result = await exportTab(
      { format: 'pdf', content: 'Content', episodeTitle: 'Episode', tabName: 'Brief' },
      {
        showSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
        writeFile,
        createPrintSurface,
      }
    )

    expect(result).toEqual({ status: 'cancelled' })
    expect(createPrintSurface).not.toHaveBeenCalled()
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('rejects a competing Tab export while one is active', async () => {
    let finishDialog!: (value: { canceled: boolean }) => void
    const firstExport = exportTab(
      { format: 'markdown', content: 'First', episodeTitle: 'Episode', tabName: 'First' },
      {
        showSaveDialog: () => new Promise((resolve) => { finishDialog = resolve }),
        writeFile: vi.fn(),
      }
    )

    await expect(exportTab(
      { format: 'pdf', content: 'Second', episodeTitle: 'Episode', tabName: 'Second' },
      { showSaveDialog: vi.fn(), writeFile: vi.fn() }
    )).rejects.toThrow('Another Tab export is already in progress')

    finishDialog({ canceled: true })
    await expect(firstExport).resolves.toEqual({ status: 'cancelled' })
  })

  it.each(['render', 'printToPDF', 'writeFile'] as const)(
    'propagates a %s failure and destroys the print surface',
    async (failurePoint) => {
      const failure = new Error(`${failurePoint} failed`)
      const surface = {
        render: vi.fn().mockResolvedValue(undefined),
        printToPDF: vi.fn().mockResolvedValue(Buffer.from('%PDF fixture')),
        destroy: vi.fn(),
      }
      const writeFile = vi.fn().mockResolvedValue(undefined)
      if (failurePoint === 'render') surface.render.mockRejectedValueOnce(failure)
      if (failurePoint === 'printToPDF') surface.printToPDF.mockRejectedValueOnce(failure)
      if (failurePoint === 'writeFile') writeFile.mockRejectedValueOnce(failure)

      await expect(exportTab(
        { format: 'pdf', content: 'Content', episodeTitle: 'Episode', tabName: 'Brief' },
        {
          showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/chosen/brief.pdf' }),
          writeFile,
          createPrintSurface: () => surface,
        }
      )).rejects.toBe(failure)

      expect(surface.destroy).toHaveBeenCalledOnce()
    }
  )
})
