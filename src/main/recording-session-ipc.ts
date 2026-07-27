import { BrowserWindow, ipcMain, shell } from 'electron'
import type { RecordingSessionCoordinator } from './recording-session-coordinator'
import type { RecordingSourceKind, StartRecordingSessionInput } from '../shared/recording-session'

export function registerRecordingSessionIPC(
  coordinator: RecordingSessionCoordinator | null,
  options: { assertCanStart?: () => void | Promise<void> } = {},
): void {
  const requireCoordinator = (): RecordingSessionCoordinator => {
    if (!coordinator) throw new Error('Recording Sessions are not available in this build')
    return coordinator
  }
  const broadcast = (): void => {
    if (!coordinator) return
    const state = coordinator.getState()
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('recording-session:state-changed', state)
    }
  }

  coordinator?.onStateChanged(broadcast)

  ipcMain.handle('recording-session:is-available', () => coordinator !== null)
  ipcMain.handle('recording-session:get-state', () => requireCoordinator().getState())
  ipcMain.handle('recording-session:recover', async () => {
    const result = await requireCoordinator().recover()
    broadcast()
    return result
  })
  ipcMain.handle('recording-session:discard-recovery', async () => {
    const state = await requireCoordinator().discardRecovery()
    broadcast()
    return state
  })
  ipcMain.handle('recording-session:open', async () => {
    const state = await requireCoordinator().open()
    broadcast()
    return state
  })
  ipcMain.handle('recording-session:refresh-sources', () => requireCoordinator().refreshSources())
  ipcMain.handle('recording-session:request-permission', async (_event, kind: RecordingSourceKind) => {
    const state = await requireCoordinator().requestPermission(kind)
    broadcast()
    return state
  })
  ipcMain.handle('recording-session:open-settings', (_event, kind: RecordingSourceKind) => {
    if (kind !== 'microphone' && kind !== 'system-audio') throw new Error('Unsupported recording source')
    const pane = kind === 'microphone' ? 'Privacy_Microphone' : 'Privacy_ScreenCapture'
    return shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`)
  })
  ipcMain.handle('recording-session:select-microphone', async (_event, sourceId: string) => {
    const state = await requireCoordinator().selectMicrophone(sourceId)
    broadcast()
    return state
  })

  ipcMain.handle('recording-session:start', async (_event, input: StartRecordingSessionInput) => {
    await options.assertCanStart?.()
    const state = await requireCoordinator().start(input)
    broadcast()
    return state
  })
  ipcMain.handle('recording-session:pause', async () => {
    const state = await requireCoordinator().pause()
    broadcast()
    return state
  })
  ipcMain.handle('recording-session:resume', async () => {
    const state = await requireCoordinator().resume()
    broadcast()
    return state
  })
  ipcMain.handle('recording-session:cancel', async () => {
    const state = await requireCoordinator().cancel()
    broadcast()
    return state
  })
  ipcMain.handle('recording-session:stop', async () => {
    const result = await requireCoordinator().stop()
    broadcast()
    return result
  })
}
