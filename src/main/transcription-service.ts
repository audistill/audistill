import { BrowserWindow, dialog, ipcMain } from 'electron'
import { Worker } from 'node:worker_threads'
import { join } from 'node:path'
import { preprocess } from './audio-preprocessor'
import { ModelManager } from './model-manager'
import { SUPPORTED_FILE_FILTER } from '../shared/supported-formats'

export function registerTranscriptionService(modelManager: ModelManager): void {
  ipcMain.handle('select-file', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [SUPPORTED_FILE_FILTER]
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.on('start-transcription', async (event, filePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    try {
      const modelPath = await modelManager.ensureModel()
      const pcmBuffer = await preprocess(filePath)

      const sharedBuffer = new SharedArrayBuffer(pcmBuffer.byteLength)
      const shared = new Float32Array(sharedBuffer)
      shared.set(new Float32Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.byteLength / 4))

      const workerPath = join(__dirname, 'transcription-worker.js')
      const worker = new Worker(workerPath)

      worker.on('message', (msg: { type: string; percent?: number; start?: number; end?: number; text?: string; message?: string }) => {
        if (win.isDestroyed()) return

        switch (msg.type) {
          case 'progress':
            win.webContents.send('transcription-progress', msg.percent)
            break
          case 'segment':
            win.webContents.send('transcription-segment', {
              start: msg.start,
              end: msg.end,
              text: msg.text
            })
            break
          case 'done':
            win.webContents.send('transcription-complete')
            worker.terminate()
            break
          case 'error':
            win.webContents.send('transcription-error', msg.message)
            worker.terminate()
            break
        }
      })

      worker.on('error', (err) => {
        if (!win.isDestroyed()) {
          win.webContents.send('transcription-error', err.message)
        }
      })

      worker.postMessage({
        type: 'start',
        audioBuffer: sharedBuffer,
        modelPath
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!win.isDestroyed()) {
        win.webContents.send('transcription-error', message)
      }
    }
  })
}
